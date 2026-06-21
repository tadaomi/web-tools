import { persisted } from '../../lib/persisted.svelte.js';

// PDFツールの軽量UI状態のみを永続化する。
// PDFファイル本体（バイナリ）は容量・プライバシーの観点から保存せず、
// 各タブコンポーネントのセッション $state に保持してリロードで破棄する。
//
// localStorage キーは「web-tools:<tool>:<key>:v1」の名前空間規約に従う（README参照）。

// 最後に開いていたタブ（'split' | 'merge' | 'compress'）。
const activeTabStore = persisted('web-tools:pdf:activeTab:v1', 'split');

// 圧縮設定（前回値を記憶しておくと使い勝手がよい）。
const compressQualityStore = persisted('web-tools:pdf:compressQuality:v1', 0.6);
const compressScaleStore = persisted('web-tools:pdf:compressScale:v1', 1.0);

// タブ状態（読み書き両用。getter/setter 経由で再代入される $state の直接 export を避ける）。
export const pdfState = {
  get activeTab() {
    return activeTabStore.value;
  },
  set activeTab(next) {
    activeTabStore.value = next;
  },
};

// 圧縮設定（CompressTab から bind:value で双方向利用する）。
export const compressSettings = {
  get quality() {
    return compressQualityStore.value;
  },
  set quality(next) {
    compressQualityStore.value = next;
  },
  get scale() {
    return compressScaleStore.value;
  },
  set scale(next) {
    compressScaleStore.value = next;
  },
};
