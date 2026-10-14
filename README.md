# Web便利ツール

気軽に使える、軽量なWeb便利ツール集。シンプルなメモ帳、PDFの分割・結合・圧縮ツール、画像の一括リサイズツールを収録しています。
すべてブラウザ内で完結し、バックエンドはありません（メモは `localStorage` に保存。PDF・画像ファイルはサーバーに送信されません）。

## 技術スタック

- [Vite](https://vite.dev/) + [Svelte 5](https://svelte.dev/)（runes: `$state` / `$derived` / `$effect`）
- PDF処理: [pdf-lib](https://pdf-lib.js.org/)（分割・結合）/ [pdf.js](https://mozilla.github.io/pdf.js/)（圧縮時のページ描画）。いずれも完全クライアントサイドで動作
- 画像処理: Canvas（`createImageBitmap`）によるリサイズ / [fflate](https://github.com/101arrowz/fflate)（ZIP の展開・作成）。完全クライアントサイドで動作
- 依存ゼロの最小ハッシュルーター（`#/<tool-id>`）
- 静的ホスティング向け（ビルド成果物は `dist/`）
- Lint: [ESLint](https://eslint.org/) + [eslint-plugin-svelte](https://sveltejs.github.io/eslint-plugin-svelte/) / Format: [Prettier](https://prettier.io/) + prettier-plugin-svelte

## 開発

```bash
npm install      # 依存インストール
npm run dev      # 開発サーバ（http://localhost:5173）
npm test         # テスト（Node 標準の node --test。*.test.js を実行）
npm run build    # 本番ビルド → dist/
npm run preview  # ビルド成果物をローカル確認
```

## コード品質（Lint / Format）

[ESLint](https://eslint.org/) と [Prettier](https://prettier.io/) を導入しています。
役割を分離し、Lint（問題検出）は ESLint、Format（整形）は Prettier が担当します。
`eslint-config-prettier` を有効化しているため、両者の整形ルールは競合しません。

```bash
npm run lint     # チェックのみ（prettier --check + eslint）。CI 向けで書き換えなし
npm run format   # Prettier による自動整形（prettier --write）
```

- `.svelte` ファイル（テンプレート + runes）も含めて解析・整形されます。
  Svelte 公式が推奨する `eslint-plugin-svelte` / `prettier-plugin-svelte` を使用しています。
- 設定: [eslint.config.js](eslint.config.js)（ESLint flat config） / [.prettierrc](.prettierrc) / [.prettierignore](.prettierignore)
- コードスタイル: インデント2スペース、シングルクォート、セミコロンあり、行幅100。

## ディレクトリ構成

```
src/
  main.js                  # エントリ（Svelte 5 の mount）
  App.svelte               # レイアウト（ヘッダー + ハッシュルーター）
  app.css                  # 全体の最小スタイル + CSS変数（light-dark() によるライト/ダーク配色）
  lib/
    registry.js            # ツールの単一レジストリ（一覧・ルーティングの元）
    router.svelte.js       # 最小ハッシュルーター
    persisted.svelte.js    # localStorage 永続化ヘルパ（全ツール共用）
    theme.js               # 配色の決定ロジック（OS設定 / 手動選択）
    theme.svelte.js        # 配色の状態（保存・OS設定の監視・<html data-theme> への反映）
  components/
    Header.svelte          # 共通ヘッダー
    Home.svelte            # ツール一覧（トップ）
  tools/
    notes/                 # メモアプリ（1ディレクトリ完結）
      Notes.svelte         # レイアウト + ドロワー開閉
      notes.svelte.js      # 状態（$state）+ 操作関数 + 永続化
      NoteList.svelte      # 一覧（サイドバー / モバイルはドロワー）
      NoteEditor.svelte    # 本文エディタ（textarea）
    pdf/                   # PDFツール（分割・結合・圧縮 / 1ディレクトリ完結）
      Pdf.svelte           # タブシェル（分割 / 結合 / 圧縮の切替）
      pdf.svelte.js        # 軽量UI状態の永続化（タブ・圧縮設定。PDF本体は保存しない）
      FileDropZone.svelte  # 共通のD&D + ファイル選択
      SplitTab.svelte      # 分割（範囲指定 / 全ページ個別）
      MergeTab.svelte      # 結合（並び替え + 結合）
      CompressTab.svelte   # 圧縮（画像再圧縮 + 進捗表示）
      lib/                 # rune非依存の純ロジック
        fileutil.js        # File変換・サイズ整形・ページ範囲パース
        pdfio.js           # pdf-lib による分割・結合
        pdfjs.js           # pdf.js の遅延ロード + worker設定
        compress.js        # ページ描画→JPEG化→再構成による圧縮
        download.js        # Blob によるダウンロード
    image-resizer/         # 画像リサイズ（ZIP / 画像の一括リサイズ / 1ディレクトリ完結）
      ImageResizer.svelte  # 全体の枠と処理の制御（投入 → 処理 → 結果 → 再処理）
      imageResizer.svelte.js # 設定の永続化（画像そのものは保存しない）
      SettingsPanel.svelte # 基準サイズ・向きごとのルール・出力形式・ファイル名の設定
      DropZone.svelte      # ZIP と画像の D&D + ファイル選択
      ResultGallery.svelte # 結果のカード一覧（プレビュー・個別保存・失敗の表示）
      lib/                 # rune非依存の純ロジック（*.test.js は node --test で実行）
        settings.js        # 設定の既定値・検証・正規化
        dimensions.js      # 出力サイズと切り抜き範囲の計算
        naming.js          # 出力ファイル名・拡張子・重複回避・並べ替え
        filename.js        # ZIP 内の Shift_JIS ファイル名の救済
        zipio.js           # fflate の遅延ロード・ZIP の展開と作成
        input.js           # 投入ファイルの種類の判定
        format.js          # サイズ表示の整形
        process.js         # 1枚ずつの一括処理
        resize.js          # Canvas による段階的な縮小（ブラウザ専用）
        download.js        # Blob によるダウンロード
```

## ツールの追加方法

1. `src/tools/<id>/` にツールを1ディレクトリ完結で作成する
2. `src/lib/registry.js` の配列に1エントリ追加する

```js
{
  id: 'my-tool',
  title: '新ツール',
  description: '説明',
  icon: '✨',
  load: () => import('../tools/my-tool/MyTool.svelte'),
}
```

これだけでトップの一覧と `#/my-tool` への遷移に反映されます。

## localStorage キーの命名規約

ツール間でのキー衝突を防ぐため、次の名前空間規約に従います。

```
web-tools:<tool>:<key>:v1
```

例（共通）: `web-tools:app:theme:v1`（配色 `"light"` / `"dark"`。未保存なら OS の設定に従う。ヘッダー右端のボタンで切り替え）
例（メモ）: `web-tools:notes:notes:v1`（メモ配列）、`web-tools:notes:activeId:v1`（選択中ID）
例（PDF）: `web-tools:pdf:activeTab:v1`（選択中タブ）、`web-tools:pdf:compressQuality:v1` / `web-tools:pdf:compressScale:v1`（圧縮設定）
※ PDFファイル本体は容量・プライバシーの観点から `localStorage` に保存せず、セッション中のみメモリ上に保持します。
例（画像リサイズ）: `web-tools:image-resizer:settings:v1`（設定一式）
※ 画像ファイル本体も同様に保存せず、セッション中のみメモリ上に保持します。

## デプロイ

ハッシュルーティングのため、どのホスティングでも SPA フォールバック（`404.html` / `200.html`）設定は不要です。

- **Vercel / Netlify / ユーザーサイト**: そのまま `npm run build`（base は `/`）。公開ディレクトリは `dist`。
- **GitHub Pages**（`https://<user>.github.io/web-tools/`）: `npm run build:gh`（base を `/web-tools/` に設定）。
  リポジトリ名が `web-tools` でない場合は `package.json` の `build:gh` の `--base` を合わせて変更してください。
  `.github/workflows/deploy.yml` で GitHub Actions による自動デプロイを用意しています
  （リポジトリの Settings → Pages → Source を「GitHub Actions」に設定）。
