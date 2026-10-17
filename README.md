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
- **Tanpa build system, tanpa backend, tanpa database** — hanya HTML, CSS, JavaScript vanilla, Leaflet, dan geotiff.js

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

## Struktur File (kondisi setelah Mission 04)

```text
.
├── AGENTS.md                      # aturan pengembangan, kebijakan data, checklist regresi
├── SPEC.md                        # spesifikasi produk dan kriteria penerimaan
├── README.md                      # berkas ini
├── index.html                     # halaman aplikasi; memuat Leaflet 1.9.4 + geotiff.js 3.0.5 dari CDN unpkg
    ├── styles.css                     # gaya: header + peta + panel metadata/legenda/kontrol + pesan status
    ├── app.js                         # peta Leaflet + OpenStreetMap + muat DEM + color ramp, legenda, toggle/opasitas
├── .gitignore                     # mengabaikan config.local.js (untuk API key Google di masa depan)
└── data/
    ├── DATA_SOURCES.md            # asal-usul & metadata DEM yang terverifikasi
    ├── DEMNAS_ok.tif              # DEM induk (± 128 MB, TIDAK dimuat browser; lihat DATA_SOURCES.md)
    ├── DEMNAS_ok.tif.* / .tfw     # sidecar DEM induk
    └── DEMNAS_ok_besuki.geotiff   # turunan untuk browser (2,9 MB, clip + reproyeksi EPSG:3857)
```

Folder `skills/` belum dibuat — menyusul pada mission berikutnya sesuai urutan di `AGENTS.md`.

---

## Fitur yang Berfungsi Saat Ini (Mission 01–05)

Peta (Mission 01):

- Peta Leaflet interaktif (zoom, pan) yang mengisi area peta
- Basemap **OpenStreetMap** dari tile server resmi (`tile.openstreetmap.org`)
- **Atribusi OpenStreetMap** tampil di pojok kanan bawah peta (wajib sesuai ketentuan OSM)
- Pesan status bila tile OSM gagal dimuat (misalnya jaringan offline)

DEM (Mission 04):

- **DEM Besuki dimuat otomatis** (`data/DEMNAS_ok_besuki.geotiff`) memakai geotiff.js — tanpa unggah manual
- Peta otomatis `fitBounds` ke cakupan DEM (zoom ± 13)
- **Panel metadata** menampilkan nilai yang dibaca langsung dari file: nama berkas, ukuran, format, CRS (EPSG:3857), dimensi raster (1247×684), resolusi piksel mercator + estimasi resolusi tanah, ekstensi (EPSG:3857 & WGS84), NoData, rentang nilai valid, jumlah sel valid/NoData
- Pesan status yang jelas bila DEM gagal dimuat/dibaca

Elevasi (Mission 05):

- **Color ramp diskrit 7 kelas** (pengganti grayscale): biru untuk nilai ≤ 0, lalu hijau → kuning-hijau → oranye → cokelat; titik patah `0 · 10 · 25 · 50 · 100 · 150` dipilih dari histogram DEM
- **Legenda** berisi swatch warna, label kelas, dan **% sel per kelas** (dihitung dari DEM); satuan: "nilai DEM sumber — meter (DEMNAS, datum vertikal EGM2008)"
- **Kontrol layer**: checkbox tampil/sembunyi + slider **opasitas** (0–100%), tanpa reload dan tanpa reset peta; legenda mengikuti visibilitas layer
- **Baris statis permanen** di header: "Simulasi edukasi sederhana, bukan prediksi."

Belum ada: kontrol tinggi muka air, overlay banjir, legenda banjir, hillshade, pengalih basemap — mission berikutnya.

---

## Hasil Verifikasi (Mission 01 & 04, diverifikasi via BrowserOS)

Mission 01 — First Map:

| Item | Hasil |
|------|-------|
| Halaman termuat (HTTP 200, judul benar) | PASS |
| Peta Leaflet render (container + kontrol zoom) | PASS |
| Tile OSM termuat (20/20 dari `tile.openstreetmap.org`) | PASS |
| Atribusi OpenStreetMap tampil | PASS |
| Posisi peta sesuai: lat -2.5, lng 118, zoom 5 | PASS |
| Console browser tanpa error/warning | PASS |
| Review visual screenshot oleh agent | NOT VERIFIED (keterbatasan model; screenshot tersimpan di BrowserOS) |

Mission 04 — Load DEM and Verify Metadata:

| Item | Hasil |
|------|-------|
| Panel metadata terisi dan **identik** dengan ekstraksi rasterio Python | PASS |
| 3 piksel uji identik lintas alat (geotiff.js di browser == rasterio Python), indeks piksel sama | PASS |
| geokey `ProjectedCSTypeGeoKey = 3857` terbaca geotiff.js | PASS |
| Overlay di lokasi benar: center overlay = center peta = pusat Besuki (-7,7341; 113,6961) | PASS |
| Bounds overlay (WGS84) identik dengan perhitungan Python | PASS |
| Sel NoData tidak dihitung sebagai elevasi | PASS |
| Console browser tanpa error/warning | PASS |
| Review visual screenshot oleh agent | NOT VERIFIED (keterbatasan model) |

Mission 05 — Visualize Elevation:

| Item | Hasil |
|------|-------|
| Warna per piksel uji sesuai kelas ramp (87,42 → kelas 50–100; 9,668 → 0–10; -2,78 → biru ≤ 0) | PASS |
| Histogram 7 kelas di browser identik dengan hitungan rasterio Python | PASS |
| Legenda: 7 baris, label kelas, % sel per kelas, satuan terverifikasi | PASS |
| Legenda tampil hanya saat layer DEM aktif | PASS |
| Toggle layer: overlay hilang/muncul; center/zoom peta tidak berubah; OSM & metadata tak terpengaruh; tanpa reload | PASS |
| Opasitas 40% → `opacity` overlay 0,4; dikembalikan ke 100% → 1 | PASS |
| Regresi Mission 04 (panel metadata identik Python, disclaimer tampil) | PASS |
| Console browser tanpa error/warning | PASS |
| Review visual screenshot oleh agent | NOT VERIFIED (keterbatasan model; screenshot tersimpan di BrowserOS) |

---

## Peta Pengembangan

Mengikuti urutan mission di [`AGENTS.md`](AGENTS.md):

| Mission | Nama | Status |
|---------|------|--------|
| 01 | First Map | ✅ selesai |
| 02 | Establish Baseline | ✅ selesai |
| 03 | Research & Document Data Sources | ✅ selesai |
| 04 | Load DEM and Verify Metadata | ✅ selesai |
| 05 | Visualize Elevation | ✅ selesai |
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
- [geotiff.js](https://geotiffjs.github.io/geotiff.js/) 3.0.5 — di-pin di unpkg dengan integrity hash, mem-parsing GeoTIFF di browser
- [OpenStreetMap](https://www.openstreetmap.org/copyright) — tile basemap, atribusi wajib
- Browser APIs bawaan (Canvas, fetch, File API)

Persiapan data DEM memakai Python (rasterio + pyproj) di luar aplikasi web — lihat
`data/DATA_SOURCES.md` sub-bab 1d untuk tool, versi, dan nilai yang dihasilkan.

---

## Catatan Data (Mission 04–05)

- Satuan elevasi **meter** dan datum vertikal **EGM2008** — diverifikasi dari spesifikasi resmi BIG (layanan `geoservices.big.go.id` + halaman produk `big.go.id`, diakses 17 Okt 2026); file lokal tidak mendeklarasikannya sendiri. Rincian di [`data/DATA_SOURCES.md`](data/DATA_SOURCES.md) sub-bab 1c.
- Turunan memakai ekstensi `.geotiff` (bukan `.tif`) karena browser agent BrowserOS mengembalikan HTTP 204 untuk ekstensi `.tif`/`.tiff`/`.pdf`; isi file tetap GeoTIFF standar.
- 32,07% sel DEM bernilai ≤ 0 (mewakili perairan/dasar laut) — sebaran nilai lengkap ada di `data/DATA_SOURCES.md` sub-bab 1e.
- Detail asal-usul, ekstraksi nilai, dan SHA-256 ada di [`data/DATA_SOURCES.md`](data/DATA_SOURCES.md).
