# WebGIS Simulasi Banjir — Model Bathtub Sederhana

Proyek edukasi: peta web interaktif untuk mengeksplorasi bagaimana kenaikan tinggi muka air
mengubah area genangan berdasarkan **model bathtub sederhana** di atas DEM dari sumber resmi.

> **Ini bukan prediksi banjir, bukan model hidrodinamika, dan bukan peta bahaya resmi.**
> Model bathtub sederhana: `sel tergenang = elevasi DEM <= tinggi muka air skenario`.
> Tanpa dinamika aliran, durasi, infiltrasi, drainase, atau hambatan.

Spesifikasi lengkap ada di [`SPEC.md`](SPEC.md). Aturan pengembangan dan kebijakan data ada di [`AGENTS.md`](AGENTS.md).

---

## Prasyarat

- Python 3 (untuk server statis lokal)
- Browser modern (Chrome, Edge, Firefox)
- **Tanpa build system, tanpa backend, tanpa database** — hanya HTML, CSS, JavaScript vanilla, dan Leaflet

---

## Cara Menjalankan (Windows PowerShell)

```powershell
cd D:\flood-sim
python -m http.server 8000
```

Lalu buka `http://127.0.0.1:8000/` di browser.

Alternatif (belum diverifikasi pada sesi baseline ini): `npx serve`.

Untuk menghentikan server: tutup jendela terminal, atau `Get-Process python | Stop-Process`.

---

## Struktur File (kondisi baseline Mission 02)

```text
.
├── AGENTS.md          # aturan pengembangan, kebijakan data, checklist regresi
├── SPEC.md            # spesifikasi produk dan kriteria penerimaan
├── README.md          # berkas ini
├── index.html         # halaman aplikasi; memuat Leaflet 1.9.4 dari CDN unpkg
├── styles.css         # gaya minimal: peta mengisi viewport + pesan error tile
├── app.js             # inisialisasi peta Leaflet + layer OpenStreetMap
└── .gitignore         # mengabaikan config.local.js (untuk API key Google di masa depan)
```

Folder `data/` (DEM pengguna + `DATA_SOURCES.md`) dan `skills/` belum dibuat — menyusul pada
mission berikutnya sesuai urutan di `AGENTS.md`.

---

## Fitur yang Berfungsi Saat Ini (Mission 01 — First Map)

- Peta Leaflet interaktif (zoom, pan) yang mengisi seluruh viewport
- Basemap **OpenStreetMap** dari tile server resmi (`tile.openstreetmap.org`)
- **Atribusi OpenStreetMap** tampil di pojok kanan bawah peta (wajib sesuai ketentuan OSM)
- View awal: pusat Indonesia `[-2.5, 118]`, zoom 5
- Pesan status yang jelas bila tile OSM gagal dimuat (misalnya jaringan offline)

Belum ada: DEM, input tinggi muka air, overlay banjir, legenda, pengalih basemap — mission berikutnya.

---

## Hasil Verifikasi Baseline (Mission 01, diverifikasi via BrowserOS)

| Item | Hasil |
|------|-------|
| Halaman termuat (HTTP 200, judul benar) | PASS |
| Peta Leaflet render (container + kontrol zoom) | PASS |
| Tile OSM termuat (20/20 dari `tile.openstreetmap.org`) | PASS |
| Atribusi OpenStreetMap tampil | PASS |
| Posisi peta sesuai: lat -2.5, lng 118, zoom 5 | PASS |
| Console browser tanpa error/warning | PASS |
| Review visual screenshot oleh agent | NOT VERIFIED (keterbatasan model; screenshot tersimpan di BrowserOS) |

---

## Peta Pengembangan

Mengikuti urutan mission di [`AGENTS.md`](AGENTS.md):

| Mission | Nama | Status |
|---------|------|--------|
| 01 | First Map | ✅ selesai |
| 02 | Establish Baseline | ✅ selesai |
| 03 | Research & Document Data Sources | menunggu |
| 04 | Load DEM and Verify Metadata | menunggu |
| 05 | Visualize Elevation | menunggu |
| 06 | Bathtub Flood Overlay | menunggu |
| 07 | Water-Level Control | menunggu |
| 08 | Flooded Area Calculation | menunggu |
| 09 | Legend & Metadata | menunggu |
| 10 | Dashboard Shell | menunggu |
| 11 | Layer Controls | menunggu |
| 12 | Rainfall Layer (opsional, NASA GIBS) | menunggu |
| 13 | Error Handling | menunggu |
| 14 | Responsive Layout | menunggu |
| 15 | Full Regression | menunggu |
| 16 | Final Code Review | menunggu |

---

## Teknologi

- [Leaflet](https://leafletjs.com/) 1.9.4 — dimuat dari CDN resmi unpkg (dengan integrity hash)
- [OpenStreetMap](https://www.openstreetmap.org/copyright) — tile basemap, atribusi wajib
- Browser APIs bawaan (Canvas, fetch, File API) akan dipakai pada mission berikutnya
