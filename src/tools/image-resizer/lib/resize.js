// 画像1枚のデコード → 縮小 → エンコード（ブラウザ専用: createImageBitmap / Canvas）。

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

// Canvas のピクセルメモリを早めに解放させる。
function releaseCanvas(canvas) {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
}

// bytes: 元画像のバイト列
// mime: 書き出す形式、quality: JPEG / WebP の画質
// calc: (srcW, srcH) => { outW, outH, crop }（dimensions.js の calcDimensions を束縛したもの）
// 戻り値: { blob, srcW, srcH, outW, outH }。blob.type が実際に書き出された形式。
export async function resizeImage(bytes, { mime, quality, calc }) {
  let bitmap;
  try {
    // EXIF の回転は createImageBitmap が既定で反映する。
    bitmap = await createImageBitmap(new Blob([bytes]));
  } catch {
    throw new Error('画像を読み込めませんでした。');
  }

  const temps = [];
  try {
    const srcW = bitmap.width;
    const srcH = bitmap.height;
    const { outW, outH, crop } = calc(srcW, srcH);

    let source = bitmap;
    let sx = crop ? crop.sx : 0;
    let sy = crop ? crop.sy : 0;
    let sw = crop ? crop.sw : srcW;
    let sh = crop ? crop.sh : srcH;

    // 大きく縮めるときは半分ずつ段階的に縮め、ギザギザ（エイリアシング）を抑える。
    while (sw / 2 >= outW && sh / 2 >= outH) {
      const w = Math.round(sw / 2);
      const h = Math.round(sh / 2);
      const step = makeCanvas(w, h);
      const ctx = step.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, w, h);
      temps.push(step);
      source = step;
      sx = 0;
      sy = 0;
      sw = w;
      sh = h;
    }

    const canvas = makeCanvas(outW, outH);
    temps.push(canvas);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (mime === 'image/jpeg') {
      // JPEG は透過を持てないため、先に白で塗る（塗らないと透過部分が黒くなる）。
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);
    }
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, outW, outH);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
    if (!blob) throw new Error('画像の書き出しに失敗しました（メモリ不足の可能性があります）。');
    return { blob, srcW, srcH, outW, outH };
  } finally {
    bitmap.close();
    temps.forEach(releaseCanvas);
  }
}
