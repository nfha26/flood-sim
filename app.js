const map = L.map('map').setView([-2.5, 118], 5);

const statusEl = document.getElementById('map-status');
function showStatus(message) {
  statusEl.hidden = false;
  statusEl.textContent = message;
}

const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

osmLayer.on('tileerror', () => {
  showStatus('Tile OpenStreetMap gagal dimuat. Periksa koneksi jaringan Anda.');
});

osmLayer.addTo(map);

const DEM_URL = 'data/DEMNAS_ok_besuki.geotiff';
const KNOWN_NODATA_FALLBACK = -3.4028234663852886e38;

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

const ELEV_BREAKS = [0, 10, 25, 50, 100, 150];
const ELEV_COLORS = ['#4a90d9', '#8fce8f', '#41ab5d', '#d9cf5a', '#e09b3c', '#a8642a', '#6f4423'];

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

function buildLegend(elevation) {
  const rowsEl = document.getElementById('legend-rows');
  rowsEl.innerHTML = '';
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
    pct.textContent = formatNumber((elevation.classCounts[i] / elevation.validCount) * 100, 2) + '%';
    row.appendChild(swatch);
    row.appendChild(label);
    row.appendChild(pct);
    rowsEl.appendChild(row);
  }
  const seaPct = formatNumber((elevation.classCounts[0] / elevation.validCount) * 100, 2);
  document.getElementById('legend-note').textContent =
    'Biru menandai nilai DEM ≤ 0 — ' + seaPct + '% sel. DEMNAS mencakup topografi dasar laut (BIG). ' +
    'Asal-usul data dan verifikasi satuan: data/DATA_SOURCES.md.';
  document.getElementById('dem-legend').hidden = false;
}

function initDemControls(overlay) {
  const toggle = document.getElementById('dem-toggle');
  const slider = document.getElementById('dem-opacity');
  const sliderValue = document.getElementById('dem-opacity-value');
  toggle.checked = true;
  toggle.addEventListener('change', () => {
    if (toggle.checked) {
      overlay.addTo(map);
    } else {
      map.removeLayer(overlay);
    }
    document.getElementById('dem-legend').hidden = !toggle.checked;
  });
  slider.value = 100;
  sliderValue.textContent = '100%';
  slider.addEventListener('input', () => {
    overlay.setOpacity(Number(slider.value) / 100);
    sliderValue.textContent = slider.value + '%';
  });
  document.getElementById('dem-layer').hidden = false;
}

async function loadDem() {
  if (typeof GeoTIFF === 'undefined') {
    showStatus('Pustaka geotiff.js gagal dimuat. Periksa koneksi jaringan Anda.');
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
    showStatus('DEM tidak dapat dimuat (' + error.message + '). Berkas: ' + DEM_URL);
    return;
  }

  let image;
  let tiff;
  let data;
  try {
    tiff = await GeoTIFF.fromArrayBuffer(buffer);
    image = await tiff.getImage();
    data = await image.readRasters({ interleave: true });
  } catch (error) {
    showStatus('DEM tidak dapat dibaca sebagai GeoTIFF (' + error.message + ').');
    return;
  }

  const width = image.getWidth();
  const height = image.getHeight();
  const origin = image.getOrigin();
  const resolution = image.getResolution();
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
  map.fitBounds(overlay.getBounds());
  buildLegend(elevation);
  initDemControls(overlay);

  let geoKeys = {};
  try {
    geoKeys = image.getGeoKeys() || {};
  } catch (error) {
    geoKeys = {};
  }
  const epsg = geoKeys.ProjectedCSTypeGeoKey ? 'EPSG:' + geoKeys.ProjectedCSTypeGeoKey : null;
  const centerLat = (southWest.lat + northEast.lat) / 2;
  const groundResolution = resolution[0] * Math.cos((centerLat * Math.PI) / 180);

  const rows = [
    ['Berkas', DEM_URL],
    ['Ukuran berkas', new Intl.NumberFormat('id-ID').format(buffer.byteLength) + ' byte'],
    ['Format', 'GeoTIFF, 1 band, Float32, kompresi DEFLATE'],
    ['CRS', (epsg ? epsg + ' — ' : '') + 'WGS 84 / Pseudo-Mercator (Leaflet EPSG:3857)'],
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
}

loadDem();
