const map = L.map('map').setView([-2.5, 118], 5);

const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

osmLayer.on('tileerror', () => {
  const el = document.getElementById('map-status');
  if (el) {
    el.hidden = false;
    el.textContent =
      'Tile OpenStreetMap gagal dimuat. Periksa koneksi jaringan Anda.';
  }
});

osmLayer.addTo(map);

const status = document.createElement('div');
status.id = 'map-status';
status.hidden = true;
document.body.appendChild(status);
