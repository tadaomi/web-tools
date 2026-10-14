import { persisted } from '../../lib/persisted.svelte.js';
import { DEFAULT_SETTINGS, normalizeSettings } from './lib/settings.js';

// 画像リサイズの設定だけを永続化する。
// 画像そのものは容量・プライバシーの観点から保存せず、ImageResizer のセッション状態に保持する。
// localStorage キーは「web-tools:<tool>:<key>:v1」の名前空間規約に従う（README参照）。
const store = persisted('web-tools:image-resizer:settings:v1', DEFAULT_SETTINGS);

// 古い版の保存値や壊れた値でも全項目がそろうよう、起動時に一度だけ補完する。
store.value = normalizeSettings(store.value);

// 設定オブジェクト（深いリアクティブな $state）。SettingsPanel から bind:value で直接書き換える。
// store.value はこれ以降再代入しないため、この参照は常に保存対象と同じオブジェクトを指す。
export const resizerSettings = store.value;
