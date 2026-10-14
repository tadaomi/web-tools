// Blob をブラウザのダウンロードとして保存する（Object URL 経由。サーバーには送信しない）。
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 即時に revoke するとダウンロードが始まらない環境があるため遅らせる。
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
