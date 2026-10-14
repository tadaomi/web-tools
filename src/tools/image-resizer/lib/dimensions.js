// 出力サイズと切り抜き範囲の計算（rune非依存の純ロジック）。
// settings は effectiveSettings() の戻り値（size / ruleLandscape / rulePortrait / ruleSquare / noUpscale）。

// 画像の向きを返す（EXIF の回転を反映したあとの縦横で判定する）。
export function orientationOf(w, h) {
  if (w > h) return 'landscape';
  if (h > w) return 'portrait';
  return 'square';
}

function ruleFor(w, h, settings) {
  const o = orientationOf(w, h);
  if (o === 'landscape') return settings.ruleLandscape;
  if (o === 'portrait') return settings.rulePortrait;
  return settings.ruleSquare;
}

// 出力サイズを計算する。
// 戻り値: { outW, outH, crop }。crop は切り抜く範囲 { sx, sy, sw, sh }、null なら画像全体を使う。
export function calcDimensions(srcW, srcH, settings) {
  const { size, noUpscale } = settings;
  const rule = ruleFor(srcW, srcH, settings);

  if (rule === 'crop') {
    // 中央の「短辺×短辺」を切り抜く。拡大しない場合は短辺より大きくしない。
    const side = Math.min(srcW, srcH);
    const out = noUpscale ? Math.min(size, side) : size;
    return {
      outW: out,
      outH: out,
      crop: {
        sx: Math.round((srcW - side) / 2),
        sy: Math.round((srcH - side) / 2),
        sw: side,
        sh: side,
      },
    };
  }

  let scale;
  switch (rule) {
    case 'width':
    case 'fit':
      scale = size / srcW;
      break;
    case 'height':
      scale = size / srcH;
      break;
    case 'longest':
      scale = size / Math.max(srcW, srcH);
      break;
    case 'shortest':
      scale = size / Math.min(srcW, srcH);
      break;
    default:
      // 'none'
      scale = 1;
  }
  if (noUpscale) scale = Math.min(scale, 1);

  return {
    outW: Math.max(1, Math.round(srcW * scale)),
    outH: Math.max(1, Math.round(srcH * scale)),
    crop: null,
  };
}
