// 生成した PDF バイト列をブラウザのダウンロードとして保存する。
// 完全クライアントサイド処理（Blob + Object URL）。サーバーには一切送信しない。

// Uint8Array を指定ファイル名でダウンロードさせる。
export function downloadBytes(bytes, filename) {
  // Uint8Array をそのまま Blob に渡す（ArrayBuffer ビューとして扱われる）。
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // メモリ解放（即時 revoke するとダウンロードが始まらない環境があるため遅延）。
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 複数ファイルを順次ダウンロードする。
// 一度に大量の click() を発火するとブラウザにブロックされるため、間隔を空ける。
export async function downloadAll(items) {
  for (let i = 0; i < items.length; i++) {
    downloadBytes(items[i].bytes, items[i].filename);
    if (i < items.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}
