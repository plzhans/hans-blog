#!/usr/bin/env bash
# blog.plzhans.com의 Cache Rules / Transform Rules(응답 헤더)를 관리하는 스크립트.
#
# 이 zone(plzhans.com)은 blog 외에도 여러 서비스(apex 프론트, admin, api, resume 등)가
# 같이 쓰고, Cloudflare는 zone당 phase별로 ruleset이 1개뿐이라 그 ruleset을 여러
# 서비스가 공유함. Terraform의 cloudflare_ruleset 리소스는 rules 전체를 통째로
# 관리해서 다른 서비스가 콘솔로 추가한 규칙까지 지워버리는 문제가 있어(원래는
# terraform/caching, terraform/rules 모듈로 관리했었음), 대신 Cloudflare Rulesets
# API의 "개별 rule 단위" 엔드포인트(POST/PATCH .../rules/{rule_id})로 우리 rule만
# ref 기준으로 정확히 찾아서 건드림. 다른 서비스의 rule은 절대 안 건드림.
#
# 사용법:
#   ./cloudflare/manage-rules.sh              # rules/ 밑 모든 규칙을 적용(idempotent)
#
# 새 규칙 추가: cloudflare/rules/<phase>/<ref>.json 파일을 새로 만들면 됨.
# 기존 규칙 수정: 해당 json 파일 내용을 고치고 재실행하면 됨.
# 규칙 삭제는 이 스크립트가 자동으로 안 함 - 실수로 남의 규칙을 지우는 사고를
# 막기 위해, 삭제는 rule id를 정확히 지정해서 수동으로 curl DELETE 할 것.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ZONE_NAME=$(jq -r '.zone_name' "$SCRIPT_DIR/settings.json")
DOMAIN=$(jq -r '.domain' "$SCRIPT_DIR/settings.json")

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

api() {
  local method="$1" path="$2" data="${3:-}"
  if [ -n "$data" ]; then
    curl -s -X "$method" "https://api.cloudflare.com/client/v4$path" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -X "$method" "https://api.cloudflare.com/client/v4$path" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json"
  fi
}

echo "[$DOMAIN] zone 조회 중..."
ZONE_ID=$(api GET "/zones?name=$ZONE_NAME" | jq -r '.result[0].id')
if [ -z "$ZONE_ID" ] || [ "$ZONE_ID" = "null" ]; then
  echo "zone($ZONE_NAME)을 찾지 못했습니다" >&2
  exit 1
fi
echo "zone_id=$ZONE_ID"

for phase_dir in "$SCRIPT_DIR"/rules/*/; do
  phase=$(basename "$phase_dir")
  rule_files=("$phase_dir"*.json)
  [ -e "${rule_files[0]}" ] || continue

  echo
  echo "=== phase: $phase ==="
  entrypoint=$(api GET "/zones/$ZONE_ID/rulesets/phases/$phase/entrypoint")
  ok=$(echo "$entrypoint" | jq -r '.success')
  if [ "$ok" != "true" ]; then
    echo "entrypoint 조회 실패: $(echo "$entrypoint" | jq -c '.errors')" >&2
    exit 1
  fi
  ruleset_id=$(echo "$entrypoint" | jq -r '.result.id')
  existing_rules=$(echo "$entrypoint" | jq -c '.result.rules')

  for f in "${rule_files[@]}"; do
    ref=$(jq -r '.ref' "$f")
    existing_id=$(echo "$existing_rules" | jq -r --arg ref "$ref" '.[] | select(.ref == $ref) | .id')

    if [ -n "$existing_id" ] && [ "$existing_id" != "null" ]; then
      echo "- [$ref] 기존 규칙 업데이트 (id=$existing_id)"
      result=$(api PATCH "/zones/$ZONE_ID/rulesets/$ruleset_id/rules/$existing_id" "$(cat "$f")")
    else
      echo "- [$ref] 새 규칙 생성"
      result=$(api POST "/zones/$ZONE_ID/rulesets/$ruleset_id/rules" "$(cat "$f")")
    fi

    ok=$(echo "$result" | jq -r '.success')
    if [ "$ok" != "true" ]; then
      echo "  실패: $(echo "$result" | jq -c '.errors')" >&2
      exit 1
    fi
    echo "  OK"
  done
done

echo
echo "완료."
