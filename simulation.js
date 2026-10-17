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

  return { computeFloodMask: computeFloodMask };
});
