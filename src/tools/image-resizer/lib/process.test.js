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
