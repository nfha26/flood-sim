/**
 * Model bathtub sederhana — fungsi murni, tanpa dependensi peta/DOM.
 * DEFINISI (SPEC.md): tergenang(sel) = elevasi(sel) <= tinggi_muka_air
 * Sel NoData dan sel non-finite dikecualikan — TIDAK PERNAH dianggap elevasi 0.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Bathtub = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Radius bola Web Mercator (EPSG:3857), meter.
  var MERCATOR_RADIUS = 6378137;

  function computeFloodMask(elevation, nodataValue, waterLevel) {
    if (!elevation || typeof elevation.length !== 'number' || elevation.length === 0) {
      return null;
    }
    if (typeof waterLevel !== 'number' || !Number.isFinite(waterLevel)) {
      return null;
    }

    const mask = new Uint8Array(elevation.length);
    let floodedCount = 0;
    let validCount = 0;
    let nodataCount = 0;

    for (let i = 0; i < elevation.length; i++) {
      const v = elevation[i];
      const isNoData = !Number.isFinite(v) || v === nodataValue;
      if (isNoData) {
        nodataCount++;
        continue;
      }
      validCount++;
      if (v <= waterLevel) {
        mask[i] = 1;
        floodedCount++;
      }
    }

    return { mask: mask, floodedCount: floodedCount, validCount: validCount, nodataCount: nodataCount };
  }

  /**
   * Luas permukaan tanah satu sel pada satu baris (m²), dengan koreksi distorsi Web Mercator.
   * EPSG:3857 adalah Mercator bola (R = 6378137 m): 1 m peta = cos(lat) m permukaan tanah pada
   * SEMUA arah, sehingga luas tanah = luas peta × cos²(lat).
   * yCenter = koordinat y Web Mercator (meter) di titik tengah baris; cellSize = ukuran sel (meter).
   */
  function mercatorGroundCellArea(yCenter, cellSize) {
    if (!Number.isFinite(yCenter) || !Number.isFinite(cellSize) || cellSize <= 0) {
      return null;
    }
    const lat = 2 * Math.atan(Math.exp(yCenter / MERCATOR_RADIUS)) - Math.PI / 2;
    const c = Math.cos(lat);
    return cellSize * cellSize * c * c;
  }

  /**
   * Luas tergenang & luas sel valid dari mask genangan, dengan koreksi distorsi Mercator per baris.
   * grid = { width, height, cellSize, north }: sel persegi cellSize meter, baris berurutan dari
   * utara (y = north) ke selatan; titik tengah baris ke-i: y = north - (i + 0.5) × cellSize.
   * Validitas sel dinilai dari elevation + nodataValue (NoData dikecualikan dari pembilang DAN
   * penyebut). Genangan dibaca dari mask hasil computeFloodMask.
   * pctFlooded = luas tergenang / luas sel valid × 100 (penyebut: seluruh sel valid DEM).
   */
  function computeFloodedArea(elevation, mask, nodataValue, grid) {
    if (!elevation || !mask ||
        typeof elevation.length !== 'number' || typeof mask.length !== 'number' ||
        elevation.length === 0 || elevation.length !== mask.length) {
      return null;
    }
    if (!grid ||
        !Number.isInteger(grid.width) || !Number.isInteger(grid.height) ||
        grid.width <= 0 || grid.height <= 0 ||
        !Number.isFinite(grid.cellSize) || grid.cellSize <= 0 ||
        !Number.isFinite(grid.north)) {
      return null;
    }
    const width = grid.width;
    const height = grid.height;
    if (width * height !== elevation.length) {
      return null;
    }

    let floodedCells = 0;
    let validCells = 0;
    let floodedAreaM2 = 0;
    let validAreaM2 = 0;

    for (let row = 0; row < height; row++) {
      const rowArea = mercatorGroundCellArea(grid.north - (row + 0.5) * grid.cellSize, grid.cellSize);
      if (rowArea === null) {
        return null;
      }
      const base = row * width;
      let floodedInRow = 0;
      let validInRow = 0;
      for (let col = 0; col < width; col++) {
        const idx = base + col;
        const value = elevation[idx];
        if (!Number.isFinite(value) || value === nodataValue) {
          continue;
        }
        validInRow++;
        if (mask[idx]) {
          floodedInRow++;
        }
      }
      floodedCells += floodedInRow;
      validCells += validInRow;
      floodedAreaM2 += floodedInRow * rowArea;
      validAreaM2 += validInRow * rowArea;
    }

    return {
      floodedCells: floodedCells,
      validCells: validCells,
      floodedAreaM2: floodedAreaM2,
      validAreaM2: validAreaM2,
      pctFlooded: validAreaM2 > 0 ? (floodedAreaM2 / validAreaM2) * 100 : 0
    };
  }

  function parseWaterLevel(raw, min, max) {
    if (typeof min !== 'number' || !Number.isFinite(min) ||
        typeof max !== 'number' || !Number.isFinite(max) || min > max) {
      return { ok: false, value: null, reason: 'nan' };
    }
    if (raw === null || raw === undefined) {
      return { ok: false, value: null, reason: 'empty' };
    }
    const s = String(raw).trim();
    if (s === '') {
      return { ok: false, value: null, reason: 'empty' };
    }
    const n = Number(s);
    if (!Number.isFinite(n)) {
      return { ok: false, value: null, reason: 'nan' };
    }
    if (n < min) {
      return { ok: false, value: min, reason: 'below' };
    }
    if (n > max) {
      return { ok: false, value: max, reason: 'above' };
    }
    return { ok: true, value: n, reason: null };
  }

  return {
    MERCATOR_RADIUS: MERCATOR_RADIUS,
    computeFloodMask: computeFloodMask,
    computeFloodedArea: computeFloodedArea,
    mercatorGroundCellArea: mercatorGroundCellArea,
    parseWaterLevel: parseWaterLevel
  };
});
