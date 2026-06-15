// localStorage と同期する汎用の永続化状態ヘルパ。全ツールで使い回す。
//
// 使い方:
//   const store = persisted('web-tools:foo:bar:v1', initialValue);
//   store.value           // 読み取り（コンポーネント内で読むとリアクティブ）
//   store.value = next    // 再代入
//   store.value.push(x)   // 配列/オブジェクトはミューテーションも追跡される
//
// 設計上の要点（すべて Svelte 5 ドキュメント根拠）:
//  - 読み込みはモジュール評価時に同期実行（純クライアントSPAなので browser 判定不要）。
//  - 書き込みは $effect（外部システムへの同期は $effect の正当な用途）。
//  - モジュールトップでは $effect を直接使えないため $effect.root でスコープを作る。
//  - $state は Proxy なので、シリアライズ前に必ず $state.snapshot() でプレーン化する。
//  - effect 内で snapshot+stringify と「中身まで」読むことで、配列の push / 要素編集
//    といったミューテーションも依存として張られ、確実に保存される。

function load(key, initial) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : initial;
  } catch {
    // 壊れたデータでもアプリが起動不能にならないようフォールバック
    return initial;
  }
}

export function persisted(key, initial) {
  let value = $state(load(key, initial));

  $effect.root(() => {
    $effect(() => {
      try {
        localStorage.setItem(key, JSON.stringify($state.snapshot(value)));
      } catch {
        // 容量超過（約5MB）など。初版では握りつぶす（将来は警告UIの余地）。
      }
    });
  });

  return {
    get value() {
      return value;
    },
    set value(next) {
      value = next;
    },
  };
}
