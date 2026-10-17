/**
 * Uji unit validasi DEM (Mission 13 — Error Handling) — tanpa framework.
 * Jalankan:  node tests/test-error-handling.js
 * Keluar dengan kode != 0 bila ada kegagalan.
 */
'use strict';

const assert = require('node:assert');
const Validation = require('../validation.js');

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

// Kasus DEM valid meniru turunan Besuki (data/DATA_SOURCES.md sub-bab 1d):
// 1247 × 684 sel, EPSG:3857, ukuran 2.954.892 byte.
const VALID = {
  byteLength: 2954892,
  width: 1247,
  height: 684,
  resolution: [8.344380363942228, -8.344380363942228],
  origin: [12651390.699, -860731.179],
  epsg: 3857
};

test('DEM valid (meniru turunan Besuki) → ok', function () {
  const r = Validation.validateDemLayout(VALID);
  assert.deepStrictEqual(r, { ok: true });
});

test('info null → bad_structure', function () {
  const r = Validation.validateDemLayout(null);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'bad_structure');
});

test('ukuran berkas tidak finite → bad_structure', function () {
  const r = Validation.validateDemLayout(Object.assign({}, VALID, { byteLength: NaN }));
  assert.strictEqual(r.code, 'bad_structure');
});

test('byteLength di atas batas aplikasi → too_large_bytes + pesan menyebut batas', function () {
  const r = Validation.validateDemLayout(
    Object.assign({}, VALID, { byteLength: Validation.MAX_DEM_DOWNLOAD_BYTES + 1 })
  );
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'too_large_bytes');
  assert.ok(r.message.indexOf('terlalu besar') !== -1, 'pesan harus menyebut "terlalu besar"');
  assert.ok(r.message.indexOf('batas unduhan aplikasi') !== -1, 'pesan harus menyebut batas aplikasi');
});

test('byteLength tepat di batas aplikasi → ok (batas bersifat inklusif)', function () {
  const r = Validation.validateDemLayout(
    Object.assign({}, VALID, { byteLength: Validation.MAX_DEM_DOWNLOAD_BYTES }),
    { maxBytes: 1000 }
  );
  // Dengan maxBytes 1000, byteLength VALID (2954892) di atas batas:
  assert.strictEqual(r.code, 'too_large_bytes');
  const r2 = Validation.validateDemLayout(
    Object.assign({}, VALID, { byteLength: 1000 }),
    { maxBytes: 1000 }
  );
  assert.deepStrictEqual(r2, { ok: true });
});

test('width × height di atas batas sel → too_large_cells (sebelum readRasters)', function () {
  const r = Validation.validateDemLayout(
    Object.assign({}, VALID, { width: 6658, height: 6675 }),
    { maxCells: 20000000 }
  );
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'too_large_cells');
  assert.ok(r.message.indexOf('melebihi batas aplikasi') !== -1);
  assert.ok(r.message.indexOf('6.658') !== -1 || r.message.indexOf('6658') !== -1,
    'pesan menyebut dimensi file');
});

test('width nol / negatif / bukan integer → bad_structure', function () {
  assert.strictEqual(Validation.validateDemLayout(Object.assign({}, VALID, { width: 0 })).code, 'bad_structure');
  assert.strictEqual(Validation.validateDemLayout(Object.assign({}, VALID, { width: -5 })).code, 'bad_structure');
  assert.strictEqual(Validation.validateDemLayout(Object.assign({}, VALID, { width: 12.5 })).code, 'bad_structure');
  assert.strictEqual(Validation.validateDemLayout(Object.assign({}, VALID, { height: 0 })).code, 'bad_structure');
});

test('resolusi nol / NaN / hilang → bad_structure', function () {
  assert.strictEqual(
    Validation.validateDemLayout(Object.assign({}, VALID, { resolution: [0, -8.34] })).code,
    'bad_structure'
  );
  assert.strictEqual(
    Validation.validateDemLayout(Object.assign({}, VALID, { resolution: [NaN, -8.34] })).code,
    'bad_structure'
  );
  assert.strictEqual(
    Validation.validateDemLayout(Object.assign({}, VALID, { resolution: null })).code,
    'bad_structure'
  );
});

test('origin NaN / hilang → bad_structure', function () {
  assert.strictEqual(
    Validation.validateDemLayout(Object.assign({}, VALID, { origin: [NaN, -860731] })).code,
    'bad_structure'
  );
  assert.strictEqual(
    Validation.validateDemLayout(Object.assign({}, VALID, { origin: null })).code,
    'bad_structure'
  );
});

test('epsg 3857 → ok; epsg lain (mis. 32749) → crs_mismatch dengan pesan jelas', function () {
  assert.deepStrictEqual(Validation.validateDemLayout(VALID), { ok: true });
  const r = Validation.validateDemLayout(Object.assign({}, VALID, { epsg: 32749 }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'crs_mismatch');
  assert.ok(r.message.indexOf('EPSG:32749') !== -1, 'pesan menyebut CRS yang ditemukan');
  assert.ok(r.message.indexOf('EPSG:3857') !== -1, 'pesan menyebut CRS yang dibutuhkan');
});

test('epsg null / undefined → crs_unknown', function () {
  assert.strictEqual(Validation.validateDemLayout(Object.assign({}, VALID, { epsg: null })).code, 'crs_unknown');
  assert.strictEqual(
    Validation.validateDemLayout(Object.assign({}, VALID, { epsg: undefined })).code,
    'crs_unknown'
  );
});

test('semua pesan gagal: non-kosong, tanpa teks exception mentah, mengandung panduan', function () {
  const badCases = [
    Object.assign({}, VALID, { byteLength: Validation.MAX_DEM_DOWNLOAD_BYTES + 1 }),
    Object.assign({}, VALID, { width: 6658, height: 6675 }),
    Object.assign({}, VALID, { width: 0 }),
    Object.assign({}, VALID, { resolution: [0, 1] }),
    Object.assign({}, VALID, { origin: null }),
    Object.assign({}, VALID, { epsg: null }),
    Object.assign({}, VALID, { epsg: 32749 })
  ];
  const forbidden = [/TypeError/, /ReferenceError/, /undefined is not/, /Error:/, /at Object\./, /stack/];
  for (const info of badCases) {
    const r = Validation.validateDemLayout(info);
    assert.strictEqual(r.ok, false, 'kasus seharusnya gagal: ' + JSON.stringify(info).slice(0, 80));
    assert.ok(typeof r.message === 'string' && r.message.length > 40, 'pesan terlalu pendek/kosong');
    for (const re of forbidden) {
      assert.ok(!re.test(r.message), 'pesan mengandung teks exception mentah: ' + r.message);
    }
    assert.ok(/muat ulang|Periksa|Reprojeksi|Potong/i.test(r.message),
      'pesan harus menyebut tindakan yang bisa dilakukan pengguna');
  }
});

test('safePercent: total 0 → 0 (bukan NaN); normal → persentase benar', function () {
  assert.strictEqual(Validation.safePercent(0, 0), 0);
  assert.strictEqual(Number.isNaN(Validation.safePercent(0, 0)), false);
  assert.strictEqual(Validation.safePercent(3, 10), 30);
  assert.strictEqual(Validation.safePercent(852948, 852948), 100);
  assert.strictEqual(Validation.safePercent(NaN, 10), 0);
  assert.strictEqual(Validation.safePercent(1, NaN), 0);
  assert.strictEqual(Validation.safePercent(1, -5), 0);
});

test('safePercent pada simulasi semua-NoData (validCount 0): semua kelas 0%, tidak NaN', function () {
  const classCounts = [0, 0, 0, 0, 0, 0, 0];
  const validCount = 0;
  const percents = classCounts.map((c) => Validation.safePercent(c, validCount));
  for (const p of percents) {
    assert.strictEqual(p, 0);
    assert.strictEqual(Number.isNaN(p), false);
  }
});

test('konstanta batas aplikasi sesuai keputusan (50 MB, 20 juta sel, EPSG:3857)', function () {
  assert.strictEqual(Validation.MAX_DEM_DOWNLOAD_BYTES, 50 * 1024 * 1024);
  assert.strictEqual(Validation.MAX_DEM_CELLS, 20000000);
  assert.strictEqual(Validation.REQUIRED_EPSG, 3857);
});

test('ukuran file DEM induk dokumentasional (128.603.794 byte) terdeteksi terlalu besar', function () {
  // Induk DEMNAS_ok.tif (DATA_SOURCES.md 1b) — musti ditolak sebelum parsing.
  const r = Validation.validateDemLayout(Object.assign({}, VALID, { byteLength: 128603794 }));
  assert.strictEqual(r.code, 'too_large_bytes');
});

console.log('');
console.log(passed + ' PASS, ' + failed + ' FAIL');
if (failed > 0) process.exit(1);
