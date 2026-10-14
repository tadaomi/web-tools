// ZIP 内ファイル名の文字化け救済（rune非依存の純ロジック）。
//
// fflate は UTF-8 フラグの無いファイル名を 1バイト=1文字（latin1）として文字列化する。
// Windows の標準機能で作った ZIP は日本語名を Shift_JIS で格納するため、そのままでは文字化けする。
// そこで「全文字が 0〜255 で、0x80 以上を含む」名前をバイト列に戻し、
// UTF-8 として厳密に読めればそれを、読めなければ Shift_JIS として読み直す。
// 注: UTF-8 フラグ付きで latin1 範囲の文字だけを含む名前（例: café）も対象になり得るが、
//     日本語環境の用途ではまれなため許容する。

const utf8 = new TextDecoder('utf-8', { fatal: true });
const sjis = new TextDecoder('shift_jis');

export function fixFileName(name) {
  let hasHigh = false;
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    if (c > 0xff) return name; // 既に正しくデコード済み
    if (c >= 0x80) hasHigh = true;
  }
  if (!hasHigh) return name; // ASCII のみ

  const bytes = Uint8Array.from(name, (ch) => ch.charCodeAt(0));
  try {
    return utf8.decode(bytes);
  } catch {
    return sjis.decode(bytes);
  }
}
