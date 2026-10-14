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
