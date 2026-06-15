// 依存ゼロの最小ハッシュルーター。
// ハッシュ方式のため、静的ホスティング（GitHub Pages 等）でも
// 404.html / 200.html のフォールバック設定が不要になる。

function currentHash() {
  return location.hash.slice(1) || '/';
}

let route = $state(currentHash());

window.addEventListener('hashchange', () => {
  route = currentHash();
});

// 再代入される $state は直接 export できないため getter 経由で公開する。
export function getRoute() {
  return route;
}
