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

function drawGrayscale(data, width, height, nodata) {
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
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  const range = max - min || 1;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    const p = i * 4;
    if (Number.isNaN(v) || v === nodata) {
      imageData.data[p + 3] = 0;
      continue;
    }
    const gray = Math.round(((v - min) / range) * 255);
    imageData.data[p] = gray;
    imageData.data[p + 1] = gray;
    imageData.data[p + 2] = gray;
    imageData.data[p + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return { url: canvas.toDataURL('image/png'), min, max, validCount, nodataCount };
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

  const grayscale = drawGrayscale(data, width, height, nodata);
  const overlay = L.imageOverlay(grayscale.url, [
    [southWest.lat, southWest.lng],
    [northEast.lat, northEast.lng]
  ]);
  overlay.addTo(map);
  map.fitBounds(overlay.getBounds());

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
    ['Nilai elevasi valid', 'min ' + formatNumber(grayscale.min, 3) + ' · maks ' + formatNumber(grayscale.max, 3) + ' (satuan tidak dideklarasikan di file)'],
    ['Sel valid / NoData', new Intl.NumberFormat('id-ID').format(grayscale.validCount) + ' / ' + new Intl.NumberFormat('id-ID').format(grayscale.nodataCount)]
  ];
  buildMetadataList(rows);
  document.getElementById('dem-meta-note').textContent =
    'Turunan untuk browser: clip wilayah studi + reproyeksi bilinear ke EPSG:3857 dari DEMNAS (lihat data/DATA_SOURCES.md). Satuan elevasi dan datum vertikal belum diketahui dari file, jadi tinggi muka air skenario harus mengacu pada nilai elevasi DEM ini.';
  document.getElementById('dem-meta').hidden = false;
}

loadDem();
