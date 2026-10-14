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
