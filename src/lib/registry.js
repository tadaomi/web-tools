// ツール集の単一レジストリ。
// 新しいツールを追加する手順は2つだけ:
//   1. src/tools/<id>/ にツールを1ディレクトリ完結で作成する
//   2. この配列に1エントリ追加する（一覧・ルーティングに自動反映）
//
// load は動的 import にしておくことで、Vite がツール単位でコード分割し、
// ツールが増えてもトップページの初期表示は軽いまま保たれる。

export const tools = [
  {
    id: 'notes',
    title: 'メモ',
    description: 'すぐ書ける軽量メモ帳。内容はブラウザに自動保存。',
    icon: '📝',
    load: () => import('../tools/notes/Notes.svelte'),
  },
  {
    id: 'pdf',
    title: 'PDFツール',
    description: 'PDFの分割・結合・圧縮をブラウザ内で。アップロードなし。',
    icon: '📄',
    load: () => import('../tools/pdf/Pdf.svelte'),
  },
];
