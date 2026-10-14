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
