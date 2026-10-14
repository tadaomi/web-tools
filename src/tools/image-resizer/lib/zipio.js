// ZIP の展開・生成。fflate は使うときに初めて読み込む（初期表示を軽く保つため）。

import { fixFileName } from './filename.js';
import { isImagePath } from './naming.js';

let fflatePromise = null;

function getFflate() {
  if (!fflatePromise) fflatePromise = import('fflate');
  return fflatePromise;
}

// 処理対象のエントリか。フォルダ・__MACOSX・ドットで始まる名前（どの階層でも）・画像以外を除く。
export function isTargetEntry(path) {
  if (path.endsWith('/')) return false;
  const segments = path.split('/');
  if (segments.some((s) => s === '__MACOSX' || s.startsWith('.'))) return false;
  return isImagePath(path);
}

// ZIP を展開して画像だけを返す。
// 戻り値: { entries: [{ path, bytes }], skipped }（skipped はフォルダ以外で除外した件数）
export async function readZip(bytes) {
  const { unzipSync } = await getFflate();
  let skipped = 0;
  let files;
  try {
    files = unzipSync(bytes, {
      // 除外するエントリは展開しない（不要なデータの解凍を省く）。
      filter: (file) => {
        if (file.name.endsWith('/')) return false;
        const ok = isTargetEntry(fixFileName(file.name));
        if (!ok) skipped++;
        return ok;
      },
    });
  } catch {
    throw new Error('ZIPを読み込めませんでした。破損していないか確認してください。');
  }
  const entries = Object.entries(files).map(([name, data]) => ({
    path: fixFileName(name),
    bytes: data,
  }));
  return { entries, skipped };
}

// files: [{ path, blob }] から ZIP を作る。
// 画像はもともと圧縮済みで再圧縮しても小さくならないため、無圧縮（level: 0）で格納する。
export async function buildZip(files) {
  const { zipSync } = await getFflate();
  const data = {};
  for (const f of files) {
    data[f.path] = new Uint8Array(await f.blob.arrayBuffer());
  }
  return zipSync(data, { level: 0 });
}
