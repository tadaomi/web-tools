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
