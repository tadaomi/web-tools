// 配色（ライト / ダーク）の決定ロジック（rune非依存の純ロジック）。
// saved は利用者が選んだ配色（'light' | 'dark'）。未選択（null など）なら OS の設定に従う。

const THEMES = ['light', 'dark'];

// 実際に表示する配色を返す。
export function resolveTheme(saved, systemDark) {
  if (THEMES.includes(saved)) return saved;
  return systemDark ? 'dark' : 'light';
}

// ボタンを押したあとの配色を返す（いま表示している配色の反対に固定する）。
export function toggleTheme(saved, systemDark) {
  return resolveTheme(saved, systemDark) === 'dark' ? 'light' : 'dark';
}
