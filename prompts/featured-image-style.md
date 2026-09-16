# 대표 이미지 공통 시각 스타일

블로그 대표 이미지가 같은 결을 유지하도록 **모든 이미지 프롬프트 앞에 붙는 조각**이다.
`FeaturedImageService` 가 이 파일을 읽어 아래 코드 블록의 내용만 꺼내 쓴다.

바깥의 이 설명은 모델에게 전달되지 않는다. 스타일을 바꾸려면 **코드 블록 안**을 고친다.

글마다 달라지는 장면 묘사는 여기 적지 않는다. 그건 도구를 부를 때 `prompt` 로 넘긴다.

```text
Isometric 3D technical illustration for a developer blog article header.

Style:
- Isometric projection, flat shaded surfaces with soft gradients. Not photographic.
- Background: deep navy fading into dark purple, with faint grid lines.
- Accents: neon cyan, mint green and violet, with a soft outer glow.
- One clear focal point at the center. Supporting elements sink into the background.
- Flowing light lines connect elements to show how data moves between them.
- Clean vector-like finish. No texture, no noise, no film grain, no watermark.
- Wide cinematic composition with generous empty space around the focal point.

Text rules:
- Keep any text in the image extremely short. Single English words or short commands only.
- Never render Korean text, sentences or paragraphs.
- Prefer monospace lettering for anything that looks like code or a filename.

Avoid:
- Human faces and hands.
- Corporate logos and real brand marks.
- Busy layouts where elements are spread evenly with no focus.

Subject:
```
