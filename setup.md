# 설치 가이드

## Hugo 설치

### macOS (Homebrew)

```bash
brew install hugo
```

### Windows

Chocolatey:

```bash
choco install hugo-extended
```

Winget:

```bash
winget install Hugo.Hugo.Extended
```

설치 확인:

```bash
hugo version
```

공식 문서: https://gohugo.io/installation/

## nvm 설치

### macOS / Linux

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

설치 후 셸 재시작:

```bash
source ~/.zshrc
# 또는
source ~/.bashrc
```

### Windows

Windows에서는 [nvm-windows](https://github.com/coreybutler/nvm-windows)를 사용합니다.

[릴리즈 페이지](https://github.com/coreybutler/nvm-windows/releases)에서 설치 파일을 다운로드하여 설치합니다.

설치 확인:

```bash
nvm --version
```

### Node.js 설치

```bash
nvm install    # .nvmrc 기준 v24.13
nvm use
```

참고) 설치된 버전 확인:

```bash
nvm list
```

참고) 버전 삭제:

```bash
nvm uninstall 24.13
```
