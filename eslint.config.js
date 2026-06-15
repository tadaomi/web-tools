// ESLint flat config（ESLint 10 / Svelte 5 対応）
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // JavaScript 推奨ルール
  js.configs.recommended,
  // Svelte 推奨ルール（.svelte / .svelte.js のテンプレート・runes を解析）
  ...svelte.configs.recommended,
  // Prettier と競合するフォーマット系ルールを無効化（必ず最後に置く）
  prettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
  },
  // ビルド成果物などは対象外
  {
    ignores: ['dist/', 'node_modules/'],
  },
];
