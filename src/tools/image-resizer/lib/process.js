// 画像を1枚ずつ処理して結果の配列を作る。
// Canvas に依存する resize は呼び出し側から受け取る（Node のテストでは偽物を渡す）。

import { calcDimensions } from './dimensions.js';
import {
  splitPath,
  splitExt,
  targetMime,
  outputExt,
  conversionNotes,
  buildBaseName,
  createNameAllocator,
  comparePaths,
} from './naming.js';

// entries:  [{ path, bytes }]
// settings: effectiveSettings() の戻り値
// resize:   (bytes, { mime, quality, calc }) => Promise<{ blob, srcW, srcH, outW, outH }>
// onProgress: (current, total) => void
// 戻り値: 成功 { id, ok: true, srcPath, outPath, blob, srcW, srcH, outW, outH, srcSize, outSize, notes }
//         失敗 { id, ok: false, srcPath, error }
export async function processAll(entries, settings, { resize, onProgress } = {}) {
  const sorted = [...entries].sort((a, b) => comparePaths(a.path, b.path));
  const allocate = createNameAllocator();
  const total = sorted.length;
  const results = [];
  let okCount = 0; // 連番は成功した画像だけで振る

  for (let i = 0; i < total; i++) {
    const entry = sorted[i];
    const { dir, name } = splitPath(entry.path);
    const { base, ext } = splitExt(name);
    const mime = targetMime(entry.path, settings.format);

    try {
      const r = await resize(entry.bytes, {
        mime,
        quality: settings.quality,
        calc: (w, h) => calcDimensions(w, h, settings),
      });
      const outBase = buildBaseName(base, settings, okCount, total);
      const outPath = allocate(dir, outBase, outputExt(ext, r.blob.type, settings.format));
      okCount++;
      results.push({
        id: i,
        ok: true,
        srcPath: entry.path,
        outPath,
        blob: r.blob,
        srcW: r.srcW,
        srcH: r.srcH,
        outW: r.outW,
        outH: r.outH,
        srcSize: entry.bytes.length,
        outSize: r.blob.size,
        notes: conversionNotes(ext, settings.format, mime, r.blob.type),
      });
    } catch (e) {
      results.push({
        id: i,
        ok: false,
        srcPath: entry.path,
        error: e?.message || '処理に失敗しました。',
      });
    }

    onProgress?.(i + 1, total);
    // 1枚ごとにイベントループへ制御を返し、進捗バーを更新させる。
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return results;
}
