import { persisted } from './persisted.svelte.js';
import { resolveTheme, toggleTheme } from './theme.js';

// 配色（ライト / ダーク）の状態。全ツール共通で、ヘッダーの切り替えボタンから操作する。
//
// - 未選択（null）のあいだは OS の設定に従い、OS 側の変更にも追従する。
// - ボタンで選んだ配色は localStorage に保存し、<html data-theme="…"> として反映する。
//   色そのものは app.css の color-scheme と light-dark() が切り替える。
// - キーは index.html の描画前スクリプト（ちらつき防止）と共有している。

const saved = persisted('web-tools:app:theme:v1', null);

const media = window.matchMedia('(prefers-color-scheme: dark)');
let systemDark = $state(media.matches);
media.addEventListener('change', (e) => (systemDark = e.matches));

$effect.root(() => {
  $effect(() => {
    const root = document.documentElement;
    if (saved.value === 'light' || saved.value === 'dark') {
      root.dataset.theme = saved.value;
    } else {
      // 未選択なら属性を外し、OS の設定（color-scheme: light dark）に任せる。
      delete root.dataset.theme;
    }
  });
});

export const theme = {
  // いま表示している配色（'light' | 'dark'）。
  get current() {
    return resolveTheme(saved.value, systemDark);
  },
  // いま表示している配色の反対に固定する。
  toggle() {
    saved.value = toggleTheme(saved.value, systemDark);
  },
};
