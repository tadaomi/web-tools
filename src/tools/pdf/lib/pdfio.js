// pdf-lib による PDF の分割・結合コアロジック（rune非依存の純ロジック）。
// すべてブラウザ内（メインスレッド）で完結する。copyPages を使うことで
// フォントや画像などのリソースを正しく持ち越して新ドキュメントへ複製する。

import { PDFDocument } from 'pdf-lib';

// 読み込み時の暗号化エラーを分かりやすい日本語メッセージに変換する。
async function loadDocument(bytes) {
  try {
    return await PDFDocument.load(bytes);
  } catch (err) {
    // pdf-lib は暗号化PDFを既定で拒否する。メッセージで判定する。
    const message = String(err?.message ?? '');
    if (/encrypt/i.test(message)) {
      throw new Error('パスワード保護されたPDFには対応していません。', { cause: err });
    }
    throw new Error('PDFを読み込めませんでした。ファイルが破損している可能性があります。', {
      cause: err,
    });
  }
}

// 総ページ数を取得する（UIで「全 N ページ」表示に使用）。
export async function getPageCount(bytes) {
  const doc = await loadDocument(bytes);
  return doc.getPageCount();
}

// 1つのPDFを、指定したページ範囲ごとに複数のPDFへ分割する。
// ranges: [[from, to], ...]（0始まり・両端含む）。各レンジが1つの出力PDFになる。
// 戻り値: [{ bytes, pageCount }, ...]
export async function splitPdf(srcBytes, ranges) {
  const src = await loadDocument(srcBytes);
  const total = src.getPageCount();
  const out = [];

  for (const [from, to] of ranges) {
    const doc = await PDFDocument.create();
    const indices = [];
    for (let i = from; i <= to && i < total; i++) indices.push(i);
    const pages = await doc.copyPages(src, indices);
    pages.forEach((p) => doc.addPage(p));
    const bytes = await doc.save();
    out.push({ bytes, pageCount: indices.length });
  }

  return out;
}

// 各ページを個別のPDFへ分割する（1ページ = 1ファイル）。
export async function splitEachPage(srcBytes) {
  const total = await getPageCount(srcBytes);
  const ranges = [];
  for (let i = 0; i < total; i++) ranges.push([i, i]);
  return splitPdf(srcBytes, ranges);
}

// 複数のPDFを、与えられた順序で1つのPDFへ結合する。
// bytesArray: 結合順に並んだ Uint8Array の配列。
// 戻り値: { bytes, pageCount }
export async function mergePdfs(bytesArray) {
  const out = await PDFDocument.create();

  for (const bytes of bytesArray) {
    const src = await loadDocument(bytes);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }

  const bytes = await out.save();
  return { bytes, pageCount: out.getPageCount() };
}
