// --- Papan pesan status (Mission 13 — Error Handling) ---
// Mendukung beberapa pesan (dedupe), varian error/info, dan tombol Tutup.
// Papan pesan ini adalah satu-satunya tempat pesan kesalahan; tanpa teks exception mentah.
const statusEl = document.getElementById('map-status');
const statusListEl = document.getElementById('map-status-list');
const statusCloseEl = document.getElementById('map-status-close');
const statusEntries = [];

function renderStatus() {
  statusListEl.innerHTML = '';
  if (statusEntries.length === 0) {
    statusEl.hidden = true;
    statusEl.classList.remove('map-status-error', 'map-status-info');
    return;
  }
  for (const entry of statusEntries) {
    const li = document.createElement('li');
    li.textContent = entry.message;
    statusListEl.appendChild(li);
  }
  const hasError = statusEntries.some((entry) => entry.type === 'error');
  statusEl.classList.toggle('map-status-error', hasError);
  statusEl.classList.toggle('map-status-info', !hasError);
  statusEl.hidden = false;
}

function showStatus(message, type) {
  const entryType = type === 'info' ? 'info' : 'error';
  if (statusEntries.some((entry) => entry.message === message)) return;
  statusEntries.push({ message: message, type: entryType });
  renderStatus();
}

function clearStatus() {
  statusEntries.length = 0;
  renderStatus();
}

if (statusCloseEl) {
  statusCloseEl.addEventListener('click', clearStatus);
}

// Guard: pustaka CDN gagal dimuat → jelaskan, jangan biarkan halaman kosong tanpa keterangan.
if (typeof L === 'undefined') {
  showStatus(
    'Pustaka peta (Leaflet) gagal dimuat dari CDN — peta tidak dapat ditampilkan tanpa ' +
    'pustaka ini. Periksa koneksi internet, nonaktifkan pemblokir (adblocker/VPN), lalu ' +
    'muat ulang halaman. Judul dan pemberitahuan di halaman ini tetap dapat dibaca.',
    'error'
  );
} else if (typeof Validation === 'undefined') {
  showStatus(
    'Pustaka validasi (validation.js) tidak termuat sehingga pemeriksaan file DEM berhenti. ' +
    'Periksa berkas validation.js ada di folder proyek, lalu muat ulang halaman.',
    'error'
  );
} else {
  initApp();
}

function initApp() {
  const map = L.map('map').setView([-2.5, 118], 5);

  // Mission 14 — Responsive Layout: hitung ulang ukuran peta saat jendela berubah.
  // Hanya invalidateSize (pan: false); tanpa fitBounds agar posisi/zoom pilihan pengguna tidak direset.
  // Ambang 900 sama dengan breakpoint di styles.css.
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      map.invalidateSize({ pan: false, debounceMoveend: true });
    }, 150);
  });

  const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  osmLayer.on('tileerror', () => {
    showStatus(
      'Tile OpenStreetMap gagal dimuat (kemungkinan jaringan offline) — peta dasar tidak ' +
      'tampil. Layer DEM, genangan, dan semua kontrol tetap berfungsi; tile dicoba ulang ' +
      'otomatis saat peta digeser atau di-zoom.',
      'info'
    );
  });

  osmLayer.addTo(map);

  const DEM_URL = 'data/DEMNAS_ok_besuki.geotiff';
  const KNOWN_NODATA_FALLBACK = -3.4028234663852886e38;

  // Nilai awal tinggi muka air skenario (nilai DEM sumber).
  // Rentang kontrol diturunkan dari min/maks DEM terverifikasi saat runtime — lihat initWaterLevelControls.
  const DEFAULT_WATER_LEVEL = 5;
  const FLOOD_COLOR = '#1565c0';
  const FLOOD_ALPHA = 0.55;

  function toLatLng(x, y) {
    return L.CRS.EPSG3857.unproject(L.point(x, y));
  }

  function formatNumber(value, digits) {
    return Number(value).toFixed(digits);
  }

  function buildMetadataList(rows) {
    const list = document.getElementById('dem-meta-list');
    list.innerHTML = '';
    for (const [term, description] of rows) {
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.textContent = description;
      list.appendChild(dt);
      list.appendChild(dd);
    }
  }

  // Saat DEM gagal dimuat/divalidasi: sembunyikan kontrol yang listener-nya
  // belum terpasang, dan isi panel metadata dengan penjelasan (bukan kosong).
  function setDemUnavailable(note) {
    document.getElementById('layers-section').hidden = true;
    buildMetadataList([]);
    document.getElementById('dem-meta-note').textContent = note;
    document.getElementById('dem-meta').hidden = false;
  }

  const ELEV_BREAKS = [0, 10, 25, 50, 100, 150];
  const ELEV_COLORS = ['#264b5d', '#8fce8f', '#41ab5d', '#d9cf5a', '#e09b3c', '#a8642a', '#6f4423'];

  function classIndexFor(value) {
    for (let i = 0; i < ELEV_BREAKS.length; i++) {
      if (value <= ELEV_BREAKS[i]) return i;
    }
    return ELEV_BREAKS.length;
  }

  function classLabel(index) {
    if (index === 0) return '≤ ' + ELEV_BREAKS[0];
    if (index === ELEV_BREAKS.length) return '> ' + ELEV_BREAKS[ELEV_BREAKS.length - 1];
    return ELEV_BREAKS[index - 1] + ' – ' + ELEV_BREAKS[index];
  }

  function hexToRgb(hex) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    ];
  }

  function renderElevation(data, width, height, nodata) {
    let min = Infinity;
    let max = -Infinity;
    let nodataCount = 0;
    let validCount = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (Number.isNaN(v) || v === nodata) {
        nodataCount++;
        continue;
      }
      validCount++;
      if (v < min) min = v;
      if (v > max) max = v;
    }

    const classRgb = ELEV_COLORS.map(hexToRgb);
    const classCounts = new Array(ELEV_COLORS.length).fill(0);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      const p = i * 4;
      if (Number.isNaN(v) || v === nodata) {
        imageData.data[p + 3] = 0;
        continue;
      }
      const cls = classIndexFor(v);
      classCounts[cls]++;
      const rgb = classRgb[cls];
      imageData.data[p] = rgb[0];
      imageData.data[p + 1] = rgb[1];
      imageData.data[p + 2] = rgb[2];
      imageData.data[p + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    return {
      url: canvas.toDataURL('image/png'),
      min,
      max,
      validCount,
      nodataCount,
      classCounts
    };
  }

  function renderFloodMask(mask, width, height) {
    const rgb = hexToRgb(FLOOD_COLOR);
    const alpha = Math.round(FLOOD_ALPHA * 255);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i]) continue;
      const p = i * 4;
      imageData.data[p] = rgb[0];
      imageData.data[p + 1] = rgb[1];
      imageData.data[p + 2] = rgb[2];
      imageData.data[p + 3] = alpha;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  function refreshLegendPanel() {
    const elevHidden = document.getElementById('elev-legend-section').hidden;
    const floodHidden = document.getElementById('flood-legend-section').hidden;
    document.getElementById('dem-legend').hidden = elevHidden && floodHidden;
  }

  function buildLegend(elevation) {
    const rowsEl = document.getElementById('legend-rows');
    rowsEl.innerHTML = '';
    const hasValid = elevation.validCount > 0;
    for (let i = 0; i < ELEV_COLORS.length; i++) {
      const row = document.createElement('div');
      row.className = 'legend-row';
      const swatch = document.createElement('span');
      swatch.className = 'legend-swatch';
      swatch.style.background = ELEV_COLORS[i];
      const label = document.createElement('span');
      label.className = 'legend-label';
      label.textContent = classLabel(i);
      const pct = document.createElement('span');
      pct.className = 'legend-pct';
      pct.textContent = hasValid
        ? formatNumber(Validation.safePercent(elevation.classCounts[i], elevation.validCount), 2) + '%'
        : '—';
      row.appendChild(swatch);
      row.appendChild(label);
      row.appendChild(pct);
      rowsEl.appendChild(row);
    }
    if (hasValid) {
      const seaPct = formatNumber(
        Validation.safePercent(elevation.classCounts[0], elevation.validCount), 2
      );
      document.getElementById('legend-note').textContent =
        'Biru menandai nilai DEM ≤ 0 — ' + seaPct + '% sel. DEMNAS mencakup topografi dasar laut (BIG). ' +
        'Asal-usul data dan verifikasi satuan: data/DATA_SOURCES.md.';
    } else {
      document.getElementById('legend-note').textContent =
        'Tidak ada sel valid pada file DEM ini — kelas tidak dihitung. ' +
        'Asal-usul data: data/DATA_SOURCES.md.';
    }
    document.getElementById('elev-legend-section').hidden = false;
    refreshLegendPanel();
  }

  function updateFloodLegend(waterLevel) {
    document.getElementById('flood-legend-wl').textContent = String(waterLevel);
    document.getElementById('flood-note').textContent =
      'Tinggi muka air skenario: ' + waterLevel +
      ' — relatif terhadap nilai DEM sumber (meter; EGM2008 per spesifikasi produk BIG, ' +
      'file lokal tidak mendeklarasikan datum sendiri). Bukan prakiraan; tanpa aliran, durasi, ' +
      'infiltrasi, dan drainase. Sel NoData dikecualikan.';
    document.getElementById('flood-legend-section').hidden = false;
    refreshLegendPanel();
  }

  function initDemControls(overlay) {
    const toggle = document.getElementById('dem-toggle');
    const slider = document.getElementById('dem-opacity');
    const sliderValue = document.getElementById('dem-opacity-value');
    toggle.checked = true;
    toggle.addEventListener('change', () => {
      if (toggle.checked) {
        if (!map.hasLayer(overlay)) {
          overlay.addTo(map);
        }
      } else {
        if (map.hasLayer(overlay)) {
          map.removeLayer(overlay);
        }
      }
      document.getElementById('elev-legend-section').hidden = !toggle.checked;
      refreshLegendPanel();
    });
    slider.value = 100;
    sliderValue.textContent = '100%';
    slider.addEventListener('input', () => {
      overlay.setOpacity(Number(slider.value) / 100);
      sliderValue.textContent = slider.value + '%';
    });
    document.getElementById('layers-section').hidden = false;
  }

  // --- Ringkasan simulasi / luas tergenang (Mission 08) ---
  const simSummaryState = {
    validCells: null,
    belowZeroCells: null
  };

  function formatId(value, minFraction, maxFraction) {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: minFraction,
      maximumFractionDigits: maxFraction
    }).format(value);
  }

  function initSimSummary(elevation, grid) {
    simSummaryState.validCells = elevation.validCount;
    simSummaryState.belowZeroCells = elevation.classCounts[0];

    const centerY = grid.north - (grid.height / 2) * grid.cellSize;
    const cellAreaM2 = Bathtub.mercatorGroundCellArea(centerY, grid.cellSize);
    const groundRes = cellAreaM2 === null ? null : Math.sqrt(cellAreaM2);

    document.getElementById('sim-method').textContent =
      'Model bathtub: sel tergenang bila elevasi ≤ tinggi muka air. Luas dihitung per baris dengan ' +
      'koreksi distorsi Web Mercator (× cos² lintang).';

    document.getElementById('sim-precision').textContent =
      'Dibatasi resolusi DEM: sel ' + formatNumber(grid.cellSize, 3) + ' m (piksel mercator)' +
      (groundRes === null ? '' : ' ≈ ' + formatNumber(groundRes, 3) + ' m di permukaan tanah') +
      (cellAreaM2 === null ? '' : '; 1 sel ≈ ' + formatId(cellAreaM2, 1, 1) + ' m²') +
      '. Luas dibulatkan; satuan mengikuti luas horisontal permukaan tanah.';

    const belowZeroPct = formatId(
      Validation.safePercent(elevation.classCounts[0], elevation.validCount), 2, 2
    );
    document.getElementById('sim-note').textContent =
      'Penyebut persentase: luas seluruh sel valid DEM (' + formatId(elevation.validCount, 0, 0) + ' sel). ' +
      (elevation.validCount > 0
        ? belowZeroPct + '% sel DEM bernilai ≤ 0 (di bawah acuan EGM2008) dan ikut aturan simulasi. '
        : 'Tidak ada sel valid pada file DEM ini sehingga persentase per kelas tidak dihitung. ') +
      'Tinggi muka air relatif terhadap nilai DEM sumber — nilai skenario, bukan observasi, bukan prakiraan, ' +
      'bukan peta bahaya. Tanpa aliran, durasi, infiltrasi, drainase, hambatan. Sel NoData dikecualikan. ' +
      'Rincian metode: data/DATA_SOURCES.md.';

    document.getElementById('sim-summary').hidden = false;
  }

  function updateSimSummary(waterLevel, area) {
    document.getElementById('sim-wl').textContent = waterLevel + ' m (nilai DEM sumber)';
    document.getElementById('sim-area').textContent =
      formatId(area.floodedAreaM2 / 1e4, 2, 2) + ' ha (≈ ' +
      formatId(area.floodedAreaM2 / 1e6, 3, 3) + ' km²)';
    document.getElementById('sim-pct').textContent =
      formatId(area.pctFlooded, 2, 2) + ' % — ' + formatId(area.floodedCells, 0, 0) +
      ' dari ' + formatId(area.validCells, 0, 0) + ' sel valid';
  }

  // --- Kontrol tinggi muka air (Mission 07) ---
  const waterLevelState = {
    dem: null,
    floodOverlay: null,
    min: null,
    max: null,
    renderedWaterLevel: null,
    pendingWaterLevel: null,
    rafId: null,
    lastValid: null
  };

  function reportFloodTiming(t0, t1, t2, t3, flood, area) {
    document.getElementById('wl-timing').textContent =
      'Perhitungan terakhir: mask ' + formatNumber(t1 - t0, 0) + ' ms · render ' +
      formatNumber(t3 - t2, 0) + ' ms · total ' + formatNumber(t3 - t0, 0) + ' ms';
    console.debug(
      '[genangan] wl=' + waterLevelState.renderedWaterLevel +
      ' flooded=' + flood.floodedCount +
      ' maskMs=' + formatNumber(t1 - t0, 1) +
      ' areaMs=' + formatNumber(t2 - t1, 1) +
      ' renderMs=' + formatNumber(t3 - t2, 1) +
      ' totalMs=' + formatNumber(t3 - t0, 1) +
      (area === null ? ' luas=gagal' : ' luasM2=' + formatNumber(area.floodedAreaM2, 1) +
        ' pct=' + formatNumber(area.pctFlooded, 4))
    );
  }

  function applyWaterLevel(waterLevel) {
    if (waterLevel === waterLevelState.renderedWaterLevel) return;
    const t0 = performance.now();
    const flood = Bathtub.computeFloodMask(
      waterLevelState.dem.data,
      waterLevelState.dem.nodata,
      waterLevel
    );
    const t1 = performance.now();
    if (flood === null) {
      showStatus(
        'Perhitungan genangan gagal untuk tinggi muka air ' + waterLevel +
        '. Nilai sebelumnya tetap ditampilkan.',
        'error'
      );
      return;
    }
    const area = Bathtub.computeFloodedArea(
      waterLevelState.dem.data,
      flood.mask,
      waterLevelState.dem.nodata,
      waterLevelState.dem.grid
    );
    const t2 = performance.now();
    const url = renderFloodMask(flood.mask, waterLevelState.dem.width, waterLevelState.dem.height);
    const t3 = performance.now();
    waterLevelState.floodOverlay.setUrl(url);
    waterLevelState.renderedWaterLevel = waterLevel;
    updateFloodLegend(waterLevel);
    if (area === null) {
      console.warn('[luas] perhitungan luas gagal untuk wl=' + waterLevel + ' — ringkasan dibiarkan.');
    } else {
      updateSimSummary(waterLevel, area);
    }
    reportFloodTiming(t0, t1, t2, t3, flood, area);
  }

  function scheduleWaterLevelUpdate(waterLevel) {
    waterLevelState.pendingWaterLevel = waterLevel;
    if (waterLevelState.rafId !== null) return;
    waterLevelState.rafId = requestAnimationFrame(() => {
      waterLevelState.rafId = null;
      applyWaterLevel(waterLevelState.pendingWaterLevel);
    });
  }

  function setWaterHint(message) {
    const hint = document.getElementById('wl-hint');
    hint.textContent = message === null ? '' : message;
    hint.hidden = message === null;
  }

  function commitNumberInput(numberInput, slider) {
    const parsed = Bathtub.parseWaterLevel(numberInput.value, waterLevelState.min, waterLevelState.max);
    if (parsed.ok) {
      setWaterHint(null);
      slider.value = parsed.value;
      waterLevelState.lastValid = parsed.value;
      scheduleWaterLevelUpdate(parsed.value);
      return;
    }
    if (parsed.reason === 'below' || parsed.reason === 'above') {
      setWaterHint('Nilai di luar rentang, dikunci ke ' + parsed.value + '.');
      numberInput.value = parsed.value;
      slider.value = parsed.value;
      waterLevelState.lastValid = parsed.value;
      scheduleWaterLevelUpdate(parsed.value);
      return;
    }
    setWaterHint(
      'Masukkan angka dalam rentang ' + waterLevelState.min + '…' + waterLevelState.max + '.'
    );
    numberInput.value = waterLevelState.lastValid;
  }

  function initWaterLevelControls(dem, elevation) {
    waterLevelState.dem = dem;
    waterLevelState.min = Math.floor(elevation.min);
    waterLevelState.max = Math.ceil(elevation.max);

    const slider = document.getElementById('wl-slider');
    const numberInput = document.getElementById('wl-number');
    slider.min = waterLevelState.min;
    slider.max = waterLevelState.max;
    numberInput.min = waterLevelState.min;
    numberInput.max = waterLevelState.max;
    document.getElementById('wl-range-note').textContent =
      'Satuan: nilai DEM sumber. Rentang ' + waterLevelState.min + '…' + waterLevelState.max +
      ' (dibulatkan ke luar dari min ' + formatNumber(elevation.min, 3) +
      ' · maks ' + formatNumber(elevation.max, 3) + '). Bukan prakiraan.';

    slider.value = DEFAULT_WATER_LEVEL;
    numberInput.value = DEFAULT_WATER_LEVEL;
    waterLevelState.lastValid = DEFAULT_WATER_LEVEL;

    slider.addEventListener('input', () => {
      const v = Number(slider.value);
      numberInput.value = v;
      setWaterHint(null);
      waterLevelState.lastValid = v;
      scheduleWaterLevelUpdate(v);
    });

    numberInput.addEventListener('change', () => {
      commitNumberInput(numberInput, slider);
    });

    document.getElementById('water-level-section').hidden = false;
  }

  // Metadata sebagian saat validasi/layout gagal — hanya fakta yang memang terbaca.
  function buildPartialMetadata(buffer, width, height, resolution, epsgCode) {
    const rows = [
      ['Berkas', DEM_URL],
      ['Ukuran berkas', new Intl.NumberFormat('id-ID').format(buffer.byteLength) + ' byte'],
      [
        'CRS',
        epsgCode
          ? 'EPSG:' + epsgCode + ' — tidak didukung layer; dibutuhkan EPSG:3857'
          : 'tidak terbaca dari file'
      ]
    ];
    if (Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0) {
      rows.push([
        'Ukuran raster',
        width + ' kolom × ' + height + ' baris = ' +
        new Intl.NumberFormat('id-ID').format(width * height) + ' sel'
      ]);
    }
    if (resolution && Number.isFinite(resolution[0])) {
      rows.push(['Resolusi', formatNumber(resolution[0], 6) + ' m (nilai mentah dari file)']);
    }
    rows.push(['Status', 'Layer elevasi TIDAK ditampilkan — lihat pesan status.']);
    buildMetadataList(rows);
    document.getElementById('dem-meta-note').textContent =
      'Metadata sebagian di atas adalah fakta yang berhasil dibaca dari file sebelum validasi ' +
      'berhenti. Rincian ketentuan data: data/DATA_SOURCES.md.';
    document.getElementById('dem-meta').hidden = false;
    const metaDetails = document.getElementById('dem-meta-details');
    if (metaDetails) {
      metaDetails.open = false;
    }
  }

  async function loadDem() {
    if (typeof GeoTIFF === 'undefined') {
      showStatus(
        'Pustaka pembaca GeoTIFF (geotiff.js) gagal dimuat dari CDN — DEM tidak dapat dibaca. ' +
        'Periksa koneksi internet, nonaktifkan pemblokir, lalu muat ulang halaman. ' +
        'Peta dan pemberitahuan tetap dapat digunakan; layer DEM tidak ditampilkan.',
        'error'
      );
      setDemUnavailable('Metadata tidak tersedia — pustaka pembaca GeoTIFF gagal dimuat.');
      return;
    }

    let buffer;
    try {
      const response = await fetch(DEM_URL);
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      buffer = await response.arrayBuffer();
    } catch (error) {
      // "HTTP xxx" adalah detail buatan sendiri; gangguan jaringan tidak ditampilkan mentah.
      const detail =
        error && typeof error.message === 'string' && error.message.indexOf('HTTP ') === 0
          ? error.message
          : 'gangguan jaringan';
      showStatus(
        'File DEM tidak dapat dimuat dari "' + DEM_URL + '" (' + detail + '). ' +
        'Periksa file ada di folder data dan server lokal berjalan ' +
        '(python -m http.server 8000), lalu muat ulang halaman. ' +
        'Peta dan pemberitahuan tetap dapat digunakan; layer DEM tidak ditampilkan.',
        'error'
      );
      setDemUnavailable('Metadata tidak tersedia — file DEM gagal dimuat.');
      return;
    }

    // Cek ukuran berkas SEBELUM parsing, agar file besar tidak membekukan halaman.
    // Field lain diisi agar hanya pemeriksaan byteLength yang aktif.
    const earlyCheck = Validation.validateDemLayout({
      byteLength: buffer.byteLength,
      width: 1,
      height: 1,
      resolution: [1, -1],
      origin: [0, 0],
      epsg: Validation.REQUIRED_EPSG
    });
    if (!earlyCheck.ok) {
      showStatus(earlyCheck.message, 'error');
      setDemUnavailable(
        'Metadata tidak tersedia — file DEM terlalu besar untuk aplikasi web ini ' +
        '(batas aplikasi, bukan klaim data).'
      );
      return;
    }

    let tiff;
    let image;
    try {
      tiff = await GeoTIFF.fromArrayBuffer(buffer);
      image = await tiff.getImage();
    } catch (error) {
      showStatus(
        'File DEM tidak dapat dibaca sebagai GeoTIFF — file kemungkinan rusak atau bukan ' +
        'format GeoTIFF yang valid. Ganti dengan file GeoTIFF valid (lihat ' +
        'data/DATA_SOURCES.md) lalu muat ulang halaman. Peta dan pemberitahuan tetap dapat ' +
        'digunakan; layer DEM tidak ditampilkan.',
        'error'
      );
      setDemUnavailable('Metadata tidak tersedia — file DEM tidak dapat dibaca sebagai GeoTIFF.');
      return;
    }

    const width = image.getWidth();
    const height = image.getHeight();
    const origin = image.getOrigin();
    const resolution = image.getResolution();

    let geoKeys = {};
    try {
      geoKeys = image.getGeoKeys() || {};
    } catch (error) {
      geoKeys = {};
    }
    const epsgCode = geoKeys.ProjectedCSTypeGeoKey || null;

    // Validasi struktur & CRS SEBELUM readRasters (mahal) — berhenti cepat bila gagal.
    const layoutCheck = Validation.validateDemLayout({
      byteLength: buffer.byteLength,
      width: width,
      height: height,
      resolution: resolution,
      origin: origin,
      epsg: epsgCode
    });
    if (!layoutCheck.ok) {
      showStatus(layoutCheck.message, 'error');
      buildPartialMetadata(buffer, width, height, resolution, epsgCode);
      return;
    }

    let data;
    try {
      data = await image.readRasters({ interleave: true });
    } catch (error) {
      showStatus(
        'Data raster dalam file DEM tidak dapat dibaca — file kemungkinan rusak atau tidak ' +
        'lengkap. Ganti dengan file GeoTIFF valid (lihat data/DATA_SOURCES.md) lalu muat ' +
        'ulang halaman. Peta dan pemberitahuan tetap dapat digunakan; layer DEM tidak ditampilkan.',
        'error'
      );
      setDemUnavailable('Metadata tidak tersedia — data raster DEM gagal dibaca.');
      return;
    }

    if (!data || data.length !== width * height) {
      const found = data && typeof data.length === 'number' ? data.length : 'tidak terbaca';
      showStatus(
        'Data raster DEM tidak sesuai dengan dimensi file (ditemukan ' +
        new Intl.NumberFormat('id-ID').format(Number(found) || 0) +
        ' sel, diharapkan ' + width + ' × ' + height + ' = ' +
        new Intl.NumberFormat('id-ID').format(width * height) +
        ' sel). File kemungkinan rusak atau tidak didukung. Ganti dengan file GeoTIFF valid ' +
        '(lihat data/DATA_SOURCES.md) lalu muat ulang halaman. Peta tetap dapat digunakan.',
        'error'
      );
      setDemUnavailable('Metadata tidak tersedia — ukuran data raster tidak sesuai dimensi file.');
      return;
    }

    const nodata =
      typeof image.getGDALNoData() === 'function' && image.getGDALNoData() !== null
        ? Number(image.getGDALNoData())
        : KNOWN_NODATA_FALLBACK;

    const west = origin[0];
    const north = origin[1];
    const east = west + resolution[0] * width;
    const south = north + resolution[1] * height;
    const southWest = toLatLng(west, south);
    const northEast = toLatLng(east, north);

    const elevation = renderElevation(data, width, height, nodata);
    const overlay = L.imageOverlay(elevation.url, [
      [southWest.lat, southWest.lng],
      [northEast.lat, northEast.lng]
    ]);
    overlay.addTo(map);
    const bounds = overlay.getBounds();
    const isMobile = window.innerWidth <= 900;
    if (isMobile) {
      map.fitBounds(bounds, { padding: [10, 10] });
    } else {
      map.fitBounds(bounds, { paddingTopLeft: [340, 10], paddingBottomRight: [10, 10] });
    }
    buildLegend(elevation);
    initDemControls(overlay);

    if (typeof Bathtub === 'undefined') {
      showStatus(
        'Pustaka simulasi (simulation.js) tidak termuat — overlay genangan dan ringkasan ' +
        'luas tidak dibuat. Periksa berkas simulation.js di folder proyek lalu muat ulang ' +
        'halaman. Layer elevasi tetap berfungsi.',
        'error'
      );
    } else {
      const grid = { width: width, height: height, cellSize: resolution[0], north: north };
      initWaterLevelControls(
        { data: data, width: width, height: height, nodata: nodata, grid: grid },
        elevation
      );
      initSimSummary(elevation, grid);
      const t0 = performance.now();
      const flood = Bathtub.computeFloodMask(data, nodata, DEFAULT_WATER_LEVEL);
      const t1 = performance.now();
      if (flood === null) {
        showStatus(
          'Nilai tinggi muka air awal tidak valid — overlay genangan tidak dibuat. ' +
          'Ubah nilai lewat kontrol tinggi muka air untuk mencoba lagi.',
          'error'
        );
      } else {
        const area0 = Bathtub.computeFloodedArea(data, flood.mask, nodata, grid);
        const t2 = performance.now();
        const url0 = renderFloodMask(flood.mask, width, height);
        const t3 = performance.now();
        waterLevelState.floodOverlay = L.imageOverlay(url0, overlay.getBounds());
        waterLevelState.floodOverlay.addTo(map);
        waterLevelState.renderedWaterLevel = DEFAULT_WATER_LEVEL;
        updateFloodLegend(DEFAULT_WATER_LEVEL);
        if (area0 === null) {
          console.warn('[luas] perhitungan luas awal gagal — ringkasan dibiarkan.');
        } else {
          updateSimSummary(DEFAULT_WATER_LEVEL, area0);
        }
        reportFloodTiming(t0, t1, t2, t3, flood, area0);

        const floodControls = document.getElementById('flood-controls-section');
        if (floodControls) {
          floodControls.hidden = false;
        }
        const floodToggle = document.getElementById('flood-toggle');
        const floodOpacity = document.getElementById('flood-opacity');
        const floodOpacityValue = document.getElementById('flood-opacity-value');
        if (floodToggle && floodOpacity && floodOpacityValue) {
          floodToggle.checked = true;
          floodToggle.addEventListener('change', () => {
            if (!waterLevelState.floodOverlay) return;
            if (floodToggle.checked) {
              if (!map.hasLayer(waterLevelState.floodOverlay)) {
                waterLevelState.floodOverlay.addTo(map);
              }
            } else {
              if (map.hasLayer(waterLevelState.floodOverlay)) {
                map.removeLayer(waterLevelState.floodOverlay);
              }
            }
          });
          floodOpacity.value = 100;
          floodOpacityValue.textContent = '100%';
          floodOpacity.addEventListener('input', () => {
            if (!waterLevelState.floodOverlay) return;
            waterLevelState.floodOverlay.setOpacity(Number(floodOpacity.value) / 100);
            floodOpacityValue.textContent = floodOpacity.value + '%';
          });
        }
      }
    }

    const centerLat = (southWest.lat + northEast.lat) / 2;
    const groundResolution = resolution[0] * Math.cos((centerLat * Math.PI) / 180);

    const rows = [
      ['Berkas', DEM_URL],
      ['Ukuran berkas', new Intl.NumberFormat('id-ID').format(buffer.byteLength) + ' byte'],
      ['Format', 'GeoTIFF, 1 band, Float32, kompresi DEFLATE'],
      [
        'CRS',
        (epsgCode ? 'EPSG:' + epsgCode + ' — ' : '') + 'WGS 84 / Pseudo-Mercator (Leaflet EPSG:3857)'
      ],
      ['Ukuran raster', width + ' kolom × ' + height + ' baris = ' + new Intl.NumberFormat('id-ID').format(width * height) + ' sel'],
      ['Resolusi', formatNumber(resolution[0], 6) + ' m (piksel mercator); ≈ ' + formatNumber(groundResolution, 3) + ' m di permukaan tanah pada lintang ' + formatNumber(centerLat, 4)],
      ['Ekstensi (EPSG:3857)', 'barat ' + formatNumber(west, 3) + ' · timur ' + formatNumber(east, 3) + ' · selatan ' + formatNumber(south, 3) + ' · utara ' + formatNumber(north, 3)],
      ['Ekstensi (WGS84)', 'barat ' + formatNumber(southWest.lng, 5) + ' · timur ' + formatNumber(northEast.lng, 5) + ' · selatan ' + formatNumber(southWest.lat, 5) + ' · utara ' + formatNumber(northEast.lat, 5)],
      ['NoData', String(nodata)],
      ['Nilai elevasi valid', 'min ' + formatNumber(elevation.min, 3) + ' · maks ' + formatNumber(elevation.max, 3) + ' (meter; EGM2008)'],
      ['Sel valid / NoData', new Intl.NumberFormat('id-ID').format(elevation.validCount) + ' / ' + new Intl.NumberFormat('id-ID').format(elevation.nodataCount)]
    ];
    buildMetadataList(rows);
    document.getElementById('dem-meta-note').textContent =
      'Turunan untuk browser: clip wilayah studi + reproyeksi bilinear ke EPSG:3857 dari DEMNAS. ' +
      'Satuan meter dan datum vertikal EGM2008 diverifikasi dari spesifikasi resmi BIG (17 Okt 2026) — ' +
      'tidak dideklarasikan di dalam file lokal; lihat data/DATA_SOURCES.md. ' +
      'Tinggi muka air skenario harus mengacu pada nilai elevasi DEM ini.';
    document.getElementById('dem-meta').hidden = false;
    const metaDetails = document.getElementById('dem-meta-details');
    if (metaDetails) {
      metaDetails.open = false;
    }
  }

  // Hook untuk pengujian browser (Mission 13) — memungkinkan simulasi ulang kegagalan
  // dari console/perkakas tanpa memuat ulang halaman.
  window.loadDem = loadDem;
  window.clearStatus = clearStatus;
  window.showStatus = showStatus;

  loadDem();
}
