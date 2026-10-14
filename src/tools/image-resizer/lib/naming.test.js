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
