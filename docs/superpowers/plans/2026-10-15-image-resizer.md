# 画像リサイズツール 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 単体 HTML の「ZIP画像一括リサイザー」を、Web便利ツール集の1ツール `image-resizer` として Svelte 5 で作り直す。

**Architecture:** `src/tools/image-resizer/` で完結させる。ブラウザに依存しない処理ロジックを `lib/` の純関数に分けて `node --test` で検証し、Canvas・ファイル入出力・画面は薄い層に閉じ込める。ZIP の読み書きは fflate を `import()` で遅延ロードし、画像は `createImageBitmap` と Canvas で1枚ずつ処理する。

**Tech Stack:** Vite 8 / Svelte 5（runes）/ fflate / Node 22 の `node:test`

**Spec:** `docs/superpowers/specs/2026-10-15-image-resizer-design.md`

## Global Constraints

- コメント・UI 文言・エラーメッセージ・コミットメッセージはすべて日本語。
- コードスタイル: インデント2スペース、シングルクォート、セミコロンあり、行幅100（Prettier が整形する）。
- 追加する依存は `fflate` のみ（`dependencies`）。テストは Node 標準の `node --test`（追加の依存なし）。
- ツールは `src/tools/image-resizer/` で完結させる（他ツールのファイルを import しない。共通の `src/lib/persisted.svelte.js` は使ってよい）。
- localStorage のキーは `web-tools:image-resizer:settings:v1` の1つだけ。画像そのものは保存しない。
- 色・角丸・影は `src/app.css` の CSS 変数（`--bg` `--surface` `--surface-2` `--border` `--text` `--text-muted` `--accent` `--accent-contrast` `--danger` `--radius` `--shadow` `--font`）だけを使う。
- 既定値: 基準サイズ 170（16〜4096）、横長 `width`、縦長 `height`、正方形 `fit`、拡大しない OFF、出力形式 `original`、画質 0.9（0.4〜1.0、0.05刻み）、命名 `original`。
- コミットの末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` を付ける。
- 各タスクの終わりに `npm test` と `npm run lint` が通ること（ただし、元の `zip_image_resizer.html` に対する Prettier の警告は、Task 9 で削除するまで無視してよい）。

## Review Focus

1. **大文字の拡張子（`PHOTO.JPG` / `.JPEG`）**: 画像として扱われ、「元の形式を維持」なら JPEG のまま `.JPEG` の表記も保たれること → Task 3 と Task 4 のテストで確認する。
2. **macOS の ZIP の付属ファイル（`__MACOSX/…`、どの階層の `._xxx.jpg` も）**: 処理対象にも除外件数の誤りにもならないこと → Task 4 のテストで確認する。
3. **同じ名前になる画像（`a.jpg` と `a.png` を WebP に統一、`B.jpg` と `b.png`）**: 上書きされずに `-2` が付くこと → Task 6 のテストで確認する。
4. **ZIP の中に壊れた画像が混ざっている**: 残りは処理され、連番は飛ばず、失敗が結果に残ること → Task 6 のテストで確認する。
5. **基準サイズ欄が空・0・範囲外・文字、追加する文字列に `/` や `:`**: 処理が落ちずに安全な値へ補正されること → Task 1 のテストで確認する。

---

## ファイル構成

| ファイル                                         | 役割                                                              | 作成タスク         |
| ------------------------------------------------ | ----------------------------------------------------------------- | ------------------ |
| `src/tools/image-resizer/lib/settings.js`        | 設定の既定値・検証・正規化・処理用の確定値                        | 1                  |
| `src/tools/image-resizer/lib/dimensions.js`      | 出力サイズと切り抜き範囲の計算                                    | 2                  |
| `src/tools/image-resizer/lib/naming.js`          | パス分解・拡張子・出力形式の決定・命名・重複回避・並べ替え・ZIP名 | 3                  |
| `src/tools/image-resizer/lib/filename.js`        | ZIP 内ファイル名の Shift_JIS 救済                                 | 4                  |
| `src/tools/image-resizer/lib/zipio.js`           | fflate の遅延ロード・ZIP 展開（除外判定）・ZIP 生成               | 4                  |
| `src/tools/image-resizer/lib/input.js`           | 投入されたファイルの種類の判定                                    | 5                  |
| `src/tools/image-resizer/lib/format.js`          | バイト数の表示用の整形                                            | 5                  |
| `src/tools/image-resizer/lib/process.js`         | 1枚ずつ処理して結果を作る（resize を外から受け取る）              | 6                  |
| `src/tools/image-resizer/lib/resize.js`          | 画像のデコード・段階的な縮小・エンコード（ブラウザ専用）          | 6                  |
| `src/tools/image-resizer/lib/download.js`        | Blob のダウンロード（ブラウザ専用）                               | 6                  |
| `src/tools/image-resizer/imageResizer.svelte.js` | 設定の永続化                                                      | 7                  |
| `src/tools/image-resizer/SettingsPanel.svelte`   | 設定 UI                                                           | 7                  |
| `src/tools/image-resizer/DropZone.svelte`        | ZIP と画像の受け取り                                              | 8                  |
| `src/tools/image-resizer/ResultGallery.svelte`   | 結果カード一覧                                                    | 8                  |
| `src/tools/image-resizer/ImageResizer.svelte`    | 全体の枠と処理の制御                                              | 7（仮）→ 8（完成） |
| `src/lib/registry.js`                            | ツール登録                                                        | 7                  |
| `package.json`                                   | `fflate` と `test` スクリプト                                     | 1                  |
| `README.md`                                      | 説明の更新                                                        | 9                  |

設計書との差分: 設計書では `ImageResizer.svelte` / `imageResizer.svelte.js` が持つとしていた「設定の正規化」「入力判定」「1枚ずつの処理」を、テストできるよう `lib/settings.js` / `lib/input.js` / `lib/process.js` に分けた。また `formatBytes` を `lib/format.js` に置いた（PDF ツールの関数は1ディレクトリ完結の規約により import しない）。責務と挙動は設計書のとおり。

---

### Task 1: 基盤（fflate・テスト実行環境）と設定の正規化

**Files:**

- Modify: `package.json`
- Create: `src/tools/image-resizer/lib/settings.js`
- Test: `src/tools/image-resizer/lib/settings.test.js`

**Interfaces:**

- Consumes: なし
- Produces:
  - `SIZE_MIN = 16`, `SIZE_MAX = 4096`, `SIZE_DEFAULT = 170`
  - `DEFAULT_SETTINGS: { size, ruleLandscape, rulePortrait, ruleSquare, noUpscale, format, quality, namingMode, affix, affixEdited }`
  - `clampSize(value: any) => number`
  - `defaultAffix(mode: string, size: number) => string`
  - `sanitizeAffix(text: any) => string`
  - `normalizeSettings(raw: any) => Settings`（`DEFAULT_SETTINGS` と同じキー）
  - `displayAffix(settings) => string`
  - `effectiveSettings(settings) => { size, ruleLandscape, rulePortrait, ruleSquare, noUpscale, format, quality, namingMode, affix }`（処理と再処理判定に使う確定値。`affix` は禁止文字を置き換え済み、`original` のときは `''`）

- [ ] **Step 1: fflate を追加し、test スクリプトを登録する**

```bash
npm install fflate
npm pkg set scripts.test="node --test"
```

`package.json` の `dependencies` に `"fflate": "^0.8.x"`、`scripts` に `"test": "node --test"` が入ったことを確認する。

- [ ] **Step 2: 失敗するテストを書く**

`src/tools/image-resizer/lib/settings.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  clampSize,
  defaultAffix,
  sanitizeAffix,
  normalizeSettings,
  displayAffix,
  effectiveSettings,
} from './settings.js';

test('clampSize: 範囲内の値はそのまま、範囲外は 16〜4096 に丸める', () => {
  assert.equal(clampSize(170), 170);
  assert.equal(clampSize('200'), 200);
  assert.equal(clampSize(99.6), 100);
  assert.equal(clampSize(10), 16);
  assert.equal(clampSize(0), 16);
  assert.equal(clampSize(5000), 4096);
});

test('clampSize: 空欄・null・文字は既定の 170', () => {
  assert.equal(clampSize(''), 170);
  assert.equal(clampSize(null), 170);
  assert.equal(clampSize(undefined), 170);
  assert.equal(clampSize('abc'), 170);
});

test('defaultAffix: 命名規則ごとの既定文字列', () => {
  assert.equal(defaultAffix('suffix', 200), '_200px');
  assert.equal(defaultAffix('prefix', 200), 'resized_');
  assert.equal(defaultAffix('numbering', 200), 'img_');
  assert.equal(defaultAffix('original', 200), '');
});

test('sanitizeAffix: ファイル名に使えない文字を _ に置き換える', () => {
  assert.equal(sanitizeAffix('a/b\\c:d*e?f"g<h>i|j'), 'a_b_c_d_e_f_g_h_i_j');
  assert.equal(sanitizeAffix(null), '');
});

test('normalizeSettings: 空や壊れた値は既定値で補う', () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings('broken'), DEFAULT_SETTINGS);
  const n = normalizeSettings({ size: 300, ruleLandscape: 'foo', quality: 2, noUpscale: 'yes' });
  assert.equal(n.size, 300);
  assert.equal(n.ruleLandscape, 'width');
  assert.equal(n.quality, 1);
  assert.equal(n.noUpscale, false);
  assert.equal(n.namingMode, 'original');
});

test('displayAffix: 未編集なら基準サイズに追従し、編集済みなら入力値', () => {
  const s = { ...DEFAULT_SETTINGS, namingMode: 'suffix', size: 240 };
  assert.equal(displayAffix(s), '_240px');
  assert.equal(displayAffix({ ...s, affix: '_thumb', affixEdited: true }), '_thumb');
});

test('effectiveSettings: 禁止文字の置き換え・サイズ補正・original では affix 空', () => {
  const e = effectiveSettings({
    ...DEFAULT_SETTINGS,
    size: '',
    namingMode: 'prefix',
    affix: 'a/b:',
    affixEdited: true,
  });
  assert.equal(e.size, 170);
  assert.equal(e.affix, 'a_b_');
  assert.equal('affixEdited' in e, false);
  assert.equal(effectiveSettings({ ...DEFAULT_SETTINGS, affix: 'x', affixEdited: true }).affix, '');
});
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `npm test`
Expected: FAIL（`Cannot find module '.../settings.js'`）

- [ ] **Step 4: 実装する**

`src/tools/image-resizer/lib/settings.js`:

```js
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
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `npm test`
Expected: PASS（7 tests）

- [ ] **Step 6: Lint と整形**

Run: `npx prettier --write src/tools/image-resizer/lib package.json && npm run lint`
Expected: 新しいファイルに関する指摘がない（`zip_image_resizer.html` の Prettier 警告のみ残る）

- [ ] **Step 7: コミット**

```bash
git add package.json package-lock.json src/tools/image-resizer/lib/settings.js src/tools/image-resizer/lib/settings.test.js
git commit -m "feat: 画像リサイズの設定正規化とテスト環境を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 出力サイズの計算

**Files:**

- Create: `src/tools/image-resizer/lib/dimensions.js`
- Test: `src/tools/image-resizer/lib/dimensions.test.js`

**Interfaces:**

- Consumes: なし（`settings` は `effectiveSettings()` の戻り値の形）
- Produces:
  - `orientationOf(w: number, h: number) => 'landscape' | 'portrait' | 'square'`
  - `calcDimensions(srcW, srcH, settings) => { outW: number, outH: number, crop: { sx, sy, sw, sh } | null }`（`crop` が `null` なら画像全体を使う）

- [ ] **Step 1: 失敗するテストを書く**

`src/tools/image-resizer/lib/dimensions.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orientationOf, calcDimensions } from './dimensions.js';

const S = {
  size: 170,
  ruleLandscape: 'width',
  rulePortrait: 'height',
  ruleSquare: 'fit',
  noUpscale: false,
};

test('orientationOf: 向きの判定', () => {
  assert.equal(orientationOf(2, 1), 'landscape');
  assert.equal(orientationOf(1, 2), 'portrait');
  assert.equal(orientationOf(5, 5), 'square');
});

test('既定ルール: 横長は幅、縦長は高さ、正方形は一辺を 170 に', () => {
  assert.deepEqual(calcDimensions(1000, 500, S), { outW: 170, outH: 85, crop: null });
  assert.deepEqual(calcDimensions(500, 1000, S), { outW: 85, outH: 170, crop: null });
  assert.deepEqual(calcDimensions(400, 400, S), { outW: 170, outH: 170, crop: null });
});

test('height / longest / shortest ルール', () => {
  assert.deepEqual(calcDimensions(1000, 500, { ...S, ruleLandscape: 'height' }), {
    outW: 340,
    outH: 170,
    crop: null,
  });
  assert.deepEqual(calcDimensions(1000, 500, { ...S, ruleLandscape: 'longest' }), {
    outW: 170,
    outH: 85,
    crop: null,
  });
  assert.deepEqual(calcDimensions(500, 1000, { ...S, rulePortrait: 'longest' }), {
    outW: 85,
    outH: 170,
    crop: null,
  });
  assert.deepEqual(calcDimensions(1000, 500, { ...S, ruleLandscape: 'shortest' }), {
    outW: 340,
    outH: 170,
    crop: null,
  });
});

test('crop: 中央の正方形を切り抜いて基準×基準にする', () => {
  assert.deepEqual(calcDimensions(1000, 500, { ...S, ruleLandscape: 'crop' }), {
    outW: 170,
    outH: 170,
    crop: { sx: 250, sy: 0, sw: 500, sh: 500 },
  });
  assert.deepEqual(calcDimensions(300, 900, { ...S, rulePortrait: 'crop' }), {
    outW: 170,
    outH: 170,
    crop: { sx: 0, sy: 300, sw: 300, sh: 300 },
  });
});

test('none: 元のサイズのまま', () => {
  assert.deepEqual(calcDimensions(1000, 500, { ...S, ruleLandscape: 'none' }), {
    outW: 1000,
    outH: 500,
    crop: null,
  });
  assert.deepEqual(calcDimensions(80, 80, { ...S, ruleSquare: 'none' }), {
    outW: 80,
    outH: 80,
    crop: null,
  });
});

test('拡大しない: OFF なら小さい画像も拡大し、ON なら元のサイズ', () => {
  assert.deepEqual(calcDimensions(100, 50, S), { outW: 170, outH: 85, crop: null });
  assert.deepEqual(calcDimensions(100, 50, { ...S, noUpscale: true }), {
    outW: 100,
    outH: 50,
    crop: null,
  });
  assert.deepEqual(calcDimensions(100, 100, { ...S, noUpscale: true }), {
    outW: 100,
    outH: 100,
    crop: null,
  });
  // 縮小になる場合は ON でも通常どおり縮小する
  assert.deepEqual(calcDimensions(1000, 500, { ...S, noUpscale: true }), {
    outW: 170,
    outH: 85,
    crop: null,
  });
});

test('拡大しない + crop: 短辺が基準より小さければ短辺×短辺', () => {
  assert.deepEqual(calcDimensions(300, 120, { ...S, ruleLandscape: 'crop', noUpscale: true }), {
    outW: 120,
    outH: 120,
    crop: { sx: 90, sy: 0, sw: 120, sh: 120 },
  });
  assert.deepEqual(calcDimensions(300, 120, { ...S, ruleLandscape: 'crop' }).outW, 170);
});

test('丸めと最小 1px', () => {
  assert.deepEqual(calcDimensions(1001, 333, S), { outW: 170, outH: 57, crop: null });
  assert.deepEqual(calcDimensions(10000, 10, S), { outW: 170, outH: 1, crop: null });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm test`
Expected: FAIL（`Cannot find module '.../dimensions.js'`）

- [ ] **Step 3: 実装する**

`src/tools/image-resizer/lib/dimensions.js`:

```js
// 出力サイズと切り抜き範囲の計算（rune非依存の純ロジック）。
// settings は effectiveSettings() の戻り値（size / ruleLandscape / rulePortrait / ruleSquare / noUpscale）。

// 画像の向きを返す（EXIF の回転を反映したあとの縦横で判定する）。
export function orientationOf(w, h) {
  if (w > h) return 'landscape';
  if (h > w) return 'portrait';
  return 'square';
}

function ruleFor(w, h, settings) {
  const o = orientationOf(w, h);
  if (o === 'landscape') return settings.ruleLandscape;
  if (o === 'portrait') return settings.rulePortrait;
  return settings.ruleSquare;
}

// 出力サイズを計算する。
// 戻り値: { outW, outH, crop }。crop は切り抜く範囲 { sx, sy, sw, sh }、null なら画像全体を使う。
export function calcDimensions(srcW, srcH, settings) {
  const { size, noUpscale } = settings;
  const rule = ruleFor(srcW, srcH, settings);

  if (rule === 'crop') {
    // 中央の「短辺×短辺」を切り抜く。拡大しない場合は短辺より大きくしない。
    const side = Math.min(srcW, srcH);
    const out = noUpscale ? Math.min(size, side) : size;
    return {
      outW: out,
      outH: out,
      crop: {
        sx: Math.round((srcW - side) / 2),
        sy: Math.round((srcH - side) / 2),
        sw: side,
        sh: side,
      },
    };
  }

  let scale;
  switch (rule) {
    case 'width':
    case 'fit':
      scale = size / srcW;
      break;
    case 'height':
      scale = size / srcH;
      break;
    case 'longest':
      scale = size / Math.max(srcW, srcH);
      break;
    case 'shortest':
      scale = size / Math.min(srcW, srcH);
      break;
    default:
      // 'none'
      scale = 1;
  }
  if (noUpscale) scale = Math.min(scale, 1);

  return {
    outW: Math.max(1, Math.round(srcW * scale)),
    outH: Math.max(1, Math.round(srcH * scale)),
    crop: null,
  };
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm test`
Expected: PASS（dimensions の 8 tests を含めすべて成功）

- [ ] **Step 5: Lint と整形**

Run: `npx prettier --write src/tools/image-resizer/lib && npm run lint`
Expected: 新しいファイルに関する指摘がない

- [ ] **Step 6: コミット**

```bash
git add src/tools/image-resizer/lib/dimensions.js src/tools/image-resizer/lib/dimensions.test.js
git commit -m "feat: 画像リサイズの出力サイズ計算を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: ファイル名・拡張子・出力形式の決定

**Files:**

- Create: `src/tools/image-resizer/lib/naming.js`
- Test: `src/tools/image-resizer/lib/naming.test.js`

**Interfaces:**

- Consumes: なし
- Produces:
  - `IMAGE_EXTS: string[]`（`['jpg','jpeg','png','webp','gif','bmp']`）
  - `splitPath(path) => { dir: string /* 末尾 '/' 付き or '' */, name: string }`
  - `splitExt(name) => { base: string, ext: string /* 元の表記・ドットなし・無ければ '' */ }`
  - `extOf(path) => string`（小文字）
  - `isImagePath(path) => boolean`
  - `targetMime(path, format) => 'image/jpeg' | 'image/png' | 'image/webp'`
  - `outputExt(srcExt, actualMime, format) => string`
  - `conversionNotes(srcExt, format, requestedMime, actualMime) => string[]`
  - `buildBaseName(srcBase, { namingMode, affix }, index, total) => string`
  - `createNameAllocator() => (dir, base, ext) => string`（出力パス）
  - `comparePaths(a, b) => number`
  - `zipOutputName(zipName: string | null, size: number) => string`
  - `sampleName(settings) => string`（`settings` は `effectiveSettings()` の戻り値）

- [ ] **Step 1: 失敗するテストを書く**

`src/tools/image-resizer/lib/naming.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  splitPath,
  splitExt,
  extOf,
  isImagePath,
  targetMime,
  outputExt,
  conversionNotes,
  buildBaseName,
  createNameAllocator,
  comparePaths,
  zipOutputName,
  sampleName,
} from './naming.js';

test('splitPath / splitExt / extOf', () => {
  assert.deepEqual(splitPath('sub/dir/a.jpg'), { dir: 'sub/dir/', name: 'a.jpg' });
  assert.deepEqual(splitPath('a.jpg'), { dir: '', name: 'a.jpg' });
  assert.deepEqual(splitExt('a.b.JPG'), { base: 'a.b', ext: 'JPG' });
  assert.deepEqual(splitExt('noext'), { base: 'noext', ext: '' });
  assert.equal(extOf('X/PHOTO.JPG'), 'jpg');
});

test('isImagePath: 大文字の拡張子も画像として扱う', () => {
  assert.equal(isImagePath('a.JPEG'), true);
  assert.equal(isImagePath('sub/b.Png'), true);
  assert.equal(isImagePath('c.bmp'), true);
  assert.equal(isImagePath('readme.txt'), false);
  assert.equal(isImagePath('d.tiff'), false);
});

test('targetMime: original は拡張子で判定し、GIF/BMP は PNG', () => {
  assert.equal(targetMime('a.JPG', 'original'), 'image/jpeg');
  assert.equal(targetMime('a.jpeg', 'original'), 'image/jpeg');
  assert.equal(targetMime('a.png', 'original'), 'image/png');
  assert.equal(targetMime('a.webp', 'original'), 'image/webp');
  assert.equal(targetMime('a.gif', 'original'), 'image/png');
  assert.equal(targetMime('a.bmp', 'original'), 'image/png');
  assert.equal(targetMime('a.png', 'image/jpeg'), 'image/jpeg');
});

test('outputExt: 実際の形式で決め、original で一致すれば元の表記を保つ', () => {
  assert.equal(outputExt('JPEG', 'image/jpeg', 'original'), 'JPEG');
  assert.equal(outputExt('jpg', 'image/jpeg', 'original'), 'jpg');
  assert.equal(outputExt('gif', 'image/png', 'original'), 'png');
  assert.equal(outputExt('PNG', 'image/jpeg', 'image/jpeg'), 'jpg');
  assert.equal(outputExt('jpg', 'image/png', 'image/webp'), 'png');
  assert.equal(outputExt('jpg', 'image/webp', 'image/webp'), 'webp');
});

test('conversionNotes: GIF/BMP の変換と非対応形式の注意', () => {
  assert.deepEqual(conversionNotes('GIF', 'original', 'image/png', 'image/png'), ['GIF→PNG']);
  assert.deepEqual(conversionNotes('bmp', 'original', 'image/png', 'image/png'), ['BMP→PNG']);
  assert.deepEqual(conversionNotes('jpg', 'image/webp', 'image/webp', 'image/png'), [
    'WebP非対応のためPNGで出力',
  ]);
  assert.deepEqual(conversionNotes('jpg', 'original', 'image/jpeg', 'image/jpeg'), []);
});

test('buildBaseName: 4つの命名規則と連番の桁数', () => {
  assert.equal(buildBaseName('photo', { namingMode: 'original', affix: '' }, 0, 5), 'photo');
  assert.equal(
    buildBaseName('photo', { namingMode: 'suffix', affix: '_170px' }, 0, 5),
    'photo_170px',
  );
  assert.equal(
    buildBaseName('photo', { namingMode: 'prefix', affix: 'resized_' }, 0, 5),
    'resized_photo',
  );
  assert.equal(buildBaseName('photo', { namingMode: 'numbering', affix: 'img_' }, 0, 5), 'img_001');
  assert.equal(
    buildBaseName('photo', { namingMode: 'numbering', affix: 'img_' }, 41, 1200),
    'img_0042',
  );
});

test('createNameAllocator: 同じフォルダの重複は大文字小文字を区別せず -2, -3 を付ける', () => {
  const allocate = createNameAllocator();
  assert.equal(allocate('', 'a', 'webp'), 'a.webp');
  assert.equal(allocate('', 'a', 'webp'), 'a-2.webp');
  assert.equal(allocate('', 'A', 'WEBP'), 'A-3.WEBP');
  assert.equal(allocate('sub/', 'a', 'webp'), 'sub/a.webp');
  assert.equal(allocate('', 'a-2', 'webp'), 'a-2-2.webp');
});

test('comparePaths: 数字を考慮して並べる', () => {
  const sorted = ['img10.jpg', 'img2.jpg', 'b/a.jpg', 'a/z.jpg'].sort(comparePaths);
  assert.deepEqual(sorted, ['a/z.jpg', 'b/a.jpg', 'img2.jpg', 'img10.jpg']);
});

test('zipOutputName: 元の ZIP 名、または images', () => {
  assert.equal(zipOutputName('photos.zip', 170), 'photos_resized_170px.zip');
  assert.equal(zipOutputName(null, 300), 'images_resized_300px.zip');
});

test('sampleName: 設定パネルのファイル名の例', () => {
  assert.equal(sampleName({ namingMode: 'original', affix: '', format: 'original' }), 'sample.jpg');
  assert.equal(
    sampleName({ namingMode: 'suffix', affix: '_170px', format: 'image/webp' }),
    'sample_170px.webp',
  );
  assert.equal(
    sampleName({ namingMode: 'numbering', affix: 'img_', format: 'image/png' }),
    'img_001.png',
  );
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm test`
Expected: FAIL（`Cannot find module '.../naming.js'`）

- [ ] **Step 3: 実装する**

`src/tools/image-resizer/lib/naming.js`:

```js
// 出力ファイル名・拡張子・出力形式の決定・重複回避・並べ替え（rune非依存の純ロジック）。

export const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];

const MIME_BY_EXT = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const LABEL_BY_MIME = { 'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WebP' };

// "sub/dir/a.jpg" → { dir: 'sub/dir/', name: 'a.jpg' }
export function splitPath(path) {
  const i = path.lastIndexOf('/');
  return { dir: path.slice(0, i + 1), name: path.slice(i + 1) };
}

// "a.b.JPG" → { base: 'a.b', ext: 'JPG' }（拡張子は元の表記のまま。無ければ ''）
export function splitExt(name) {
  const i = name.lastIndexOf('.');
  if (i <= 0) return { base: name, ext: '' };
  return { base: name.slice(0, i), ext: name.slice(i + 1) };
}

// パスの拡張子を小文字で返す。
export function extOf(path) {
  return splitExt(splitPath(path).name).ext.toLowerCase();
}

// 処理できる画像の拡張子か。
export function isImagePath(path) {
  return IMAGE_EXTS.includes(extOf(path));
}

// 書き出しを依頼する形式。original は拡張子で判定する
// （ZIP から取り出したデータには MIME タイプが無いため）。GIF/BMP はブラウザが書き出せないので PNG。
export function targetMime(path, format) {
  if (format !== 'original') return format;
  return MIME_BY_EXT[extOf(path)] ?? 'image/png';
}

// 出力の拡張子。実際に書き出された形式（blob.type）で決める。
// original で元の拡張子と形式が一致する場合は、元の表記（.JPEG など）を保つ。
export function outputExt(srcExt, actualMime, format) {
  if (format === 'original' && MIME_BY_EXT[srcExt.toLowerCase()] === actualMime) return srcExt;
  return EXT_BY_MIME[actualMime] ?? 'png';
}

// 結果カードに表示する注意書き。
export function conversionNotes(srcExt, format, requestedMime, actualMime) {
  const notes = [];
  const ext = srcExt.toLowerCase();
  if (format === 'original' && (ext === 'gif' || ext === 'bmp')) {
    notes.push(`${ext.toUpperCase()}→PNG`);
  }
  if (requestedMime !== actualMime) {
    const req = LABEL_BY_MIME[requestedMime] ?? requestedMime;
    const act = LABEL_BY_MIME[actualMime] ?? actualMime;
    notes.push(`${req}非対応のため${act}で出力`);
  }
  return notes;
}

// 命名規則に従って拡張子なしのファイル名を作る。
// index は成功した画像の通し番号（0始まり）、total は画像の総数（連番の桁数に使う）。
export function buildBaseName(srcBase, { namingMode, affix }, index, total) {
  switch (namingMode) {
    case 'suffix':
      return `${srcBase}${affix}`;
    case 'prefix':
      return `${affix}${srcBase}`;
    case 'numbering': {
      const digits = Math.max(3, String(total).length);
      return `${affix}${String(index + 1).padStart(digits, '0')}`;
    }
    default:
      return srcBase;
  }
}

// 出力パスの重複を避ける割り当て関数を作る。
// 同じフォルダ内で大文字・小文字を区別せずに比較し、重なれば base-2, base-3 … を付ける。
export function createNameAllocator() {
  const used = new Set();
  return (dir, base, ext) => {
    for (let n = 1; ; n++) {
      const name = n === 1 ? `${base}.${ext}` : `${base}-${n}.${ext}`;
      const key = `${dir}${name}`.toLowerCase();
      if (!used.has(key)) {
        used.add(key);
        return `${dir}${name}`;
      }
    }
  };
}

// 数字を考慮したパスの比較（img2 < img10）。処理順と連番の順になる。
export function comparePaths(a, b) {
  return a.localeCompare(b, 'ja', { numeric: true });
}

// ダウンロードする ZIP のファイル名。zipName は元の ZIP 名（画像を直接入れたときは null）。
export function zipOutputName(zipName, size) {
  const base = zipName ? splitExt(zipName).base : 'images';
  return `${base}_resized_${size}px.zip`;
}

// 設定パネルに表示するファイル名の例（sample.jpg に今の設定を適用した結果）。
export function sampleName(settings) {
  const ext = settings.format === 'original' ? 'jpg' : EXT_BY_MIME[settings.format];
  return `${buildBaseName('sample', settings, 0, 1)}.${ext}`;
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm test`
Expected: PASS（naming の 10 tests を含めすべて成功）

- [ ] **Step 5: Lint と整形**

Run: `npx prettier --write src/tools/image-resizer/lib && npm run lint`
Expected: 新しいファイルに関する指摘がない

- [ ] **Step 6: コミット**

```bash
git add src/tools/image-resizer/lib/naming.js src/tools/image-resizer/lib/naming.test.js
git commit -m "feat: 画像リサイズの命名規則と出力形式の決定を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: ZIP の読み書きとファイル名の文字化け救済

**Files:**

- Create: `src/tools/image-resizer/lib/filename.js`
- Create: `src/tools/image-resizer/lib/zipio.js`
- Test: `src/tools/image-resizer/lib/filename.test.js`
- Test: `src/tools/image-resizer/lib/zipio.test.js`

**Interfaces:**

- Consumes: `isImagePath(path)`（Task 3）
- Produces:
  - `fixFileName(name: string) => string`
  - `isTargetEntry(path: string) => boolean`
  - `readZip(bytes: Uint8Array) => Promise<{ entries: { path: string, bytes: Uint8Array }[], skipped: number }>`（壊れた ZIP は `Error('ZIPを読み込めませんでした。破損していないか確認してください。')`）
  - `buildZip(files: { path: string, blob: Blob }[]) => Promise<Uint8Array>`

- [ ] **Step 1: 失敗するテストを書く**

`src/tools/image-resizer/lib/filename.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixFileName } from './filename.js';

// バイト列を fflate と同じ方式（1バイト=1文字）で文字列にする。
const latin1 = (bytes) => String.fromCharCode(...bytes);

test('ASCII と正しく読めている日本語はそのまま', () => {
  assert.equal(fixFileName('sub/a.jpg'), 'sub/a.jpg');
  assert.equal(fixFileName('写真/画像.jpg'), '写真/画像.jpg');
});

test('Shift_JIS のファイル名を読み直す', () => {
  // 「画像.jpg」の Shift_JIS バイト列
  const name = latin1([0x89, 0xe6, 0x91, 0x9c, 0x2e, 0x6a, 0x70, 0x67]);
  assert.equal(fixFileName(name), '画像.jpg');
});

test('UTF-8 フラグなしで格納された UTF-8 のファイル名を読み直す', () => {
  const name = latin1(new TextEncoder().encode('sub/写真.png'));
  assert.equal(fixFileName(name), 'sub/写真.png');
});
```

`src/tools/image-resizer/lib/zipio.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, unzipSync } from 'fflate';
import { isTargetEntry, readZip, buildZip } from './zipio.js';

test('isTargetEntry: 画像だけを対象にし、付属ファイルを除外する', () => {
  assert.equal(isTargetEntry('a.jpg'), true);
  assert.equal(isTargetEntry('sub/B.PNG'), true);
  assert.equal(isTargetEntry('sub/'), false);
  assert.equal(isTargetEntry('__MACOSX/sub/a.jpg'), false);
  assert.equal(isTargetEntry('sub/._a.jpg'), false);
  assert.equal(isTargetEntry('.hidden/a.jpg'), false);
  assert.equal(isTargetEntry('a/.b/c.jpg'), false);
  assert.equal(isTargetEntry('readme.txt'), false);
  assert.equal(isTargetEntry('a.tiff'), false);
});

test('readZip: 画像だけを取り出し、フォルダ以外の除外件数を数える', async () => {
  const zip = zipSync(
    {
      'sub/': new Uint8Array(0),
      'sub/画像.JPG': new Uint8Array([1, 2, 3]),
      'a.png': new Uint8Array([4]),
      '__MACOSX/sub/._画像.JPG': new Uint8Array([0]),
      'sub/._a.png': new Uint8Array([0]),
      'notes.txt': new Uint8Array([5]),
    },
    { level: 0 },
  );
  const { entries, skipped } = await readZip(zip);
  const paths = entries.map((e) => e.path).sort();
  assert.deepEqual(paths, ['a.png', 'sub/画像.JPG']);
  assert.deepEqual([...entries.find((e) => e.path === 'sub/画像.JPG').bytes], [1, 2, 3]);
  assert.equal(skipped, 3);
});

test('readZip: 壊れた ZIP は日本語のエラーにする', async () => {
  await assert.rejects(readZip(new Uint8Array([1, 2, 3, 4])), {
    message: 'ZIPを読み込めませんでした。破損していないか確認してください。',
  });
});

test('buildZip: フォルダ構成を保って無圧縮で格納する', async () => {
  const bytes = await buildZip([
    { path: 'sub/a.jpg', blob: new Blob([new Uint8Array([9, 8])]) },
    { path: 'b.png', blob: new Blob([new Uint8Array([7])]) },
  ]);
  const out = unzipSync(bytes);
  assert.deepEqual(Object.keys(out).sort(), ['b.png', 'sub/a.jpg']);
  assert.deepEqual([...out['sub/a.jpg']], [9, 8]);
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm test`
Expected: FAIL（`Cannot find module '.../filename.js'` と `'.../zipio.js'`）

- [ ] **Step 3: filename.js を実装する**

`src/tools/image-resizer/lib/filename.js`:

```js
// ZIP 内ファイル名の文字化け救済（rune非依存の純ロジック）。
//
// fflate は UTF-8 フラグの無いファイル名を 1バイト=1文字（latin1）として文字列化する。
// Windows の標準機能で作った ZIP は日本語名を Shift_JIS で格納するため、そのままでは文字化けする。
// そこで「全文字が 0〜255 で、0x80 以上を含む」名前をバイト列に戻し、
// UTF-8 として厳密に読めればそれを、読めなければ Shift_JIS として読み直す。
// 注: UTF-8 フラグ付きで latin1 範囲の文字だけを含む名前（例: café）も対象になり得るが、
//     日本語環境の用途ではまれなため許容する。

const utf8 = new TextDecoder('utf-8', { fatal: true });
const sjis = new TextDecoder('shift_jis');

export function fixFileName(name) {
  let hasHigh = false;
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    if (c > 0xff) return name; // 既に正しくデコード済み
    if (c >= 0x80) hasHigh = true;
  }
  if (!hasHigh) return name; // ASCII のみ

  const bytes = Uint8Array.from(name, (ch) => ch.charCodeAt(0));
  try {
    return utf8.decode(bytes);
  } catch {
    return sjis.decode(bytes);
  }
}
```

- [ ] **Step 4: zipio.js を実装する**

`src/tools/image-resizer/lib/zipio.js`:

```js
// ZIP の展開・生成。fflate は使うときに初めて読み込む（初期表示を軽く保つため）。

import { fixFileName } from './filename.js';
import { isImagePath } from './naming.js';

let fflatePromise = null;

function getFflate() {
  if (!fflatePromise) fflatePromise = import('fflate');
  return fflatePromise;
}

// 処理対象のエントリか。フォルダ・__MACOSX・ドットで始まる名前（どの階層でも）・画像以外を除く。
export function isTargetEntry(path) {
  if (path.endsWith('/')) return false;
  const segments = path.split('/');
  if (segments.some((s) => s === '__MACOSX' || s.startsWith('.'))) return false;
  return isImagePath(path);
}

// ZIP を展開して画像だけを返す。
// 戻り値: { entries: [{ path, bytes }], skipped }（skipped はフォルダ以外で除外した件数）
export async function readZip(bytes) {
  const { unzipSync } = await getFflate();
  let skipped = 0;
  let files;
  try {
    files = unzipSync(bytes, {
      // 除外するエントリは展開しない（不要なデータの解凍を省く）。
      filter: (file) => {
        if (file.name.endsWith('/')) return false;
        const ok = isTargetEntry(fixFileName(file.name));
        if (!ok) skipped++;
        return ok;
      },
    });
  } catch {
    throw new Error('ZIPを読み込めませんでした。破損していないか確認してください。');
  }
  const entries = Object.entries(files).map(([name, data]) => ({
    path: fixFileName(name),
    bytes: data,
  }));
  return { entries, skipped };
}

// files: [{ path, blob }] から ZIP を作る。
// 画像はもともと圧縮済みで再圧縮しても小さくならないため、無圧縮（level: 0）で格納する。
export async function buildZip(files) {
  const { zipSync } = await getFflate();
  const data = {};
  for (const f of files) {
    data[f.path] = new Uint8Array(await f.blob.arrayBuffer());
  }
  return zipSync(data, { level: 0 });
}
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `npm test`
Expected: PASS（filename 3 tests、zipio 4 tests を含めすべて成功）

- [ ] **Step 6: Lint と整形**

Run: `npx prettier --write src/tools/image-resizer/lib && npm run lint`
Expected: 新しいファイルに関する指摘がない

- [ ] **Step 7: コミット**

```bash
git add src/tools/image-resizer/lib/filename.js src/tools/image-resizer/lib/filename.test.js src/tools/image-resizer/lib/zipio.js src/tools/image-resizer/lib/zipio.test.js
git commit -m "feat: 画像リサイズのZIP読み書きと日本語ファイル名の救済を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 投入ファイルの判定とサイズ表示

**Files:**

- Create: `src/tools/image-resizer/lib/input.js`
- Create: `src/tools/image-resizer/lib/format.js`
- Test: `src/tools/image-resizer/lib/input.test.js`
- Test: `src/tools/image-resizer/lib/format.test.js`

**Interfaces:**

- Consumes: `isImagePath(path)`（Task 3）
- Produces:
  - `classifyFiles(files: ArrayLike<{ name: string, type?: string }>) => { kind: 'zip', file } | { kind: 'images', files: File[] } | { kind: 'error', message: string }`
  - `formatBytes(bytes: number) => string`

- [ ] **Step 1: 失敗するテストを書く**

`src/tools/image-resizer/lib/input.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyFiles } from './input.js';

const f = (name, type = '') => ({ name, type });

test('ZIP 1つ', () => {
  const zip = f('photos.ZIP');
  assert.deepEqual(classifyFiles([zip]), { kind: 'zip', file: zip });
  const byMime = f('download', 'application/x-zip-compressed');
  assert.deepEqual(classifyFiles([byMime]), { kind: 'zip', file: byMime });
});

test('画像だけを複数', () => {
  const files = [f('a.jpg'), f('B.PNG'), f('c.gif')];
  assert.deepEqual(classifyFiles(files), { kind: 'images', files });
});

test('受け付けない組み合わせ', () => {
  assert.deepEqual(classifyFiles([]), {
    kind: 'error',
    message: 'ファイルが選択されていません。',
  });
  assert.deepEqual(classifyFiles([f('a.jpg'), f('doc.pdf')]), {
    kind: 'error',
    message: 'ZIPまたは画像（JPEG / PNG / WebP / GIF / BMP）を選択してください。',
  });
  assert.deepEqual(classifyFiles([f('a.zip'), f('b.zip')]), {
    kind: 'error',
    message: 'ZIPは1つずつ選択してください。',
  });
  assert.deepEqual(classifyFiles([f('a.zip'), f('b.jpg')]), {
    kind: 'error',
    message: 'ZIPと画像は同時に選択できません。',
  });
});
```

`src/tools/image-resizer/lib/format.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes } from './format.js';

test('formatBytes: 単位を付けて整形する', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(500), '500 B');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(2.5 * 1024 * 1024), '2.5 MB');
  assert.equal(formatBytes(3 * 1024 * 1024 * 1024), '3.0 GB');
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm test`
Expected: FAIL（`Cannot find module '.../input.js'` と `'.../format.js'`）

- [ ] **Step 3: 実装する**

`src/tools/image-resizer/lib/input.js`:

```js
// 投入されたファイルの種類の判定（rune非依存の純ロジック）。
// 受け付けるのは「ZIP 1つ」または「画像だけを1つ以上」のどちらか。

import { isImagePath } from './naming.js';

function isZipFile(file) {
  return /\.zip$/i.test(file.name) || /zip/i.test(file.type ?? '');
}

export function classifyFiles(files) {
  const list = Array.from(files ?? []);
  if (list.length === 0) return { kind: 'error', message: 'ファイルが選択されていません。' };

  const zips = list.filter(isZipFile);
  const images = list.filter((file) => !isZipFile(file) && isImagePath(file.name));

  if (zips.length + images.length !== list.length) {
    return {
      kind: 'error',
      message: 'ZIPまたは画像（JPEG / PNG / WebP / GIF / BMP）を選択してください。',
    };
  }
  if (zips.length > 1) return { kind: 'error', message: 'ZIPは1つずつ選択してください。' };
  if (zips.length === 1 && images.length > 0) {
    return { kind: 'error', message: 'ZIPと画像は同時に選択できません。' };
  }
  if (zips.length === 1) return { kind: 'zip', file: zips[0] };
  return { kind: 'images', files: images };
}
```

`src/tools/image-resizer/lib/format.js`:

```js
// 表示用の整形（rune非依存の純ロジック）。

// バイト数を読みやすい単位へ整形する（例: 1536 → "1.5 KB"）。
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm test`
Expected: PASS（input 3 tests、format 1 test を含めすべて成功）

- [ ] **Step 5: Lint と整形**

Run: `npx prettier --write src/tools/image-resizer/lib && npm run lint`
Expected: 新しいファイルに関する指摘がない

- [ ] **Step 6: コミット**

```bash
git add src/tools/image-resizer/lib/input.js src/tools/image-resizer/lib/input.test.js src/tools/image-resizer/lib/format.js src/tools/image-resizer/lib/format.test.js
git commit -m "feat: 画像リサイズの投入ファイル判定とサイズ表示を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 一括処理（process）と Canvas でのリサイズ・ダウンロード

**Files:**

- Create: `src/tools/image-resizer/lib/process.js`
- Create: `src/tools/image-resizer/lib/resize.js`
- Create: `src/tools/image-resizer/lib/download.js`
- Test: `src/tools/image-resizer/lib/process.test.js`

**Interfaces:**

- Consumes: `calcDimensions`（Task 2）、`splitPath` `splitExt` `targetMime` `outputExt` `conversionNotes` `buildBaseName` `createNameAllocator` `comparePaths`（Task 3）
- Produces:
  - `processAll(entries: { path, bytes }[], settings /* effectiveSettings() */, { resize, onProgress }) => Promise<Result[]>`
    - 成功: `{ id: number, ok: true, srcPath, outPath, blob, srcW, srcH, outW, outH, srcSize, outSize, notes: string[] }`
    - 失敗: `{ id: number, ok: false, srcPath, error: string }`
    - `id` は処理順の番号（0始まり・一意）。画面の `{#each}` のキーに使う。
  - `resizeImage(bytes: Uint8Array, { mime, quality, calc: (w, h) => { outW, outH, crop } }) => Promise<{ blob, srcW, srcH, outW, outH }>`（ブラウザ専用）
  - `downloadBlob(blob: Blob, filename: string) => void`（ブラウザ専用）

- [ ] **Step 1: 失敗するテストを書く**

`src/tools/image-resizer/lib/process.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processAll } from './process.js';

const base = {
  size: 170,
  ruleLandscape: 'width',
  rulePortrait: 'height',
  ruleSquare: 'fit',
  noUpscale: false,
  format: 'original',
  quality: 0.9,
  namingMode: 'original',
  affix: '',
};

// Canvas の代わりの偽 resize。先頭バイトが 0 なら読み込み失敗にする。
// 元画像は常に 400×200 とみなし、依頼された形式の Blob を返す（unsupported に含む形式は PNG にする）。
function fakeResize({ unsupported = [] } = {}) {
  return async (bytes, { mime, calc }) => {
    if (bytes[0] === 0) throw new Error('画像を読み込めませんでした。');
    const { outW, outH } = calc(400, 200);
    const type = unsupported.includes(mime) ? 'image/png' : mime;
    return { blob: new Blob([new Uint8Array(10)], { type }), srcW: 400, srcH: 200, outW, outH };
  };
}

const ok = new Uint8Array([1, 2, 3]);
const broken = new Uint8Array([0]);

test('数字順に処理し、失敗があっても連番は飛ばさず、失敗を結果に残す', async () => {
  const entries = [
    { path: 'img10.jpg', bytes: ok },
    { path: 'img2.jpg', bytes: broken },
    { path: 'img1.jpg', bytes: ok },
  ];
  const results = await processAll(
    entries,
    { ...base, namingMode: 'numbering', affix: 'img_' },
    { resize: fakeResize() },
  );
  assert.deepEqual(
    results.map((r) => [r.id, r.srcPath, r.ok, r.outPath ?? r.error]),
    [
      [0, 'img1.jpg', true, 'img_001.jpg'],
      [1, 'img2.jpg', false, '画像を読み込めませんでした。'],
      [2, 'img10.jpg', true, 'img_002.jpg'],
    ],
  );
});

test('形式を統一したときの同名は -2 を付けて上書きを防ぐ（大文字小文字も区別しない）', async () => {
  const entries = [
    { path: 'a.png', bytes: ok },
    { path: 'a.jpg', bytes: ok },
    { path: 'B.jpg', bytes: ok },
    { path: 'b.png', bytes: ok },
  ];
  const results = await processAll(
    entries,
    { ...base, format: 'image/webp' },
    { resize: fakeResize() },
  );
  assert.deepEqual(
    results.map((r) => r.outPath),
    ['a.webp', 'a-2.webp', 'B.webp', 'b-2.webp'],
  );
});

test('サブフォルダとサイズ・元の拡張子表記を保つ', async () => {
  const [r] = await processAll(
    [{ path: 'sub/x.JPG', bytes: ok }],
    { ...base, namingMode: 'suffix', affix: '_170px' },
    { resize: fakeResize() },
  );
  assert.equal(r.outPath, 'sub/x_170px.JPG');
  assert.equal(r.blob.type, 'image/jpeg');
  assert.deepEqual([r.srcW, r.srcH, r.outW, r.outH], [400, 200, 170, 85]);
  assert.equal(r.srcSize, 3);
  assert.equal(r.outSize, 10);
  assert.deepEqual(r.notes, []);
});

test('GIF は PNG に、WebP 非対応なら PNG にして注意を付ける', async () => {
  const [gif] = await processAll([{ path: 'anim.gif', bytes: ok }], base, {
    resize: fakeResize(),
  });
  assert.equal(gif.outPath, 'anim.png');
  assert.deepEqual(gif.notes, ['GIF→PNG']);

  const [webp] = await processAll(
    [{ path: 'a.jpg', bytes: ok }],
    { ...base, format: 'image/webp' },
    { resize: fakeResize({ unsupported: ['image/webp'] }) },
  );
  assert.equal(webp.outPath, 'a.png');
  assert.deepEqual(webp.notes, ['WebP非対応のためPNGで出力']);
});

test('1枚ごとに進捗を通知する', async () => {
  const calls = [];
  await processAll(
    [
      { path: 'a.jpg', bytes: ok },
      { path: 'b.jpg', bytes: broken },
    ],
    base,
    { resize: fakeResize(), onProgress: (c, t) => calls.push([c, t]) },
  );
  assert.deepEqual(calls, [
    [1, 2],
    [2, 2],
  ]);
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm test`
Expected: FAIL（`Cannot find module '.../process.js'`）

- [ ] **Step 3: process.js を実装する**

`src/tools/image-resizer/lib/process.js`:

```js
// 画像を1枚ずつ処理して結果の配列を作る。
// Canvas に依存する resize は呼び出し側から受け取る（Node のテストでは偽物を渡す）。

import { calcDimensions } from './dimensions.js';
import {
  splitPath,
  splitExt,
  targetMime,
  outputExt,
  conversionNotes,
  buildBaseName,
  createNameAllocator,
  comparePaths,
} from './naming.js';

// entries:  [{ path, bytes }]
// settings: effectiveSettings() の戻り値
// resize:   (bytes, { mime, quality, calc }) => Promise<{ blob, srcW, srcH, outW, outH }>
// onProgress: (current, total) => void
// 戻り値: 成功 { id, ok: true, srcPath, outPath, blob, srcW, srcH, outW, outH, srcSize, outSize, notes }
//         失敗 { id, ok: false, srcPath, error }
export async function processAll(entries, settings, { resize, onProgress } = {}) {
  const sorted = [...entries].sort((a, b) => comparePaths(a.path, b.path));
  const allocate = createNameAllocator();
  const total = sorted.length;
  const results = [];
  let okCount = 0; // 連番は成功した画像だけで振る

  for (let i = 0; i < total; i++) {
    const entry = sorted[i];
    const { dir, name } = splitPath(entry.path);
    const { base, ext } = splitExt(name);
    const mime = targetMime(entry.path, settings.format);

    try {
      const r = await resize(entry.bytes, {
        mime,
        quality: settings.quality,
        calc: (w, h) => calcDimensions(w, h, settings),
      });
      const outBase = buildBaseName(base, settings, okCount, total);
      const outPath = allocate(dir, outBase, outputExt(ext, r.blob.type, settings.format));
      okCount++;
      results.push({
        id: i,
        ok: true,
        srcPath: entry.path,
        outPath,
        blob: r.blob,
        srcW: r.srcW,
        srcH: r.srcH,
        outW: r.outW,
        outH: r.outH,
        srcSize: entry.bytes.length,
        outSize: r.blob.size,
        notes: conversionNotes(ext, settings.format, mime, r.blob.type),
      });
    } catch (e) {
      results.push({
        id: i,
        ok: false,
        srcPath: entry.path,
        error: e?.message || '処理に失敗しました。',
      });
    }

    onProgress?.(i + 1, total);
    // 1枚ごとにイベントループへ制御を返し、進捗バーを更新させる。
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return results;
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm test`
Expected: PASS（process 5 tests を含めすべて成功）

- [ ] **Step 5: resize.js を実装する（ブラウザ専用。Node のテストは無く、Task 8 の手動確認で検証する）**

`src/tools/image-resizer/lib/resize.js`:

```js
// 画像1枚のデコード → 縮小 → エンコード（ブラウザ専用: createImageBitmap / Canvas）。

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

// Canvas のピクセルメモリを早めに解放させる。
function releaseCanvas(canvas) {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
}

// bytes: 元画像のバイト列
// mime: 書き出す形式、quality: JPEG / WebP の画質
// calc: (srcW, srcH) => { outW, outH, crop }（dimensions.js の calcDimensions を束縛したもの）
// 戻り値: { blob, srcW, srcH, outW, outH }。blob.type が実際に書き出された形式。
export async function resizeImage(bytes, { mime, quality, calc }) {
  let bitmap;
  try {
    // EXIF の回転は createImageBitmap が既定で反映する。
    bitmap = await createImageBitmap(new Blob([bytes]));
  } catch {
    throw new Error('画像を読み込めませんでした。');
  }

  const temps = [];
  try {
    const srcW = bitmap.width;
    const srcH = bitmap.height;
    const { outW, outH, crop } = calc(srcW, srcH);

    let source = bitmap;
    let sx = crop ? crop.sx : 0;
    let sy = crop ? crop.sy : 0;
    let sw = crop ? crop.sw : srcW;
    let sh = crop ? crop.sh : srcH;

    // 大きく縮めるときは半分ずつ段階的に縮め、ギザギザ（エイリアシング）を抑える。
    while (sw / 2 >= outW && sh / 2 >= outH) {
      const w = Math.round(sw / 2);
      const h = Math.round(sh / 2);
      const step = makeCanvas(w, h);
      const ctx = step.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, w, h);
      temps.push(step);
      source = step;
      sx = 0;
      sy = 0;
      sw = w;
      sh = h;
    }

    const canvas = makeCanvas(outW, outH);
    temps.push(canvas);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (mime === 'image/jpeg') {
      // JPEG は透過を持てないため、先に白で塗る（塗らないと透過部分が黒くなる）。
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);
    }
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, outW, outH);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
    if (!blob) throw new Error('画像の書き出しに失敗しました（メモリ不足の可能性があります）。');
    return { blob, srcW, srcH, outW, outH };
  } finally {
    bitmap.close();
    temps.forEach(releaseCanvas);
  }
}
```

- [ ] **Step 6: download.js を実装する**

`src/tools/image-resizer/lib/download.js`:

```js
// Blob をブラウザのダウンロードとして保存する（Object URL 経由。サーバーには送信しない）。
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 即時に revoke するとダウンロードが始まらない環境があるため遅らせる。
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

- [ ] **Step 7: Lint と整形**

Run: `npx prettier --write src/tools/image-resizer/lib && npm test && npm run lint`
Expected: テストはすべて成功し、新しいファイルに関する指摘がない

- [ ] **Step 8: コミット**

```bash
git add src/tools/image-resizer/lib/process.js src/tools/image-resizer/lib/process.test.js src/tools/image-resizer/lib/resize.js src/tools/image-resizer/lib/download.js
git commit -m "feat: 画像リサイズの一括処理とCanvasリサイズを追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 設定の永続化・設定パネル・ツール登録

**Files:**

- Create: `src/tools/image-resizer/imageResizer.svelte.js`
- Create: `src/tools/image-resizer/SettingsPanel.svelte`
- Create: `src/tools/image-resizer/ImageResizer.svelte`（仮の枠。Task 8 で完成版に置き換える）
- Modify: `src/lib/registry.js`

**Interfaces:**

- Consumes: `DEFAULT_SETTINGS` `normalizeSettings` `displayAffix` `effectiveSettings` `SIZE_MIN` `SIZE_MAX`（Task 1）、`sampleName`（Task 3）、`persisted(key, initial)`（既存 `src/lib/persisted.svelte.js`）
- Produces:
  - `resizerSettings`（`imageResizer.svelte.js` が export する、深いリアクティブな設定オブジェクト。キーは `DEFAULT_SETTINGS` と同じ）
  - `<SettingsPanel disabled={boolean} />`

- [ ] **Step 1: 設定の永続化を作る**

`src/tools/image-resizer/imageResizer.svelte.js`:

```js
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
```

- [ ] **Step 2: 設定パネルを作る**

`src/tools/image-resizer/SettingsPanel.svelte`:

```svelte
<script>
  // 設定パネル。値は imageResizer.svelte.js の設定へ直接書き込まれ、自動で保存される。
  import { resizerSettings as s } from './imageResizer.svelte.js';
  import { displayAffix, effectiveSettings, SIZE_MIN, SIZE_MAX } from './lib/settings.js';
  import { sampleName } from './lib/naming.js';

  let { disabled = false } = $props();

  const aspectOptions = [
    { value: 'width', label: '横幅を基準サイズに合わせる' },
    { value: 'height', label: '高さを基準サイズに合わせる' },
    { value: 'longest', label: '長辺を基準サイズに合わせる' },
    { value: 'shortest', label: '短辺を基準サイズに合わせる' },
    { value: 'crop', label: '中央で正方形に切り抜く（基準×基準）' },
    { value: 'none', label: 'リサイズしない' },
  ];
  const squareOptions = [
    { value: 'fit', label: '一辺を基準サイズに合わせる' },
    { value: 'none', label: 'リサイズしない' },
  ];
  const formatOptions = [
    { value: 'original', label: '元の形式を維持（GIF / BMP は PNG）' },
    { value: 'image/png', label: 'PNG に統一' },
    { value: 'image/jpeg', label: 'JPEG に統一' },
    { value: 'image/webp', label: 'WebP に統一（軽量）' },
  ];
  const namingOptions = [
    { value: 'original', label: '元のファイル名のまま' },
    { value: 'suffix', label: '末尾に文字列を追加' },
    { value: 'prefix', label: '先頭に文字列を追加' },
    { value: 'numbering', label: '連番にする' },
  ];
  const affixLabels = {
    suffix: '末尾に追加する文字列',
    prefix: '先頭に追加する文字列',
    numbering: '番号の前に付ける文字列',
  };

  const affixValue = $derived(displayAffix(s));
  const example = $derived(sampleName(effectiveSettings(s)));
  const qualityDisabled = $derived(s.format === 'image/png');

  // 文字列を自分で編集したら、以降は基準サイズや命名規則に追従させない。
  function handleAffixInput(e) {
    s.affix = e.target.value;
    s.affixEdited = true;
  }

  // 命名規則を切り替えたら、その規則の既定文字列に戻す。
  function handleNamingChange() {
    s.affixEdited = false;
  }
</script>

<fieldset class="panel" {disabled}>
  <legend class="visually-hidden">リサイズと出力の設定</legend>

  <div class="row">
    <div class="field">
      <label for="ir-size">基準サイズ（px）</label>
      <input
        id="ir-size"
        type="number"
        min={SIZE_MIN}
        max={SIZE_MAX}
        step="1"
        bind:value={s.size}
      />
    </div>
    <div class="field">
      <label for="ir-format">出力形式</label>
      <select id="ir-format" bind:value={s.format}>
        {#each formatOptions as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="ir-quality">画質（JPEG / WebP）: {Math.round(s.quality * 100)}%</label>
      <input
        id="ir-quality"
        type="range"
        min="0.4"
        max="1"
        step="0.05"
        bind:value={s.quality}
        disabled={qualityDisabled}
      />
    </div>
  </div>

  <div class="row">
    <div class="field">
      <label for="ir-landscape">横長の画像（幅 &gt; 高さ）</label>
      <select id="ir-landscape" bind:value={s.ruleLandscape}>
        {#each aspectOptions as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="ir-portrait">縦長の画像（高さ &gt; 幅）</label>
      <select id="ir-portrait" bind:value={s.rulePortrait}>
        {#each aspectOptions as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="ir-square">正方形の画像</label>
      <select id="ir-square" bind:value={s.ruleSquare}>
        {#each squareOptions as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
  </div>

  <label class="check">
    <input type="checkbox" bind:checked={s.noUpscale} />
    小さい画像は拡大しない（基準より小さい画像は元のサイズのまま出力）
  </label>

  <div class="row">
    <div class="field">
      <label for="ir-naming">ファイル名</label>
      <select id="ir-naming" bind:value={s.namingMode} onchange={handleNamingChange}>
        {#each namingOptions as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
    {#if s.namingMode !== 'original'}
      <div class="field">
        <label for="ir-affix">{affixLabels[s.namingMode]}</label>
        <input id="ir-affix" type="text" value={affixValue} oninput={handleAffixInput} />
      </div>
    {/if}
    <div class="field">
      <span class="field-label">ファイル名の例</span>
      <code class="example">{example}</code>
    </div>
  </div>
</fieldset>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 0;
    min-width: 0;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
  }
  .field label,
  .field-label {
    font-size: 0.9rem;
    font-weight: 600;
  }
  .field input[type='number'],
  .field input[type='text'],
  .field select {
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-family: var(--font);
    font-size: 0.95rem;
  }
  .field input[type='range'] {
    accent-color: var(--accent);
  }
  .check {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }
  .check input {
    accent-color: var(--accent);
  }
  .example {
    padding: 0.45rem 0.6rem;
    border: 1px dashed var(--border);
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--accent);
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .panel:disabled {
    opacity: 0.6;
  }
</style>
```

- [ ] **Step 3: 仮の枠を作る（Task 8 で置き換える）**

`src/tools/image-resizer/ImageResizer.svelte`:

```svelte
<script>
  // 画像リサイズツールのメイン（設定パネルのみの仮の枠。処理は次のタスクで追加する）。
  import SettingsPanel from './SettingsPanel.svelte';
</script>

<section class="resizer">
  <header class="head">
    <h1>画像リサイズ</h1>
    <p class="privacy">🔒 すべてブラウザ内で処理されます。画像はサーバーに送信されません。</p>
  </header>
  <SettingsPanel />
</section>

<style>
  .resizer {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1.5rem 3rem;
  }
  .head {
    margin-bottom: 1.25rem;
  }
  .head h1 {
    margin: 0 0 0.4rem;
    font-size: 1.6rem;
  }
  .privacy {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted);
  }
</style>
```

- [ ] **Step 4: ツールを登録する**

`src/lib/registry.js` の `tools` 配列の末尾（`pdf` のエントリの後）に追加する:

```js
  {
    id: 'image-resizer',
    title: '画像リサイズ',
    description: 'ZIPや画像をまとめてリサイズ。CMSサムネイル作成に。アップロードなし。',
    icon: '🖼️',
    load: () => import('../tools/image-resizer/ImageResizer.svelte'),
  },
```

- [ ] **Step 5: 整形・Lint・ビルド**

Run: `npx prettier --write src/tools/image-resizer/*.svelte src/tools/image-resizer/*.js src/tools/image-resizer/lib src/lib/registry.js && npm test && npm run lint && npm run build`

（`zip_image_resizer.html` を整形しないよう、Prettier にはディレクトリではなく個別のパターンを渡す）

Expected: テスト成功、新しいファイルに関する Lint の指摘なし、ビルド成功（`dist/` に image-resizer のチャンクが出る）

- [ ] **Step 6: 画面で確認する**

Run: `npm run dev` で `http://localhost:5173/#/image-resizer` を開き、次を確認する。

- トップの一覧に「🖼️ 画像リサイズ」が出て、クリックで遷移する
- 基準サイズを 240 にして命名規則を「末尾に文字列を追加」にすると、文字列が `_240px`、例が `sample_240px.jpg` になる
- 文字列を `_thumb` に編集してから基準サイズを変えても `_thumb` のまま。命名規則を切り替えると既定値に戻る
- 出力形式を PNG にすると画質スライダーが無効になる
- リロードしても設定が残る（DevTools の Application → Local Storage に `web-tools:image-resizer:settings:v1`）
- 基準サイズを空欄にしても例の表示が壊れない

- [ ] **Step 7: コミット**

```bash
git add src/tools/image-resizer/imageResizer.svelte.js src/tools/image-resizer/SettingsPanel.svelte src/tools/image-resizer/ImageResizer.svelte src/lib/registry.js
git commit -m "feat: 画像リサイズの設定パネルとツール登録を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 投入・処理・結果表示・ダウンロード

**Files:**

- Create: `src/tools/image-resizer/DropZone.svelte`
- Create: `src/tools/image-resizer/ResultGallery.svelte`
- Modify（全体を置き換え）: `src/tools/image-resizer/ImageResizer.svelte`

**Interfaces:**

- Consumes: `resizerSettings`（Task 7）、`effectiveSettings`（Task 1）、`classifyFiles`（Task 5）、`formatBytes`（Task 5）、`readZip` `buildZip`（Task 4）、`processAll` `resizeImage` `downloadBlob`（Task 6）、`zipOutputName` `splitPath`（Task 3）、`<SettingsPanel disabled />`（Task 7）
- Produces:
  - `<DropZone disabled={boolean} onfiles={(files: File[]) => void} />`
  - `<ResultGallery results={Result[]} onsave={(item) => void} />`（`Result` は Task 6 の成功/失敗の形。成功には `url` が追加されている）

- [ ] **Step 1: DropZone を作る**

`src/tools/image-resizer/DropZone.svelte`:

```svelte
<script>
  // ZIP と画像の受け取り領域。ドラッグ&ドロップとクリック選択の両対応。
  // 種類の判定（ZIP 1つ / 画像のみ）は呼び出し側の classifyFiles で行う。
  let { disabled = false, onfiles } = $props();

  let dragging = $state(false);
  let inputEl;

  const ACCEPT = '.zip,.jpg,.jpeg,.png,.webp,.gif,.bmp,application/zip';

  function emit(fileList) {
    const files = Array.from(fileList ?? []);
    if (files.length > 0) onfiles?.(files);
  }

  function open() {
    if (!disabled) inputEl.click();
  }

  function handleInput(e) {
    emit(e.target.files);
    // 同じファイルを続けて選んでも change が発火するようリセットする。
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    dragging = false;
    if (!disabled) emit(e.dataTransfer?.files);
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  }
</script>

<div
  class="dropzone"
  class:dragging
  class:disabled
  role="button"
  tabindex={disabled ? -1 : 0}
  aria-disabled={disabled}
  onclick={open}
  onkeydown={handleKeydown}
  ondragover={(e) => {
    e.preventDefault();
    if (!disabled) dragging = true;
  }}
  ondragleave={() => (dragging = false)}
  ondrop={handleDrop}
>
  <span class="icon" aria-hidden="true">🖼️</span>
  <span class="label">ZIP または画像をドラッグ＆ドロップ、またはクリックして選択</span>
  <span class="hint">ZIP は1つ、画像は複数まとめて選べます（JPEG / PNG / WebP / GIF / BMP）</span>
  <input
    bind:this={inputEl}
    type="file"
    accept={ACCEPT}
    multiple
    onchange={handleInput}
    aria-label="ZIPまたは画像を選択"
  />
</div>

<style>
  .dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2.5rem 1.5rem;
    border: 2px dashed var(--border);
    border-radius: var(--radius);
    background: var(--surface-2);
    color: var(--text-muted);
    text-align: center;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      background 0.15s ease;
  }
  .dropzone:hover,
  .dropzone:focus-visible {
    border-color: var(--accent);
    outline: none;
  }
  .dropzone.dragging {
    border-color: var(--accent);
    background: var(--surface);
  }
  .dropzone.disabled {
    opacity: 0.5;
    cursor: default;
  }
  .icon {
    font-size: 2rem;
  }
  .label {
    font-size: 0.95rem;
  }
  .hint {
    font-size: 0.8rem;
    opacity: 0.8;
  }
  input[type='file'] {
    display: none;
  }
</style>
```

- [ ] **Step 2: ResultGallery を作る**

`src/tools/image-resizer/ResultGallery.svelte`:

```svelte
<script>
  // 結果カードの一覧。成功はプレビューと個別保存、失敗は理由を表示する。
  import { formatBytes } from './lib/format.js';
  import { splitPath } from './lib/naming.js';

  let { results, onsave } = $props();
</script>

<ul class="grid">
  {#each results as item (item.id)}
    <li class="card" class:failed={!item.ok}>
      {#if item.ok}
        {@const out = splitPath(item.outPath)}
        {@const src = splitPath(item.srcPath)}
        <div class="thumb">
          <img src={item.url} alt={item.outPath} loading="lazy" />
          <span class="badge">{item.outW}×{item.outH}</span>
        </div>
        <div class="body">
          <span class="name" title={item.outPath}>{out.name}</span>
          {#if out.dir}
            <span class="sub" title={out.dir}>{out.dir}</span>
          {/if}
          {#if src.name !== out.name}
            <span class="sub" title={item.srcPath}>元: {src.name}</span>
          {/if}
          <span class="meta">元 {item.srcW}×{item.srcH} ・ {formatBytes(item.outSize)}</span>
          {#each item.notes as note (note)}
            <span class="note">{note}</span>
          {/each}
          <button class="save-btn" onclick={() => onsave?.(item)}>保存</button>
        </div>
      {:else}
        <div class="body">
          <span class="name" title={item.srcPath}>{item.srcPath}</span>
          <span class="error">{item.error}</span>
        </div>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  .card.failed {
    border-color: var(--danger);
  }
  /* 透過部分が分かるよう市松模様の背景にする。 */
  .thumb {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    padding: 0.5rem;
    border-bottom: 1px solid var(--border);
    background-color: var(--surface);
    background-image:
      linear-gradient(45deg, var(--surface-2) 25%, transparent 25%),
      linear-gradient(-45deg, var(--surface-2) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--surface-2) 75%),
      linear-gradient(-45deg, transparent 75%, var(--surface-2) 75%);
    background-size: 16px 16px;
    background-position:
      0 0,
      0 8px,
      8px -8px,
      -8px 0;
  }
  .thumb img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .badge {
    position: absolute;
    top: 0.35rem;
    right: 0.35rem;
    padding: 0.05rem 0.4rem;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.6);
    color: #ffffff;
    font-size: 0.7rem;
    font-family: ui-monospace, monospace;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.5rem 0.6rem 0.6rem;
    min-width: 0;
  }
  .name {
    font-size: 0.8rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sub,
  .meta {
    font-size: 0.72rem;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .note {
    font-size: 0.72rem;
    color: var(--accent);
  }
  .error {
    font-size: 0.75rem;
    color: var(--danger);
  }
  .save-btn {
    align-self: flex-end;
    margin-top: 0.25rem;
    border: none;
    background: transparent;
    color: var(--accent);
    font-family: var(--font);
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0.1rem 0.3rem;
  }
  .save-btn:hover {
    text-decoration: underline;
  }
</style>
```

- [ ] **Step 3: ImageResizer を完成版に置き換える**

`src/tools/image-resizer/ImageResizer.svelte`（全体を置き換え）:

```svelte
<script>
  // 画像リサイズツールのメイン。ZIP 1つ、または画像を複数受け取り、設定に従って一括リサイズする。
  // すべての処理はブラウザ内で完結し、画像はサーバーに送信されない。
  import { onDestroy } from 'svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import DropZone from './DropZone.svelte';
  import ResultGallery from './ResultGallery.svelte';
  import { resizerSettings } from './imageResizer.svelte.js';
  import { effectiveSettings } from './lib/settings.js';
  import { classifyFiles } from './lib/input.js';
  import { readZip, buildZip } from './lib/zipio.js';
  import { processAll } from './lib/process.js';
  import { resizeImage } from './lib/resize.js';
  import { zipOutputName, splitPath } from './lib/naming.js';
  import { formatBytes } from './lib/format.js';
  import { downloadBlob } from './lib/download.js';

  // 入力（再処理に使うため元データを保持）。大きなバイト列を含むため $state.raw で持つ。
  let source = $state.raw(null); // { label, zipName, entries: [{ path, bytes }], skipped }
  let results = $state.raw([]); // processAll の戻り値。成功には url（プレビュー用）を追加
  let lastRun = $state.raw(null); // 最後に処理したときの effectiveSettings
  let busy = $state(false);
  let zipping = $state(false);
  let error = $state('');
  let progress = $state({ current: 0, total: 0 });

  const current = $derived(effectiveSettings(resizerSettings));
  const stale = $derived(
    source !== null &&
      lastRun !== null &&
      !busy &&
      JSON.stringify(current) !== JSON.stringify(lastRun),
  );
  const succeeded = $derived(results.filter((r) => r.ok));
  const failedCount = $derived(results.length - succeeded.length);
  const totalSrc = $derived(succeeded.reduce((sum, r) => sum + r.srcSize, 0));
  const totalOut = $derived(succeeded.reduce((sum, r) => sum + r.outSize, 0));
  const progressPct = $derived(
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0,
  );

  // プレビュー用の Object URL を解放する。
  function revokeUrls(list) {
    for (const r of list) if (r.url) URL.revokeObjectURL(r.url);
  }

  function clearResults() {
    revokeUrls(results);
    results = [];
    lastRun = null;
  }

  // 画面を離れたときもプレビュー用の URL を解放する。
  onDestroy(() => revokeUrls(results));

  async function handleFiles(files) {
    if (busy) return;
    error = '';
    const picked = classifyFiles(files);
    if (picked.kind === 'error') {
      error = picked.message;
      return;
    }

    busy = true;
    try {
      let next;
      if (picked.kind === 'zip') {
        const bytes = new Uint8Array(await picked.file.arrayBuffer());
        const { entries, skipped } = await readZip(bytes);
        next = { label: picked.file.name, zipName: picked.file.name, entries, skipped };
      } else {
        const entries = await Promise.all(
          picked.files.map(async (f) => ({
            path: f.name,
            bytes: new Uint8Array(await f.arrayBuffer()),
          })),
        );
        const label =
          picked.files.length === 1 ? picked.files[0].name : `画像 ${picked.files.length} 枚`;
        next = { label, zipName: null, entries, skipped: 0 };
      }
      if (next.entries.length === 0) {
        error = `処理できる画像が見つかりませんでした（除外 ${next.skipped} 件）。`;
        return;
      }
      clearResults();
      source = next;
    } catch (e) {
      error = e?.message || 'ファイルを読み込めませんでした。';
      return;
    } finally {
      busy = false;
    }
    await run();
  }

  async function run() {
    if (!source || busy) return;
    busy = true;
    error = '';
    clearResults();
    // 処理中は設定パネルを無効にしているため、開始時の値で最後まで処理される。
    const settings = current;
    progress = { current: 0, total: source.entries.length };
    try {
      const items = await processAll(source.entries, settings, {
        resize: resizeImage,
        onProgress: (c, t) => (progress = { current: c, total: t }),
      });
      results = items.map((r) => (r.ok ? { ...r, url: URL.createObjectURL(r.blob) } : r));
      lastRun = settings;
    } catch (e) {
      error = e?.message || 'リサイズに失敗しました。';
    } finally {
      busy = false;
    }
  }

  function reset() {
    clearResults();
    source = null;
    error = '';
    progress = { current: 0, total: 0 };
  }

  async function downloadZip() {
    if (busy || zipping || succeeded.length === 0) return;
    zipping = true;
    error = '';
    try {
      const bytes = await buildZip(succeeded.map((r) => ({ path: r.outPath, blob: r.blob })));
      downloadBlob(
        new Blob([bytes], { type: 'application/zip' }),
        zipOutputName(source.zipName, lastRun.size),
      );
    } catch {
      error = 'ZIPの作成に失敗しました。';
    } finally {
      zipping = false;
    }
  }

  function saveOne(item) {
    downloadBlob(item.blob, splitPath(item.outPath).name);
  }
</script>

<section class="resizer">
  <header class="head">
    <h1>画像リサイズ</h1>
    <p class="privacy">🔒 すべてブラウザ内で処理されます。画像はサーバーに送信されません。</p>
  </header>

  <details class="guide">
    <summary>使い方</summary>
    <ol>
      <li>
        <strong>設定</strong>: 基準サイズ（既定
        170px）と向きごとのルールを確認します。設定は自動で保存されるので、次回からは不要です。
      </li>
      <li>
        <strong>投入</strong>: ZIP
        を1つ、または画像を複数ドロップすると、すぐにリサイズが始まります。
      </li>
      <li>
        <strong>保存</strong>: 結果を確認して「ZIPをダウンロード」。1枚ずつ保存することもできます。
      </li>
    </ol>
    <dl>
      <dt>横幅 / 高さに合わせる</dt>
      <dd>その辺を基準サイズにし、もう一方は縦横比を保って計算します。</dd>
      <dt>長辺 / 短辺に合わせる</dt>
      <dd>長い方（短い方）の辺を基準サイズにします。</dd>
      <dt>中央で正方形に切り抜く</dt>
      <dd>画像の中央を正方形に切り抜き、基準×基準にします。</dd>
      <dt>小さい画像は拡大しない</dt>
      <dd>オンにすると、基準より小さい画像は拡大せず、元のサイズのまま出力します。</dd>
    </dl>
    <p>設定を変えたあとは「再処理」を押せば、ファイルを入れ直さずに作り直せます。</p>
  </details>

  <SettingsPanel disabled={busy} />

  {#if source}
    <div class="file-bar">
      <span class="file-name" title={source.label}>{source.label}</span>
      <span class="file-meta">
        画像 {source.entries.length} 件{#if source.skipped > 0}（除外 {source.skipped} 件）{/if}
      </span>
      <button class="link-btn" onclick={reset} disabled={busy}>別のファイル</button>
    </div>
  {:else}
    <DropZone disabled={busy} onfiles={handleFiles} />
    {#if busy}
      <p class="status">読み込み中…</p>
    {/if}
  {/if}

  {#if busy && progress.total > 0}
    <div class="progress">
      <div class="progress-bar">
        <div class="progress-fill" style:width="{progressPct}%"></div>
      </div>
      <span class="progress-label">{progress.current} / {progress.total} 枚</span>
    </div>
  {/if}

  {#if stale}
    <div class="stale">
      <span>設定が変更されました。</span>
      <button class="primary-btn small" onclick={run}>再処理</button>
    </div>
  {/if}

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}

  {#if results.length > 0}
    <div class="result-head">
      <div class="result-info">
        <strong>
          成功 {succeeded.length} 件
          {#if failedCount > 0}
            / <span class="failed">失敗 {failedCount} 件</span>
          {/if}
        </strong>
        {#if succeeded.length > 0}
          <span class="r-meta">{formatBytes(totalSrc)} → {formatBytes(totalOut)}</span>
        {/if}
      </div>
      <button
        class="primary-btn"
        onclick={downloadZip}
        disabled={busy || zipping || succeeded.length === 0}
      >
        {zipping ? 'ZIPを作成中…' : 'ZIPをダウンロード'}
      </button>
    </div>
    <ResultGallery {results} onsave={saveOne} />
  {/if}
</section>

<style>
  .resizer {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1.5rem 3rem;
  }
  .head h1 {
    margin: 0 0 0.4rem;
    font-size: 1.6rem;
  }
  .privacy {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted);
  }
  .guide {
    padding: 0.6rem 0.9rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-2);
    font-size: 0.85rem;
    color: var(--text-muted);
  }
  .guide summary {
    cursor: pointer;
    color: var(--text);
    font-weight: 600;
  }
  .guide ol {
    margin: 0.6rem 0;
    padding-left: 1.3rem;
  }
  .guide dl {
    margin: 0.6rem 0;
  }
  .guide dt {
    color: var(--text);
    font-weight: 600;
  }
  .guide dd {
    margin: 0 0 0.4rem;
  }
  .guide p {
    margin: 0.4rem 0 0;
  }
  .file-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.9rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .file-name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .file-meta {
    flex: 1;
    color: var(--text-muted);
    font-size: 0.85rem;
    white-space: nowrap;
  }
  .status {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.85rem;
  }
  .progress {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .progress-bar {
    flex: 1;
    height: 8px;
    background: var(--surface-2);
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.15s ease;
  }
  .progress-label {
    font-size: 0.82rem;
    color: var(--text-muted);
    white-space: nowrap;
  }
  .stale {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.6rem 0.9rem;
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    font-size: 0.9rem;
  }
  .result-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .result-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .failed {
    color: var(--danger);
  }
  .r-meta {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
  .primary-btn {
    border: none;
    background: var(--accent);
    color: var(--accent-contrast);
    border-radius: 8px;
    padding: 0.6rem 1.2rem;
    font-family: var(--font);
    font-size: 0.95rem;
    cursor: pointer;
    transition: opacity 0.12s ease;
  }
  .primary-btn:hover:not(:disabled) {
    opacity: 0.9;
  }
  .primary-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .primary-btn.small {
    padding: 0.45rem 1rem;
    font-size: 0.85rem;
  }
  .link-btn {
    border: none;
    background: transparent;
    color: var(--accent);
    cursor: pointer;
    font-family: var(--font);
    font-size: 0.85rem;
    padding: 0.2rem 0.4rem;
  }
  .link-btn:hover:not(:disabled) {
    text-decoration: underline;
  }
  .link-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .error {
    margin: 0;
    color: var(--danger);
    font-size: 0.9rem;
  }
</style>
```

- [ ] **Step 4: 整形・テスト・Lint・ビルド**

Run: `npx prettier --write src/tools/image-resizer/*.svelte src/tools/image-resizer/*.js src/tools/image-resizer/lib && npm test && npm run lint && npm run build`
Expected: テスト成功、新しいファイルに関する Lint の指摘なし、ビルド成功

- [ ] **Step 5: 手動確認用の ZIP を作る（リポジトリには含めない）**

スクラッチ領域（例: `$SCRATCH=/tmp/claude-1000/-home-sakai24-mydev-web-tools/<session>/scratchpad`）に `make-fixture.mjs` を作り、**プロジェクトのルートをカレントディレクトリにして**実行する（`fflate` をカレントディレクトリの `node_modules` から読み込むため）。

```js
// 手動確認用の ZIP を生成する。
// - 画像は Node だけで作れる PNG（透過あり）と BMP
// - 「画像.png」は Shift_JIS のファイル名（UTF-8 フラグなし）で格納する
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { deflateSync, crc32 } from 'node:zlib';

// スクリプトの置き場所ではなく、カレントディレクトリ（プロジェクトのルート）から fflate を解決する。
const { zipSync } = createRequire(`${process.cwd()}/`)('fflate');

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// pixel(x, y) => [r, g, b, a]
function png(w, h, pixel) {
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = y * stride + 1 + x * 4;
      const [r, g, b, a] = pixel(x, y);
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // ビット深度
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// 24bit BMP（下から上へ格納）
function bmp(w, h, [r, g, b]) {
  const rowSize = Math.ceil((w * 3) / 4) * 4;
  const buf = Buffer.alloc(54 + rowSize * h);
  buf.write('BM', 0, 'ascii');
  buf.writeUInt32LE(buf.length, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(w, 18);
  buf.writeInt32LE(h, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(rowSize * h, 34);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = 54 + y * rowSize + x * 3;
      buf[o] = b;
      buf[o + 1] = g;
      buf[o + 2] = r;
    }
  }
  return buf;
}

const u8 = (b) => new Uint8Array(b);
const zip = zipSync(
  {
    // 左半分が赤、右半分が透明の横長 PNG（JPEG にすると右半分が白になるはず）
    'XXXX.png': u8(png(400, 200, (x) => (x < 200 ? [220, 40, 40, 255] : [0, 0, 0, 0]))),
    'sub/portrait.png': u8(png(300, 600, (x, y) => [40, 80, Math.round((y / 600) * 255), 255])),
    'sub/small.bmp': u8(bmp(100, 100, [40, 160, 60])),
    'sub/dup.png': u8(png(240, 240, () => [200, 200, 0, 255])),
    'sub/dup.bmp': u8(bmp(240, 240, [0, 200, 200])),
    'img2.png': u8(png(500, 300, () => [120, 120, 220, 255])),
    'img10.png': u8(png(500, 300, () => [220, 120, 120, 255])),
    'broken.png': u8(Buffer.from('not an image')),
    '__MACOSX/sub/._portrait.png': u8(Buffer.from('apple double')),
    'sub/._small.bmp': u8(Buffer.from('apple double')),
    'readme.txt': u8(Buffer.from('hello')),
  },
  { level: 0 },
);

// 「XXXX.png」（8バイト）を Shift_JIS の「画像.png」（8バイト）に置き換える（ローカルヘッダと中央ディレクトリの両方）。
const out = Buffer.from(zip);
const from = Buffer.from('XXXX.png', 'ascii');
const to = Buffer.from([0x89, 0xe6, 0x91, 0x9c, 0x2e, 0x70, 0x6e, 0x67]);
for (let i = out.indexOf(from); i !== -1; i = out.indexOf(from, i + 1)) to.copy(out, i);

const dest = process.argv[2] ?? 'fixture.zip';
writeFileSync(dest, out);
console.log(`生成しました: ${dest}`);
```

Run（プロジェクトのルートで）: `node $SCRATCH/make-fixture.mjs $SCRATCH/fixture.zip`

Expected: `生成しました: …/fixture.zip`

- [ ] **Step 6: 画面で確認する（`npm run dev` → `#/image-resizer`）**

`fixture.zip` を使って確認する:

- [ ] 投入するとすぐに処理が始まり、進捗バーが動く。「画像 8 件（除外 3 件）」と表示される
- [ ] 「成功 7 件 / 失敗 1 件」。`broken.png` は赤枠のカードで「画像を読み込めませんでした。」
- [ ] `画像.png` が文字化けせずに表示される
- [ ] 既定設定で `画像.png` は 170×85、`sub/portrait.png` は 85×170、`sub/small.bmp` は 170×170 の PNG（「BMP→PNG」の注意）になる
- [ ] 出力形式を JPEG に変えると「設定が変更されました」と「再処理」が出る。再処理すると `画像.jpg` の右半分が白になる（黒くならない）
- [ ] 出力形式を WebP にして再処理すると、`sub/dup.webp` と `sub/dup-2.webp` の2つができる
- [ ] 「小さい画像は拡大しない」を ON にして再処理すると、`sub/small` が 100×100 のまま
- [ ] 命名を「連番」にして再処理すると、`img_001`… が `img2` → `img10` の順になり、番号が飛ばない
- [ ] 「ZIPをダウンロード」で `fixture_resized_170px.zip` が保存され、展開すると `sub/` フォルダの構成が保たれている
- [ ] カードの「保存」で1枚ずつ保存できる
- [ ] 「別のファイル」→ 画像を複数（PNG を2枚など）ドロップすると処理され、ZIP 名は `images_resized_170px.zip`
- [ ] ZIP と画像を同時にドロップすると「ZIPと画像は同時に選択できません。」
- [ ] 同じ ZIP を「別のファイル」から続けて選び直しても処理される
- [ ] 手元のスマートフォン写真（EXIF で回転している縦写真の JPEG）を入れると、向きが正しい
- [ ] OS をダークモードにしても読みやすい。スマートフォンの幅（DevTools で 375px）でも横スクロールが出ない

- [ ] **Step 7: コミット**

```bash
git add src/tools/image-resizer/DropZone.svelte src/tools/image-resizer/ResultGallery.svelte src/tools/image-resizer/ImageResizer.svelte
git commit -m "feat: 画像リサイズの投入・一括処理・結果表示・ZIPダウンロードを追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: README の更新と元 HTML の削除

**Files:**

- Modify: `README.md`
- Delete: `src/tools/image-resizer/zip_image_resizer.html`（git 管理外）

**Interfaces:**

- Consumes: Task 1〜8 の成果物
- Produces: なし

- [ ] **Step 1: README を更新する**

`README.md` の次の箇所を変更する。

冒頭の説明（1〜4行目）を次に置き換える:

```markdown
# Web便利ツール

気軽に使える、軽量なWeb便利ツール集。シンプルなメモ帳、PDFの分割・結合・圧縮ツール、画像の一括リサイズツールを収録しています。
すべてブラウザ内で完結し、バックエンドはありません（メモは `localStorage` に保存。PDF・画像ファイルはサーバーに送信されません）。
```

「技術スタック」の PDF 処理の行の直後に追加する:

```markdown
- 画像処理: Canvas（`createImageBitmap`）によるリサイズ / [fflate](https://github.com/101arrowz/fflate)（ZIP の展開・作成）。完全クライアントサイドで動作
```

「開発」のコードブロックに `npm test` を追加する:

```bash
npm install      # 依存インストール
npm run dev      # 開発サーバ（http://localhost:5173）
npm test         # テスト（Node 標準の node --test。*.test.js を実行）
npm run build    # 本番ビルド → dist/
npm run preview  # ビルド成果物をローカル確認
```

「ディレクトリ構成」の `pdf/` ブロックの後（`download.js` の行の後）に追加する:

```
    image-resizer/         # 画像リサイズ（ZIP / 画像の一括リサイズ / 1ディレクトリ完結）
      ImageResizer.svelte  # 全体の枠と処理の制御（投入 → 処理 → 結果 → 再処理）
      imageResizer.svelte.js # 設定の永続化（画像そのものは保存しない）
      SettingsPanel.svelte # 基準サイズ・向きごとのルール・出力形式・ファイル名の設定
      DropZone.svelte      # ZIP と画像の D&D + ファイル選択
      ResultGallery.svelte # 結果のカード一覧（プレビュー・個別保存・失敗の表示）
      lib/                 # rune非依存の純ロジック（*.test.js は node --test で実行）
        settings.js        # 設定の既定値・検証・正規化
        dimensions.js      # 出力サイズと切り抜き範囲の計算
        naming.js          # 出力ファイル名・拡張子・重複回避・並べ替え
        filename.js        # ZIP 内の Shift_JIS ファイル名の救済
        zipio.js           # fflate の遅延ロード・ZIP の展開と作成
        input.js           # 投入ファイルの種類の判定
        format.js          # サイズ表示の整形
        process.js         # 1枚ずつの一括処理
        resize.js          # Canvas による段階的な縮小（ブラウザ専用）
        download.js        # Blob によるダウンロード
```

「localStorage キーの命名規約」の PDF の例の行の後に追加する:

```markdown
例（画像リサイズ）: `web-tools:image-resizer:settings:v1`（設定一式）
※ 画像ファイル本体も同様に保存せず、セッション中のみメモリ上に保持します。
```

- [ ] **Step 2: 元の HTML を削除する**

```bash
rm src/tools/image-resizer/zip_image_resizer.html
```

- [ ] **Step 3: 最終チェック**

Run: `npx prettier --write README.md && npm test && npm run lint && npm run build`
Expected: テストがすべて成功、Lint の指摘ゼロ（`zip_image_resizer.html` の警告も消える）、ビルド成功

- [ ] **Step 4: コミット**

```bash
git add README.md
git commit -m "docs: READMEに画像リサイズツールの説明を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
