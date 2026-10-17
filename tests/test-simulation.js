/**
 * Uji unit model bathtub (Mission 06) — tanpa framework.
 * Jalankan:  node tests/test-simulation.js
 * Keluar dengan kode != 0 bila ada kegagalan.
 */
'use strict';

const assert = require('node:assert');
const Bathtub = require('../simulation.js');

const NODATA = -3.4028234663852886e38;
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('PASS  ' + name);
  } catch (error) {
    failed++;
    console.error('FAIL  ' + name);
    console.error('      ' + error.message);
  }
}

function maskOf(result) {
  return Array.from(result.mask);
}

// --- Grid uji 3x3, nilai diketahui, WL = 5 (kunci "=" diuji lewat sel bernilai 5)
const grid = [1, 2, 3, 4, NODATA, 5, -2, 8, 9];
const EXPECTED_MASK_WL5 = [1, 1, 1, 1, 0, 1, 1, 0, 0];

test('grid 3x3 WL=5: mask == hasil hitung tangan (<= termasuk, NoData=0, sel negatif ikut)', function () {
  const r = Bathtub.computeFloodMask(grid, NODATA, 5);
  assert.ok(r, 'hasil tidak null');
  assert.deepStrictEqual(maskOf(r), EXPECTED_MASK_WL5);
  assert.strictEqual(r.floodedCount, 6);
  assert.strictEqual(r.validCount, 8);
  assert.strictEqual(r.nodataCount, 1);
});

test('WL = 5 memakai <= : sel bernilai tepat 5 ikut tergenang', function () {
  const r = Bathtub.computeFloodMask([5], NODATA, 5);
  assert.strictEqual(r.mask[0], 1);
  const r2 = Bathtub.computeFloodMask([5.0001], NODATA, 5);
  assert.strictEqual(r2.mask[0], 0);
});

test('WL di bawah semua nilai: tidak ada sel tergenang', function () {
  const r = Bathtub.computeFloodMask(grid, NODATA, -3);
  assert.deepStrictEqual(maskOf(r), [0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.strictEqual(r.floodedCount, 0);
  assert.strictEqual(r.validCount, 8);
});

test('WL >= semua nilai: semua sel valid tergenang, NoData tetap 0', function () {
  const r = Bathtub.computeFloodMask(grid, NODATA, 9);
  assert.deepStrictEqual(maskOf(r), [1, 1, 1, 1, 0, 1, 1, 1, 1]);
  assert.strictEqual(r.floodedCount, 8);
  assert.strictEqual(r.nodataCount, 1);
});

test('sel NaN dikecualikan (bukan tergenang, bukan dianggap elevasi 0)', function () {
  const r = Bathtub.computeFloodMask([NaN, -100], NODATA, -50);
  assert.deepStrictEqual(maskOf(r), [0, 1]);
  assert.strictEqual(r.nodataCount, 1);
  assert.strictEqual(r.floodedCount, 1);
});

test('sel ±Infinity dikecualikan sebagai non-finite', function () {
  const r = Bathtub.computeFloodMask([Infinity, -Infinity], NODATA, 0);
  assert.deepStrictEqual(maskOf(r), [0, 0]);
  assert.strictEqual(r.nodataCount, 2);
});

test('keputusan A: sel bernilai <= 0 ikut aturan biasa (tergenang bila elevasi <= WL)', function () {
  const r = Bathtub.computeFloodMask([-4.4267, -0.0004, 0], NODATA, 0);
  assert.deepStrictEqual(maskOf(r), [1, 1, 1]);
  assert.strictEqual(r.floodedCount, 3);
});

test('waterLevel NaN / string / null / undefined mengembalikan null', function () {
  assert.strictEqual(Bathtub.computeFloodMask(grid, NODATA, NaN), null);
  assert.strictEqual(Bathtub.computeFloodMask(grid, NODATA, '5'), null);
  assert.strictEqual(Bathtub.computeFloodMask(grid, NODATA, null), null);
  assert.strictEqual(Bathtub.computeFloodMask(grid, NODATA, undefined), null);
});

test('elevation kosong / bukan array mengembalikan null', function () {
  assert.strictEqual(Bathtub.computeFloodMask([], NODATA, 5), null);
  assert.strictEqual(Bathtub.computeFloodMask(null, NODATA, 5), null);
});

test('menerima Float32Array seperti yang dibaca geotiff.js', function () {
  const data = Float32Array.from([1.5, 4, NODATA]);
  const r = Bathtub.computeFloodMask(data, NODATA, 3);
  assert.deepStrictEqual(maskOf(r), [1, 0, 0]);
  assert.strictEqual(r.nodataCount, 1);
});

test('invarian jumlah sel: flooded + nodata + (valid - flooded) == panjang array', function () {
  const r = Bathtub.computeFloodMask(grid, NODATA, 5);
  assert.strictEqual(r.floodedCount + r.nodataCount + (r.validCount - r.floodedCount), grid.length);
});

test('nodataValue null (tanpa tag NoData) tidak mengecualikan sel angka biasa', function () {
  const r = Bathtub.computeFloodMask([1, 2], null, 1);
  assert.deepStrictEqual(maskOf(r), [1, 0]);
  assert.strictEqual(r.nodataCount, 0);
});

// --- Mission 07: multi-level pada grid 4x4 dengan hitungan tangan ---
const G_ND = -3.4028234663852886e38;
const grid4 = [
  -4, -1, 0, 2,
  3, G_ND, 5, 10,
  12, 15, -2, 20,
  25, 30, 0, 40
];

const MULTI_LEVEL = [
  {
    wl: -1,
    mask: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    flooded: 3
  },
  {
    wl: 0,
    mask: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    flooded: 5
  },
  {
    wl: 2.5,
    mask: [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    flooded: 6
  },
  {
    wl: 5,
    mask: [1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    flooded: 8
  },
  {
    wl: 10,
    mask: [1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0],
    flooded: 9
  }
];

for (const c of MULTI_LEVEL) {
  test('grid 4x4 WL=' + c.wl + ': mask == hitungan tangan', function () {
    const r = Bathtub.computeFloodMask(grid4, G_ND, c.wl);
    assert.deepStrictEqual(maskOf(r), c.mask);
    assert.strictEqual(r.floodedCount, c.flooded);
    assert.strictEqual(r.validCount, 15);
    assert.strictEqual(r.nodataCount, 1);
  });
}

test('monoton: floodedCount tidak menurun saat WL naik (-1..40)', function () {
  const levels = [-1, 0, 2.5, 5, 10, 25, 40];
  let prev = -1;
  for (const wl of levels) {
    const r = Bathtub.computeFloodMask(grid4, G_ND, wl);
    assert.ok(r.floodedCount >= prev, 'WL ' + wl + ': ' + r.floodedCount + ' < ' + prev);
    prev = r.floodedCount;
  }
  assert.strictEqual(Bathtub.computeFloodMask(grid4, G_ND, 40).floodedCount, 15);
});

// --- Mission 07: parseWaterLevel ---
const P_MIN = -5;
const P_MAX = 238;

test('parseWaterLevel: angka valid', function () {
  assert.deepStrictEqual(Bathtub.parseWaterLevel('5', P_MIN, P_MAX), { ok: true, value: 5, reason: null });
  assert.deepStrictEqual(Bathtub.parseWaterLevel('3.7', P_MIN, P_MAX), { ok: true, value: 3.7, reason: null });
  assert.deepStrictEqual(Bathtub.parseWaterLevel(5, P_MIN, P_MAX), { ok: true, value: 5, reason: null });
});

test('parseWaterLevel: batas rentang inklusif', function () {
  assert.deepStrictEqual(Bathtub.parseWaterLevel('-5', P_MIN, P_MAX), { ok: true, value: -5, reason: null });
  assert.deepStrictEqual(Bathtub.parseWaterLevel('238', P_MIN, P_MAX), { ok: true, value: 238, reason: null });
});

test('parseWaterLevel: kosong', function () {
  assert.deepStrictEqual(Bathtub.parseWaterLevel('', P_MIN, P_MAX), { ok: false, value: null, reason: 'empty' });
  assert.deepStrictEqual(Bathtub.parseWaterLevel('   ', P_MIN, P_MAX), { ok: false, value: null, reason: 'empty' });
  assert.deepStrictEqual(Bathtub.parseWaterLevel(null, P_MIN, P_MAX), { ok: false, value: null, reason: 'empty' });
  assert.deepStrictEqual(Bathtub.parseWaterLevel(undefined, P_MIN, P_MAX), { ok: false, value: null, reason: 'empty' });
});

test('parseWaterLevel: bukan angka (termasuk koma desimal)', function () {
  assert.deepStrictEqual(Bathtub.parseWaterLevel('abc', P_MIN, P_MAX), { ok: false, value: null, reason: 'nan' });
  assert.deepStrictEqual(Bathtub.parseWaterLevel('5,5', P_MIN, P_MAX), { ok: false, value: null, reason: 'nan' });
});

test('parseWaterLevel: di luar rentang -> di-clamp dengan reason', function () {
  assert.deepStrictEqual(Bathtub.parseWaterLevel('-100', P_MIN, P_MAX), { ok: false, value: -5, reason: 'below' });
  assert.deepStrictEqual(Bathtub.parseWaterLevel('999', P_MIN, P_MAX), { ok: false, value: 238, reason: 'above' });
});

console.log('');
console.log(passed + ' PASS, ' + failed + ' FAIL');
process.exit(failed > 0 ? 1 : 0);
