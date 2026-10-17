/**
 * Validasi struktur/ukuran DEM — fungsi murni, tanpa dependensi DOM/peta.
 * Dipakai app.js (browser) dan tests/test-error-handling.js (Node).
 * Batas di bawah adalah BATAS APLIKASI (keputusan performa), bukan klaim data.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Validation = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Batas unduhan berkas mentah (byte). Cek dilakukan SEBELUM parsing.
  var MAX_DEM_DOWNLOAD_BYTES = 50 * 1024 * 1024;
  // Batas jumlah sel raster (width × height). Cek dilakukan SETELAH header
  // dibaca tapi SEBELUM readRasters, agar halaman tidak membeku.
  var MAX_DEM_CELLS = 20000000;
  var REQUIRED_EPSG = 3857;

  function formatIdNumber(value) {
    return new Intl.NumberFormat('id-ID').format(value);
  }

  /**
   * info = {
   *   byteLength, width, height, resolution: [rx, ry], origin: [x, y],
   *   epsg: number|null, maxBytes?, maxCells?
   * }
   * Mengembalikan { ok: true } atau { ok: false, code, message }.
   * code: 'too_large_bytes' | 'too_large_cells' | 'bad_structure' |
   *       'crs_mismatch' | 'crs_unknown'
   */
  function validateDemLayout(info, limits) {
    var maxBytes = (limits && limits.maxBytes) || MAX_DEM_DOWNLOAD_BYTES;
    var maxCells = (limits && limits.maxCells) || MAX_DEM_CELLS;

    if (!info || typeof info.byteLength !== 'number' || !Number.isFinite(info.byteLength) ||
        info.byteLength < 0) {
      return {
        ok: false,
        code: 'bad_structure',
        message:
          'Struktur file DEM tidak sesuai yang diharapkan (ukuran berkas tidak terbaca), ' +
          'sehingga layer elevasi tidak ditampilkan. Periksa file DEM Anda; ' +
          'data/DATA_SOURCES.md menjelaskan format yang didukung. Peta tetap dapat digunakan.'
      };
    }
    if (info.byteLength > maxBytes) {
      return {
        ok: false,
        code: 'too_large_bytes',
        message:
          'File DEM terlalu besar untuk aplikasi web ini: ' + formatIdNumber(info.byteLength) +
          ' byte (batas unduhan aplikasi ' + formatIdNumber(maxBytes) +
          ' byte / 50 MB). Potong (clip) DEM ke wilayah studi yang lebih kecil — ' +
          'metode terdokumentasi di data/DATA_SOURCES.md sub-bab 1d — lalu muat ulang halaman. ' +
          'Pemrosesan dihentikan agar halaman tidak membeku; peta tetap dapat digunakan.'
      };
    }

    var width = info.width;
    var height = info.height;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      return {
        ok: false,
        code: 'bad_structure',
        message:
          'Struktur file DEM tidak sesuai yang diharapkan (dimensi raster tidak valid), ' +
          'sehingga layer elevasi tidak ditampilkan. Periksa file DEM Anda; ' +
          'data/DATA_SOURCES.md menjelaskan format yang didukung. Peta tetap dapat digunakan.'
      };
    }

    var resolution = info.resolution;
    if (!resolution || resolution.length < 2 ||
        !Number.isFinite(resolution[0]) || !Number.isFinite(resolution[1]) ||
        resolution[0] === 0 || resolution[1] === 0) {
      return {
        ok: false,
        code: 'bad_structure',
        message:
          'Struktur file DEM tidak sesuai yang diharapkan (resolusi sel tidak valid), ' +
          'sehingga layer elevasi tidak ditampilkan. Periksa file DEM Anda; ' +
          'data/DATA_SOURCES.md menjelaskan format yang didukung. Peta tetap dapat digunakan.'
      };
    }

    var origin = info.origin;
    if (!origin || origin.length < 2 ||
        !Number.isFinite(origin[0]) || !Number.isFinite(origin[1])) {
      return {
        ok: false,
        code: 'bad_structure',
        message:
          'Struktur file DEM tidak sesuai yang diharapkan (koordinat asal tidak valid), ' +
          'sehingga layer elevasi tidak ditampilkan. Periksa file DEM Anda; ' +
          'data/DATA_SOURCES.md menjelaskan format yang didukung. Peta tetap dapat digunakan.'
      };
    }

    var cellCount = width * height;
    if (cellCount > maxCells) {
      return {
        ok: false,
        code: 'too_large_cells',
        message:
          'Resolusi file DEM ' + width + ' × ' + height + ' = ' + formatIdNumber(cellCount) +
          ' sel melebihi batas aplikasi ' + formatIdNumber(maxCells) +
          ' sel. Potong (clip) DEM ke wilayah studi yang lebih kecil — metode terdokumentasi ' +
          'di data/DATA_SOURCES.md sub-bab 1d — lalu muat ulang halaman. ' +
          'Pemrosesan dihentikan agar halaman tidak membeku; peta tetap dapat digunakan.'
      };
    }

    if (info.epsg === null || info.epsg === undefined) {
      return {
        ok: false,
        code: 'crs_unknown',
        message:
          'CRS file DEM tidak terbaca dari file, sehingga posisi layer di peta tidak dapat ' +
          'dipastikan dan layer elevasi tidak ditampilkan. Sistem koordinat yang didukung ' +
          'adalah EPSG:3857 (WGS 84 / Pseudo-Mercator). Periksa file DEM Anda — ' +
          'data/DATA_SOURCES.md menjelaskan format yang didukung — lalu muat ulang halaman. ' +
          'Peta tetap dapat digunakan.'
      };
    }
    if (info.epsg !== REQUIRED_EPSG) {
      return {
        ok: false,
        code: 'crs_mismatch',
        message:
          'CRS file DEM adalah EPSG:' + info.epsg + ', sedangkan layer membutuhkan EPSG:' +
          REQUIRED_EPSG + ' agar posisinya benar di peta. Layer elevasi tidak ditampilkan ' +
          'untuk menghindari posisi yang salah. Reproyeksi file ke EPSG:' + REQUIRED_EPSG +
          ' (metode terdokumentasi di data/DATA_SOURCES.md sub-bab 1d) lalu muat ulang halaman. ' +
          'Peta tetap dapat digunakan.'
      };
    }

    return { ok: true };
  }

  /**
   * Persentase aman: total 0 → 0 (bukan NaN).
   */
  function safePercent(count, total) {
    if (!Number.isFinite(count) || !Number.isFinite(total) || total <= 0) return 0;
    return (count / total) * 100;
  }

  return {
    validateDemLayout: validateDemLayout,
    safePercent: safePercent,
    MAX_DEM_DOWNLOAD_BYTES: MAX_DEM_DOWNLOAD_BYTES,
    MAX_DEM_CELLS: MAX_DEM_CELLS,
    REQUIRED_EPSG: REQUIRED_EPSG
  };
});
