// 出力ファイル名・拡張子・出力形式の決定・重複回避・並べ替え（rune非依存の純ロジック）。

export const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];

const MIME_BY_EXT = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const LABEL_BY_MIME = { 'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WebP' };

// "sub/dir/a.jpg" → { dir: 'sub/dir/', name: 'a.jpg' }
export function splitPath(path) {
  const i = path.lastIndexOf('/');
  return { dir: path.slice(0, i + 1), name: path.slice(i + 1) };
}

// "a.b.JPG" → { base: 'a.b', ext: 'JPG' }（拡張子は元の表記のまま。無ければ ''）
export function splitExt(name) {
  const i = name.lastIndexOf('.');
  if (i <= 0) return { base: name, ext: '' };
  return { base: name.slice(0, i), ext: name.slice(i + 1) };
}

// パスの拡張子を小文字で返す。
export function extOf(path) {
  return splitExt(splitPath(path).name).ext.toLowerCase();
}

// 処理できる画像の拡張子か。
export function isImagePath(path) {
  return IMAGE_EXTS.includes(extOf(path));
}

// 書き出しを依頼する形式。original は拡張子で判定する
// （ZIP から取り出したデータには MIME タイプが無いため）。GIF/BMP はブラウザが書き出せないので PNG。
export function targetMime(path, format) {
  if (format !== 'original') return format;
  return MIME_BY_EXT[extOf(path)] ?? 'image/png';
}

// 出力の拡張子。実際に書き出された形式（blob.type）で決める。
// original で元の拡張子と形式が一致する場合は、元の表記（.JPEG など）を保つ。
export function outputExt(srcExt, actualMime, format) {
  if (format === 'original' && MIME_BY_EXT[srcExt.toLowerCase()] === actualMime) return srcExt;
  return EXT_BY_MIME[actualMime] ?? 'png';
}

// 結果カードに表示する注意書き。
export function conversionNotes(srcExt, format, requestedMime, actualMime) {
  const notes = [];
  const ext = srcExt.toLowerCase();
  if (format === 'original' && (ext === 'gif' || ext === 'bmp')) {
    notes.push(`${ext.toUpperCase()}→PNG`);
  }
  if (requestedMime !== actualMime) {
    const req = LABEL_BY_MIME[requestedMime] ?? requestedMime;
    const act = LABEL_BY_MIME[actualMime] ?? actualMime;
    notes.push(`${req}非対応のため${act}で出力`);
  }
  return notes;
}

// 命名規則に従って拡張子なしのファイル名を作る。
// index は成功した画像の通し番号（0始まり）、total は画像の総数（連番の桁数に使う）。
export function buildBaseName(srcBase, { namingMode, affix }, index, total) {
  switch (namingMode) {
    case 'suffix':
      return `${srcBase}${affix}`;
    case 'prefix':
      return `${affix}${srcBase}`;
    case 'numbering': {
      const digits = Math.max(3, String(total).length);
      return `${affix}${String(index + 1).padStart(digits, '0')}`;
    }
    default:
      return srcBase;
  }
}

// 出力パスの重複を避ける割り当て関数を作る。
// 同じフォルダ内で大文字・小文字を区別せずに比較し、重なれば base-2, base-3 … を付ける。
export function createNameAllocator() {
  const used = new Set();
  return (dir, base, ext) => {
    for (let n = 1; ; n++) {
      const name = n === 1 ? `${base}.${ext}` : `${base}-${n}.${ext}`;
      const key = `${dir}${name}`.toLowerCase();
      if (!used.has(key)) {
        used.add(key);
        return `${dir}${name}`;
      }
    }
  };
}

// 数字を考慮したパスの比較（img2 < img10）。処理順と連番の順になる。
export function comparePaths(a, b) {
  return a.localeCompare(b, 'ja', { numeric: true });
}

// ダウンロードする ZIP のファイル名。zipName は元の ZIP 名（画像を直接入れたときは null）。
export function zipOutputName(zipName, size) {
  const base = zipName ? splitExt(zipName).base : 'images';
  return `${base}_resized_${size}px.zip`;
}

// 設定パネルに表示するファイル名の例（sample.jpg に今の設定を適用した結果）。
export function sampleName(settings) {
  const ext = settings.format === 'original' ? 'jpg' : EXT_BY_MIME[settings.format];
  return `${buildBaseName('sample', settings, 0, 1)}.${ext}`;
}
