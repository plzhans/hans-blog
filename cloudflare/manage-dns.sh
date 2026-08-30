#!/usr/bin/env bash
# blog.plzhans.com 관련 DNS 레코드만 관리. plzhans.com zone에는 이 외에도
# _dmarc, SPF, google-site-verification, resume.plzhans.com 등 이 스크립트가
# 손대지 않는 레코드가 다수 있음 - name+type이 일치하는 레코드만 건드림.
#
# 사용법:
#   ./cloudflare/manage-dns.sh                # dns/ 밑 모든 레코드를 적용(idempotent)
#
# 새 레코드 추가: cloudflare/dns/<이름>.json 파일을 새로 만들면 됨.
# 레코드 삭제는 이 스크립트가 자동으로 안 함 - 실수로 남의 레코드를 지우는 사고를
# 막기 위해, 삭제는 record id를 정확히 지정해서 수동으로 curl DELETE 할 것.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ZONE_NAME=$(jq -r '.zone_name' "$SCRIPT_DIR/settings.json")

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

echo "zone 조회 중..."
ZONE_ID=$(api GET "/zones?name=$ZONE_NAME" | jq -r '.result[0].id')
if [ -z "$ZONE_ID" ] || [ "$ZONE_ID" = "null" ]; then
  echo "zone($ZONE_NAME)을 찾지 못했습니다" >&2
  exit 1
fi
echo "zone_id=$ZONE_ID"
echo

for f in "$SCRIPT_DIR"/dns/*.json; do
  [ -e "$f" ] || continue
  name=$(jq -r '.name' "$f")
  type=$(jq -r '.type' "$f")

  existing_id=$(api GET "/zones/$ZONE_ID/dns_records?name=$name&type=$type" | jq -r '.result[0].id // empty')

  if [ -n "$existing_id" ]; then
    echo "- [$type $name] 기존 레코드 업데이트 (id=$existing_id)"
    result=$(api PATCH "/zones/$ZONE_ID/dns_records/$existing_id" "$(cat "$f")")
  else
    echo "- [$type $name] 새 레코드 생성"
    result=$(api POST "/zones/$ZONE_ID/dns_records" "$(cat "$f")")
  fi

  ok=$(echo "$result" | jq -r '.success')
  if [ "$ok" != "true" ]; then
    echo "  실패: $(echo "$result" | jq -c '.errors')" >&2
    exit 1
  fi
  echo "  OK"
done

echo
echo "완료."
