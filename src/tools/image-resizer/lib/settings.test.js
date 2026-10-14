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
