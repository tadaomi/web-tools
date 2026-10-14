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
