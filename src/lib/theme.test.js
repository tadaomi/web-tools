import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme, toggleTheme } from './theme.js';

test('resolveTheme: 未選択なら OS の設定に従う', () => {
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
});

test('resolveTheme: 選択済みなら OS の設定より優先する', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
});

test('resolveTheme: 不正な保存値は未選択として扱う', () => {
  assert.equal(resolveTheme('blue', true), 'dark');
  assert.equal(resolveTheme(undefined, false), 'light');
});

test('toggleTheme: いま表示している配色の反対に固定する', () => {
  assert.equal(toggleTheme(null, true), 'light');
  assert.equal(toggleTheme(null, false), 'dark');
  assert.equal(toggleTheme('light', true), 'dark');
  assert.equal(toggleTheme('dark', true), 'light');
});
