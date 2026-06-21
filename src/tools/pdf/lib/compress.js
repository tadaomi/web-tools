// PDF圧縮コアロジック（画像再圧縮方式）。
//
// 方式: 各ページを pdf.js で Canvas にレンダリングし、JPEG（品質指定）として
// 書き出してから pdf-lib で新しいPDFへ画像として貼り直す。
//
// 特性（UIでも明示する）:
//  - 画像主体・スキャンPDFには非常に有効（解像度×JPEG品質で実サイズを直接制御）。
//  - テキスト主体PDFでは効果が薄く、テキストは画像化されコピー/検索ができなくなる。
//    内容によっては逆にサイズが増えることもある（呼び出し側で増加時に警告する）。

import { PDFDocument } from 'pdf-lib';
import { getPdfjs } from './pdfjs.js';

// PDFを圧縮する。
// options:
//   quality    JPEG品質 0..1（既定0.6）
//   scale      レンダリング解像度スケール（既定1.0。小さいほど低解像度=小サイズ）
//   onProgress (current, total) => void  ページ単位の進捗コールバック
// 戻り値: 圧縮後の Uint8Array
export async function compressPdf(srcBytes, { quality = 0.6, scale = 1.0, onProgress } = {}) {
  const pdfjs = await getPdfjs();

  // pdf.js は渡したバッファを内部で transfer して detach する場合があるため複製して渡す。
  const src = await pdfjs.getDocument({ data: srcBytes.slice() }).promise;
  const out = await PDFDocument.create();
  const total = src.numPages;

  for (let i = 1; i <= total; i++) {
    const page = await src.getPage(i);

    // 描画用ビューポート（scale を反映した実ピクセルサイズ）。
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    // JPEGは透過を持てないため、先に白で塗りつぶしておく。
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // pdf.js v6 は canvas と canvasContext の両方を受け取る。
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('画像の生成に失敗しました（メモリ不足の可能性があります）。');
    const jpgBytes = new Uint8Array(await blob.arrayBuffer());

    // 出力PDFには「元のページのpt寸法」で貼る（scale=1 のビューポート寸法）。
    const ptViewport = page.getViewport({ scale: 1 });
    const embedded = await out.embedJpg(jpgBytes);
    const outPage = out.addPage([ptViewport.width, ptViewport.height]);
    outPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: ptViewport.width,
      height: ptViewport.height,
    });

    page.cleanup();
    onProgress?.(i, total);

    // 1ページごとにイベントループへ制御を返し、UI（進捗バー）を更新させる。
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return out.save();
}
