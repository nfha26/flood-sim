/**
 * Uji unit model bathtub (Mission 06) + kontrol tinggi muka air (Mission 07) +
 * luas tergenang (Mission 08) — tanpa framework.
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

// --- Mission 08: luas tergenang dengan koreksi distorsi Web Mercator per baris ---
// Literal acuan dihitung independen dengan Python 3.12 + pyproj (WGS84) — lihat README/data/DATA_SOURCES.md.
const Y60 = 8399737.889818355;        // y Web Mercator pada lintang 60°
const CS = 1000;                       // ukuran sel uji (meter, mercator)
const NORTH_G1 = 8400237.889818355;    // 2 baris: baris 0 di lintang 60°, baris 1 di selatannya

function relDiff(a, b) {
  return Math.abs(a - b) / Math.abs(b);
}

function assertClose(actual, expected, tol, label) {
  assert.ok(relDiff(actual, expected) <= tol, label + ': ' + actual + ' vs ' + expected);
}

test('luas sel Mercator: di ekuator cos^2 = 1 -> luas = cellSize^2', function () {
  assert.strictEqual(Bathtub.mercatorGroundCellArea(0, 1000), 1000000);
});

test('luas sel Mercator: lintang 60 derajat -> 0,25 x cellSize^2 (literal Python)', function () {
  assertClose(Bathtub.mercatorGroundCellArea(Y60, 1000), 250000.00000000032, 1e-12, 'area@60');
});

test('luas sel Mercator: input tidak valid -> null', function () {
  assert.strictEqual(Bathtub.mercatorGroundCellArea(NaN, 1000), null);
  assert.strictEqual(Bathtub.mercatorGroundCellArea(0, 0), null);
  assert.strictEqual(Bathtub.mercatorGroundCellArea(0, -5), null);
  assert.strictEqual(Bathtub.mercatorGroundCellArea('0', 1000), null);
});

test('computeFloodedArea: grid 2x3 manual (literal Python) + pct', function () {
  const elevation = [0, 0, 0, 0, 0, 0];
  const mask = [1, 1, 0, 1, 0, 0];
  const grid = { width: 3, height: 2, cellSize: CS, north: NORTH_G1 };
  const r = Bathtub.computeFloodedArea(elevation, mask, NODATA, grid);
  assert.ok(r, 'hasil tidak null');
  assert.strictEqual(r.floodedCells, 3);
  assert.strictEqual(r.validCells, 6);
  assertClose(r.floodedAreaM2, 750067.897835868, 1e-9, 'floodedAreaM2');
  assertClose(r.validAreaM2, 1500203.693507603, 1e-9, 'validAreaM2');
  assertClose(r.pctFlooded, 49.99773704610378, 1e-9, 'pctFlooded');
});

test('computeFloodedArea: koreksi per baris (baris selatan lebih luas di lintang ini)', function () {
  const elevation = [0, 0, 0, 0, 0, 0];
  const grid = { width: 3, height: 2, cellSize: CS, north: NORTH_G1 };
  const top = Bathtub.computeFloodedArea(elevation, [1, 1, 0, 0, 0, 0], NODATA, grid);
  const bottom = Bathtub.computeFloodedArea(elevation, [0, 0, 0, 1, 1, 0], NODATA, grid);
  assert.ok(bottom.floodedAreaM2 > top.floodedAreaM2, 'baris selatan harus lebih luas');
  assertClose(bottom.floodedAreaM2 - top.floodedAreaM2, 135.79567173396, 1e-6, 'selisih baris');
});

test('computeFloodedArea: penyebut = luas sel valid (NoData keluar dari pembilang & penyebut)', function () {
  const grid = { width: 2, height: 1, cellSize: CS, north: 500 };
  const withNd = Bathtub.computeFloodedArea([0, NODATA], [1, 1], NODATA, grid);
  assert.strictEqual(withNd.floodedCells, 1);
  assert.strictEqual(withNd.validCells, 1);
  assertClose(withNd.pctFlooded, 100, 1e-12, 'pct dengan NoData');
  const both = Bathtub.computeFloodedArea([0, 5], [1, 0], NODATA, grid);
  assert.strictEqual(both.validCells, 2);
  assertClose(both.pctFlooded, 50, 1e-12, 'pct 2 sel valid');
});

test('computeFloodedArea: input tidak valid -> null', function () {
  const g = { width: 2, height: 2, cellSize: 10, north: 0 };
  assert.strictEqual(Bathtub.computeFloodedArea([1, 2, 3], [1, 1, 1], NODATA, g), null);
  assert.strictEqual(Bathtub.computeFloodedArea([1, 2, 3, 4], [1, 1, 1], NODATA, g), null);
  assert.strictEqual(Bathtub.computeFloodedArea([1, 2, 3, 4], [1, 1, 1, 1], NODATA, null), null);
  assert.strictEqual(
    Bathtub.computeFloodedArea([1, 2, 3, 4], [1, 1, 1, 1], NODATA, { width: 2, height: 2, cellSize: 0, north: 0 }),
    null
  );
  assert.strictEqual(
    Bathtub.computeFloodedArea([1, 2, 3, 4], [1, 1, 1, 1], NODATA, { width: 2.5, height: 2, cellSize: 10, north: 0 }),
    null
  );
});

test('luas tergenang monoton tidak menurun saat WL naik (grid4, 4x4)', function () {
  const grid = { width: 4, height: 4, cellSize: CS, north: 2000 };
  let prev = -1;
  for (const wl of [-1, 0, 2.5, 5, 10, 25, 40]) {
    const f = Bathtub.computeFloodMask(grid4, G_ND, wl);
    const a = Bathtub.computeFloodedArea(grid4, f.mask, G_ND, grid);
    assert.ok(a.floodedAreaM2 >= prev, 'WL ' + wl + ': ' + a.floodedAreaM2 + ' < ' + prev);
    prev = a.floodedAreaM2;
  }
});

test('DEM-shaped: luas sel valid 1247x684 == literal Python (852.948 sel)', function () {
  const width = 1247;
  const height = 684;
  const grid = { width: width, height: height, cellSize: 8.344380363942228, north: -860731.179 };
  const elevation = new Float32Array(width * height);
  const mask = new Uint8Array(width * height).fill(1);
  const r = Bathtub.computeFloodedArea(elevation, mask, NODATA, grid);
  assert.ok(r, 'hasil tidak null');
  assert.strictEqual(r.validCells, 852948);
  assertClose(r.validAreaM2, 58314049.78912939, 1e-9, 'validAreaM2');
  assert.strictEqual(r.pctFlooded, 100);
});

test('setara: per-baris vs satu-lintang-tengah (selisih relatif < 1e-6)', function () {
  const width = 1247;
  const height = 684;
  const cs = 8.344380363942228;
  const north = -860731.179;
  const elevation = new Float32Array(width * height);
  const mask = new Uint8Array(width * height).fill(1);
  const perRow = Bathtub.computeFloodedArea(
    elevation, mask, NODATA, { width: width, height: height, cellSize: cs, north: north }
  ).validAreaM2;
  const single = Bathtub.mercatorGroundCellArea(north - 0.5 * height * cs, cs) * width * height;
  assert.ok(relDiff(single, perRow) < 1e-6, 'selisih relatif ' + relDiff(single, perRow));
});

console.log('');
console.log(passed + ' PASS, ' + failed + ' FAIL');
process.exit(failed > 0 ? 1 : 0);
