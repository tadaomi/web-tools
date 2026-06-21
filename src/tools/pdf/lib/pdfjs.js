// pdf.js（pdfjs-dist）の遅延ロードと worker 設定を一元化する。
// 圧縮タブで初めて呼ばれるため、pdf.js 本体は圧縮を使うときだけダウンロードされる。

let pdfjsPromise = null;

// pdf.js モジュールを取得する（初回のみ worker を設定。以降はキャッシュを返す）。
export function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist');
      // Vite の `?url` import で worker をビルド対象アセットにする。
      // これにより base（"/" でも GitHub Pages の "/web-tools/" でも）に
      // 追従した正しい URL が得られ、本体と worker のバージョンも自動一致する。
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}
