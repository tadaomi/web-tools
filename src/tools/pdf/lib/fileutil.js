// PDFツール共通の純粋ユーティリティ（rune非依存）。
// File 変換・サイズ整形・ページ範囲パースなど、UIから切り離してテストしやすくする。

// File → Uint8Array（pdf-lib / pdf.js の入力形式）。
export async function fileToBytes(file) {
  return new Uint8Array(await file.arrayBuffer());
}

// バイト数を人間に読みやすい単位へ整形する（例: 1234567 → "1.2 MB"）。
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

// ファイル名から拡張子を除いた基底部分を返す（例: "report.pdf" → "report"）。
export function baseName(filename) {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(0, dot) : filename;
}

// 削減率（%）を返す。増加した場合は負値になる（例: 0.74 → 74）。
export function reductionPercent(originalSize, newSize) {
  if (originalSize === 0) return 0;
  return Math.round((1 - newSize / originalSize) * 100);
}

// ページ範囲文字列を内部表現（0始まりの [from, to] 配列）へパースする。
// 入力例: "1-3, 5, 8-10"（1始まり・ユーザー視点）→ [[0,2],[4,4],[7,9]]
// pageCount を超える・逆順・非数値などはエラーを throw する（UI側でメッセージ表示）。
export function parseRanges(input, pageCount) {
  const text = (input ?? '').trim();
  if (!text) throw new Error('ページ範囲を入力してください。');

  const ranges = [];
  for (const partRaw of text.split(',')) {
    const part = partRaw.trim();
    if (!part) continue;

    const dash = part.indexOf('-');
    if (dash === -1) {
      // 単一ページ指定（例: "5"）
      const n = parsePageNumber(part, pageCount);
      ranges.push([n - 1, n - 1]);
    } else {
      // 範囲指定（例: "1-3"）
      const fromStr = part.slice(0, dash).trim();
      const toStr = part.slice(dash + 1).trim();
      const from = parsePageNumber(fromStr, pageCount);
      const to = parsePageNumber(toStr, pageCount);
      if (from > to) {
        throw new Error(`範囲の指定が逆です: 「${part}」（開始が終了より大きい）`);
      }
      ranges.push([from - 1, to - 1]);
    }
  }

  if (ranges.length === 0) throw new Error('有効なページ範囲がありません。');
  return ranges;
}

// 1ページ番号文字列を検証して数値で返す（1始まり）。
function parsePageNumber(str, pageCount) {
  if (!/^\d+$/.test(str)) {
    throw new Error(`数字以外が含まれています: 「${str}」`);
  }
  const n = Number(str);
  if (n < 1 || n > pageCount) {
    throw new Error(`ページ番号が範囲外です: ${n}（全 ${pageCount} ページ）`);
  }
  return n;
}
