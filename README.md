# Web便利ツール

気軽に使える、軽量なWeb便利ツール集。最初のツールはシンプルなメモ帳です。
すべてブラウザ内で完結し、バックエンドはありません（データは `localStorage` に保存）。

## 技術スタック

- [Vite](https://vite.dev/) + [Svelte 5](https://svelte.dev/)（runes: `$state` / `$derived` / `$effect`）
- 依存ゼロの最小ハッシュルーター（`#/<tool-id>`）
- 静的ホスティング向け（ビルド成果物は `dist/`）

## 開発

```bash
npm install      # 依存インストール
npm run dev      # 開発サーバ（http://localhost:5173）
npm run build    # 本番ビルド → dist/
npm run preview  # ビルド成果物をローカル確認
```

## ディレクトリ構成

```
src/
  main.js                  # エントリ（Svelte 5 の mount）
  App.svelte               # レイアウト（ヘッダー + ハッシュルーター）
  app.css                  # 全体の最小スタイル + CSS変数（テーマ/ダークモード）
  lib/
    registry.js            # ツールの単一レジストリ（一覧・ルーティングの元）
    router.svelte.js       # 最小ハッシュルーター
    persisted.svelte.js    # localStorage 永続化ヘルパ（全ツール共用）
  components/
    Header.svelte          # 共通ヘッダー
    Home.svelte            # ツール一覧（トップ）
  tools/
    notes/                 # メモアプリ（1ディレクトリ完結）
      Notes.svelte         # レイアウト + ドロワー開閉
      notes.svelte.js      # 状態（$state）+ 操作関数 + 永続化
      NoteList.svelte      # 一覧（サイドバー / モバイルはドロワー）
      NoteEditor.svelte    # 本文エディタ（textarea）
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

例（メモ）: `web-tools:notes:notes:v1`（メモ配列）、`web-tools:notes:activeId:v1`（選択中ID）

## デプロイ

ハッシュルーティングのため、どのホスティングでも SPA フォールバック（`404.html` / `200.html`）設定は不要です。

- **Vercel / Netlify / ユーザーサイト**: そのまま `npm run build`（base は `/`）。公開ディレクトリは `dist`。
- **GitHub Pages**（`https://<user>.github.io/web-tools/`）: `npm run build:gh`（base を `/web-tools/` に設定）。
  リポジトリ名が `web-tools` でない場合は `package.json` の `build:gh` の `--base` を合わせて変更してください。
  `.github/workflows/deploy.yml` で GitHub Actions による自動デプロイを用意しています
  （リポジトリの Settings → Pages → Source を「GitHub Actions」に設定）。
