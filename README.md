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

## Struktur File (kondisi setelah Mission 07)

```text
.
├── AGENTS.md                      # aturan pengembangan, kebijakan data, checklist regresi
├── SPEC.md                        # spesifikasi produk dan kriteria penerimaan
├── README.md                      # berkas ini
├── index.html                     # halaman aplikasi; memuat Leaflet 1.9.4 + geotiff.js 3.0.5 dari CDN unpkg
├── styles.css                     # gaya: header + peta + panel metadata/legenda/kontrol + pesan status
├── app.js                         # peta + DEM + color ramp + overlay genangan + kontrol tinggi muka air
├── simulation.js                  # model bathtub murni + parser input (tanpa peta) — diuji oleh tests/
├── tests/
│   └── test-simulation.js         # uji unit Node tanpa framework: node tests/test-simulation.js
├── .gitignore                     # mengabaikan config.local.js (untuk API key Google di masa depan)
└── data/
    ├── DATA_SOURCES.md            # asal-usul & metadata DEM yang terverifikasi
    ├── DEMNAS_ok.tif              # DEM induk (± 128 MB, TIDAK dimuat browser; lihat DATA_SOURCES.md)
    ├── DEMNAS_ok.tif.* / .tfw     # sidecar DEM induk
    └── DEMNAS_ok_besuki.geotiff   # turunan untuk browser (2,9 MB, clip + reproyeksi EPSG:3857)
```

Folder `skills/` belum dibuat — menyusul pada mission berikutnya sesuai urutan di `AGENTS.md`.

---

## Fitur yang Berfungsi Saat Ini (Mission 01–07)

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

Genangan (Mission 06):

- **Overlay genangan model bathtub** di atas layer elevasi: `sel tergenang = elevasi ≤ tinggi muka air skenario` (nilai DEM sumber); warna biru translusen (`#1565c0`, α 0,55); dihitung ulang live saat skenario berubah (Mission 07; nilai awal 5)
- **Legenda genangan tersendiri**: swatch + label "Tergenang: elevasi ≤ X (nilai DEM sumber)" + catatan bahwa tinggi muka air adalah skenario pengguna, **relatif terhadap nilai DEM sumber** (meter; EGM2008 per spesifikasi produk BIG, file lokal tidak mendeklarasikan datum sendiri), bukan prakiraan; **sel NoData dikecualikan**
- **Sel bernilai ≤ 0 ikut aturan biasa** (keputusan terdokumentasi) — lihat `data/DATA_SOURCES.md` sub-bab 1e
- **Fungsi simulasi murni** `simulation.js` (`Bathtub.computeFloodMask` + `Bathtub.parseWaterLevel`) terpisah dari kode peta, dipakai browser dan diuji lewat Node
- **Uji unit tanpa framework**: `node tests/test-simulation.js` — 33 kasus (grid hitungan tangan, sel NoData, NaN/Infinity, batas `<=`, sel ≤ 0, mask monoton, parser input valid/ kosong/ non-angka/ di luar rentang, input tidak valid)

Kontrol tinggi muka air (Mission 07):

- **Slider + input numerik tersinkron** di panel "Kontrol Skenario & Layer" (kiri atas); slider step 0,5 (−5 … 238), input number step 0,1; nilai awal 5
- **Rentang diturunkan dari min/maks DEM** saat runtime (dibulatkan ke luar: −5 … 238 dari min −4,427 · maks 237,751); teks sumber rentang + satuan "nilai DEM sumber" tampil di panel
- **Perhitungan ulang live** memakai `setUrl` overlay Leaflet — tanpa reload, tanpa reset posisi/zoom peta (center/zoom identik sebelum & sesudah)
- **Validasi input**: nilai valid di luar rentang → **dikunci (clamp)** ke batas + pesan "dikunci ke X"; input kosong/non-angka → pesan "Masukkan angka dalam rentang …" dan nilai dikembalikan ke nilai terakhir yang valid; overlay lama tetap tampil bila input gagal
- **Performa**: perhitungan dijadwalkan lewat `requestAnimationFrame` (maks satu perhitungan baru per frame saat digeser cepat) + **readout waktu** di panel: "Perhitungan terakhir: mask … ms · render … ms · total … ms" (terukur ±25–55 ms per update pada DEM 1247×684 ini)
- **Legenda genangan mengikuti skenario**: label "Tergenang: elevasi ≤ X" ikut berubah; tidak ada tombol kunci khusus (user memilih: mengubah tinggi = mengubah genangan)

Belum ada: hitungan luas tergenang, toggle khusus layer genangan, hillshade, pengalih basemap — mission berikutnya.

---

## Hasil Verifikasi (Mission 01, 04–07, diverifikasi via BrowserOS)

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

Mission 06 — Bathtub Flood Overlay:

| Item | Hasil |
|------|-------|
| `node tests/test-simulation.js` — 12 kasus PASS, exit code 0 | PASS |
| Jumlah sel tergenang di browser (**364.501** pada WL=5) identik dengan hitungan rasterio Python — verifikasi independen lintas alat | PASS |
| Overlay genangan di atas overlay elevasi (2 layer; piksel -2,78 → biru α140; piksel 9,67 dan 87,42 → transparan) | PASS |
| Sel valid positif (0,099 ≤ 5) ikut tergenang — aturan `<=` berlaku untuk sel di atas 0, bukan hanya sel ≤ 0 | PASS |
| Legenda genangan: label WL "5", catatan SEMENTARA + "relatif terhadap nilai DEM sumber"; legenda elevasi tetap 7 baris | PASS |
| Toggle elevasi mati: hanya section elevasi + overlay DEM hilang; genangan tetap; center/zoom tak berubah; tanpa reload | PASS |
| Regresi Mission 01–05 (metadata 11 baris identik Python, warna ramp, disclaimer) | PASS |
| Console browser tanpa error/warning | PASS |
| Review visual screenshot oleh agent | NOT VERIFIED (keterbatasan model; screenshot tersimpan di BrowserOS) |

Mission 07 — Water-Level Control:

| Item | Hasil |
|------|-------|
| `node tests/test-simulation.js` — 33 kasus PASS, exit code 0 | PASS |
| Slider −5 … 238 step 0,5; teks rentang "dibulatkan ke luar dari min -4,427 · maks 237,751" | PASS |
| Sinkronisasi slider ↔ input numerik (dari kiri dan dari kanan); nilai awal 5; legend label "≤ 10" mengikuti | PASS |
| Perubahan live tanpa reload: center/zoom peta identik sebelum–sesudah (slider 10, input 25, drag 12 nilai → nilai akhir 42) | PASS |
| Cross-check jumlah sel tergenang browser == rasterio Python: WL 0 → 273.515 · 2 → 296.154 · 5 → 364.501 · 25 → 738.292 · 100 → 831.871 · 237,751 → 852.948 (100%) · 238 → 852.948 | PASS |
| Validasi: "999" → dikunci 238 + pesan; "-100" → dikunci −5 + pesan; input kosong → pesan "Masukkan angka dalam rentang -5…238." + nilai terakhir dipulihkan; "7,5" → diterima; "abc" → ditolak | PASS |
| rAF coalescing: 12 perubahan cepat → hanya 1 perhitungan tersisa (nilai akhir 42), tab tetap responsif | PASS |
| Readout waktu tampil (mis. "mask 33 ms · render 41 ms · total 74 ms") | PASS |
| Regresi Mission 01–06 (2 overlay, metadata 11 baris identik Python, legenda elevasi 7 baris, disclaimer, statusHidden) | PASS |
| Console browser tanpa error/warning (console.debug timing saja) | PASS |
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
| 06 | Bathtub Flood Overlay | ✅ selesai |
| 07 | Water-Level Control | ✅ selesai |
| 08 | Flooded Area Calculation | ✅ selesai |
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

## Catatan Data (Mission 04–07)

- Satuan elevasi **meter** dan datum vertikal **EGM2008** — diverifikasi dari spesifikasi resmi BIG (layanan `geoservices.big.go.id` + halaman produk `big.go.id`, diakses 17 Okt 2026); file lokal tidak mendeklarasikannya sendiri. Rincian di [`data/DATA_SOURCES.md`](data/DATA_SOURCES.md) sub-bab 1c.
- Turunan memakai ekstensi `.geotiff` (bukan `.tif`) karena browser agent BrowserOS mengembalikan HTTP 204 untuk ekstensi `.tif`/`.tiff`/`.pdf`; isi file tetap GeoTIFF standar.
- 32,07% sel DEM bernilai ≤ 0 — di bawah acuan datum, ikut aturan simulasi seperti sel lain. BIG menyatakan DEMNAS mencakup topografi dasar laut (catatan sumber: `data/DATA_SOURCES.md` sub-bab 1e); sebaran nilai lengkap ada di sub-bab yang sama.
- Tinggi muka air **adalah skenario yang dikendalikan pengguna** (Mission 07); nilai awal 5, rentang −5 … 238 diturunkan dari min/maks DEM turunan (dibulatkan ke luar). Semua nilai **relatif terhadap nilai DEM sumber** — bukan observasi, bukan prakiraan, dan bukan ambang banjir resmi; angka yang sama di UI adalah parameter skenario, bukan pengukuran lapangan.
- Detail asal-usul, ekstraksi nilai, dan SHA-256 ada di [`data/DATA_SOURCES.md`](data/DATA_SOURCES.md).
