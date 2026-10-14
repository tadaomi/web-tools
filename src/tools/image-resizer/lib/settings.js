// 画像リサイズの設定値の既定値・検証・正規化（rune非依存の純ロジック）。
// localStorage から読んだ値や入力途中の値を、処理に使える安全な値へそろえる。

export const SIZE_MIN = 16;
export const SIZE_MAX = 4096;
export const SIZE_DEFAULT = 170;
const QUALITY_MIN = 0.4;
const QUALITY_MAX = 1;

const ASPECT_RULES = ['width', 'height', 'longest', 'shortest', 'crop', 'none'];
const SQUARE_RULES = ['fit', 'none'];
const FORMATS = ['original', 'image/png', 'image/jpeg', 'image/webp'];
const NAMING_MODES = ['original', 'suffix', 'prefix', 'numbering'];

export const DEFAULT_SETTINGS = {
  size: SIZE_DEFAULT,
  ruleLandscape: 'width',
  rulePortrait: 'height',
  ruleSquare: 'fit',
  noUpscale: false,
  format: 'original',
  quality: 0.9,
  namingMode: 'original',
  affix: '',
  affixEdited: false,
};

// 基準サイズを 16〜4096 の整数へ丸める。空欄・数値でない値は既定の 170 にする。
export function clampSize(value) {
  if (value === null || value === undefined || value === '') return SIZE_DEFAULT;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return SIZE_DEFAULT;
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, n));
}

function clampQuality(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.quality;
  return Math.min(QUALITY_MAX, Math.max(QUALITY_MIN, n));
}

// 命名規則ごとの「追加する文字列」の既定値。
export function defaultAffix(mode, size) {
  if (mode === 'suffix') return `_${size}px`;
  if (mode === 'prefix') return 'resized_';
  if (mode === 'numbering') return 'img_';
  return '';
}

// ファイル名に使えない文字（/ \ : * ? " < > |）を _ に置き換える。
export function sanitizeAffix(text) {
  return String(text ?? '').replace(/[/\\:*?"<>|]/g, '_');
}

function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

// 保存済みの設定（古い版・壊れた値を含みうる）を、全項目がそろった設定へ補完する。
export function normalizeSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    size: clampSize(s.size),
    ruleLandscape: pick(s.ruleLandscape, ASPECT_RULES, DEFAULT_SETTINGS.ruleLandscape),
    rulePortrait: pick(s.rulePortrait, ASPECT_RULES, DEFAULT_SETTINGS.rulePortrait),
    ruleSquare: pick(s.ruleSquare, SQUARE_RULES, DEFAULT_SETTINGS.ruleSquare),
    noUpscale: s.noUpscale === true,
    format: pick(s.format, FORMATS, DEFAULT_SETTINGS.format),
    quality: clampQuality(s.quality),
    namingMode: pick(s.namingMode, NAMING_MODES, DEFAULT_SETTINGS.namingMode),
    affix: typeof s.affix === 'string' ? s.affix : '',
    affixEdited: s.affixEdited === true,
  };
}

// 画面に表示する「追加する文字列」。未編集なら命名規則と基準サイズから既定値を作る。
export function displayAffix(settings) {
  return settings.affixEdited
    ? settings.affix
    : defaultAffix(settings.namingMode, clampSize(settings.size));
}

// 処理に使う確定値。再処理が必要かどうかの判定（JSON での比較）にもこの値を使う。
export function effectiveSettings(settings) {
  const n = normalizeSettings(settings);
  return {
    size: n.size,
    ruleLandscape: n.ruleLandscape,
    rulePortrait: n.rulePortrait,
    ruleSquare: n.ruleSquare,
    noUpscale: n.noUpscale,
    format: n.format,
    quality: n.quality,
    namingMode: n.namingMode,
    affix: n.namingMode === 'original' ? '' : sanitizeAffix(displayAffix(n)),
  };
}
