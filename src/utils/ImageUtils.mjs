import jpeg from "jpeg-js";

/**
 * 이미지 모델이 가끔 그리는 액자 테두리를 찾아 잘라낸다
 *
 * 대칭 구도를 요청하면 모델이 전체를 감싸는 밝은 테두리를 그려 넣을 때가 있다.
 * 프롬프트로 막으려 해도 계속 나와서 후처리로 걷어낸다. 테두리가 없으면 원본을
 * 그대로 돌려주므로 매번 통과시켜도 부작용이 없다.
 *
 * 네이티브 의존성을 피하려고 순수 JS 디코더를 쓴다. sharp 는 CI 세 곳의
 * npm ci 에 27MB 를 얹는데, 그 워크플로들은 이미지를 다루지 않는다.
 *
 * @param {Buffer} input - 원본 JPEG
 * @param {Object} [options]
 * @param {number} [options.maxInset=40] - 가장자리에서 이만큼까지만 테두리로 본다
 * @param {number} [options.threshold=40] - 배경보다 이만큼 밝으면 테두리로 본다
 * @param {number} [options.pad=2] - 그라데이션 잔광이 남지 않게 더 잘라낼 여유
 * @param {number} [options.quality=95] - 다시 인코딩할 때의 품질
 * @returns {{data: Buffer, cropped: boolean, border: {top:number,bottom:number,left:number,right:number}}}
 */
export function trimGeneratedBorder(input, { maxInset = 40, threshold = 40, pad = 2, quality = 95 } = {}) {
  const { data, width, height } = jpeg.decode(input, { useTArray: true });

  /** RGBA 버퍼에서 (x,y) 의 밝기 */
  const lum = (x, y) => {
    const i = (y * width + x) * 4;
    return (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
  };
  const rowMean = (y) => { let s = 0; for (let x = 0; x < width; x++) s += lum(x, y); return s / width; };
  const colMean = (x) => { let s = 0; for (let y = 0; y < height; y++) s += lum(x, y); return s / height; };

  /** 가장자리부터 안쪽으로 훑어 밝기가 뚝 떨어지는 지점을 테두리 끝으로 본다 */
  const scan = (mean, span) => {
    const limit = Math.min(maxInset, Math.floor(span / 4));
    const values = Array.from({ length: limit }, (_, i) => mean(i));
    const base = Math.min(...values);
    let cut = 0;
    for (const [i, v] of values.entries()) {
      if (v > base + threshold) cut = i + 1;
      else if (cut) break;
    }
    return cut;
  };

  const border = {
    top: scan((i) => rowMean(i), height),
    bottom: scan((i) => rowMean(height - 1 - i), height),
    left: scan((i) => colMean(i), width),
    right: scan((i) => colMean(width - 1 - i), width),
  };

  if (!border.top && !border.bottom && !border.left && !border.right) {
    return { data: input, cropped: false, border };
  }

  const x0 = border.left + pad;
  const y0 = border.top + pad;
  const w = width - x0 - border.right - pad;
  const h = height - y0 - border.bottom - pad;

  // 잘라낸 영역을 원래 크기로 되돌린다(최근접 보간). 비율 변화가 2% 안쪽이라 눈에 띄지 않는다.
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sy = y0 + Math.min(h - 1, Math.floor((y * h) / height));
    for (let x = 0; x < width; x++) {
      const sx = x0 + Math.min(w - 1, Math.floor((x * w) / width));
      const si = (sy * width + sx) * 4;
      const di = (y * width + x) * 4;
      out[di] = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = 255;
    }
  }

  return {
    data: jpeg.encode({ data: out, width, height }, quality).data,
    cropped: true,
    border,
  };
}
