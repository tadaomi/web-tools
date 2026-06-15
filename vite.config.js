import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base はデフォルト '/'（Vercel / Netlify / ユーザーサイトはこのままでOK）。
// GitHub Pages（USER.github.io/web-tools）へ出す場合は `npm run build:gh`
// （= vite build --base=/web-tools/）を使う。
export default defineConfig({
  plugins: [svelte()],
});
