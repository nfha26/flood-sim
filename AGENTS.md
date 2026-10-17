# AGENTS.md

## Proyek

Repositori ini adalah proyek praktik untuk membangun **WebGIS Simulasi Banjir** dengan bantuan AI agent.

Proyek teknisnya adalah **dashboard simulasi genangan banjir sederhana untuk edukasi**, dibangun di atas:

- Digital Elevation Model (DEM) dari sumber resmi yang disediakan oleh pengguna;
- layer observasi curah hujan opsional dari sumber resmi yang terverifikasi (misalnya presipitasi NASA GIBS IMERG).

Simulasinya adalah **model bathtub sederhana**. Ini **bukan** prediksi banjir resmi dan **bukan** model hidrodinamika. UI harus selalu menyatakan hal ini.

Alur pengembangan:

```text
SPEC
  ↓
PLAN
  ↓
SMALL TASK
  ↓
IMPLEMENT
  ↓
RUN
  ↓
INSPECT
  ↓
VERIFY
  ↓
CHECKPOINT
```

---

## Lingkungan

- OS: **Windows native** (PowerShell). Jangan berasumsi ada WSL, bash, atau tool khusus Linux.
- Lokasi proyek: drive **D:** (jangan menulis file besar ke drive C).
- Agent: OpenCode. Verifikasi browser: BrowserOS lewat MCP di `http://127.0.0.1:9010/mcp` (periksa di halaman MCP BrowserOS, jangan menebak).
- Server lokal: `python -m http.server 8000` (atau `npx serve`). Jangan menambahkan build system.
- Gunakan perintah yang kompatibel dengan PowerShell. Pilih perintah lintas platform bila memungkinkan.

---

## Prinsip Inti

Selalu:

1. Periksa sebelum mengedit.
2. Buat rencana sebelum perubahan yang tidak sepele.
3. Bekerja secara bertahap.
4. Pilih perubahan terkecil yang diperlukan.
5. Tetap di dalam mission yang sedang dikerjakan.
6. Jangan mengubah kode yang tidak berkaitan.
7. Diagnosis dulu sebelum memperbaiki.
8. Dasarkan keputusan data dan layanan eksternal pada dokumentasi resmi.
9. Verifikasi di browser sebelum menyatakan berhasil.
10. Pertahankan perilaku yang sudah berfungsi.

Sebuah tugas tidak selesai hanya karena kode sumbernya tampak benar.

Sebuah tugas selesai hanya setelah kriteria penerimaannya terverifikasi.

---

## Stack Teknologi

Gunakan:

- HTML
- CSS
- JavaScript vanilla
- Leaflet
- OpenStreetMap
- Basemap Google Satellite (hanya lewat Google Map Tiles API resmi, lihat Layanan Eksternal)
- API bawaan browser (Canvas, fetch, File API)

Diizinkan **hanya setelah menjelaskan alasannya dan mendapat persetujuan**:

- Turf.js (geometri vektor / perhitungan luas)
- geotiff.js (membaca DEM GeoTIFF di browser)

Jangan gunakan kecuali diminta secara eksplisit:

- React, Vue, Angular, Next.js
- build system atau bundler frontend
- framework manajemen state
- framework komponen UI
- backend atau database

Jaga agar proyek tetap mudah dipahami pemula.

---

## Struktur Proyek yang Diharapkan

```text
.
├── AGENTS.md
├── SPEC.md
├── README.md
├── index.html
├── styles.css
├── app.js
├── data/
│   ├── DATA_SOURCES.md
│   └── (DEM dari pengguna, area kecil saja)
└── skills/
```

Jangan menata ulang repositori kecuali perlu.

---

## Kebijakan Data (Paling Penting)

Jangan pernah mengarang:

- nilai elevasi
- file DEM, ekstensi, resolusi, atau datum vertikal
- nilai curah hujan
- nilai tinggi muka air, pos duga air, atau ambang banjir
- identifier layer, endpoint layanan, proyeksi, format, rentang waktu
- catatan kejadian banjir, jumlah korban, angka kerugian, atau jumlah pengungsi
- batas administrasi atau nama tempat yang tidak berasal dari sumber

Data yang diizinkan:

1. **DEM**: disediakan pengguna dari sumber resmi (misalnya DEMNAS dari BIG, atau DEM lain yang terdokumentasi). Catat asal-usulnya di `data/DATA_SOURCES.md`.
2. **Observasi curah hujan (opsional)**: layer presipitasi NASA GIBS yang terverifikasi (misalnya IMERG), mengikuti langkah verifikasi di bawah.
3. **Input pengguna**: kenaikan tinggi muka air (meter) yang dimasukkan lewat UI. Ini parameter skenario, bukan observasi.

Jika dataset yang dibutuhkan tidak ada, **berhenti dan tanyakan kepada pengguna**. Jangan membuat data pengganti lalu menampilkannya sebagai data nyata.

Data sintetis hanya boleh dipakai untuk pengujian otomatis, harus berada di folder uji dengan nama yang jelas, dan tidak boleh ditampilkan di UI sebagai data nyata.

### Metadata DEM yang harus diketahui sebelum dipakai

```text
sumber / penerbit
nama file dan format
sistem koordinat (CRS)
datum vertikal / satuan
resolusi (ukuran sel)
ekstensi (bounding box)
nilai NoData
lisensi / ketentuan penggunaan
```

Laporkan setiap field yang tidak diketahui kepada pengguna, jangan diasumsikan.

---

## Aturan Simulasi

Model inti adalah **model bathtub**:

```text
sel tergenang = elevasi DEM <= tinggi muka air skenario
```

Aturan:

- Nyatakan asumsi model di UI: tanpa dinamika aliran, tanpa durasi, tanpa infiltrasi, tanpa drainase, tanpa hambatan.
- Tinggi muka air adalah nilai skenario dalam meter yang dimasukkan pengguna. Jelaskan dengan tegas acuannya (misalnya datum vertikal DEM atau elevasi acuan pilihan pengguna). Jangan menyebutnya prakiraan.
- Peningkatan opsional (mission tersendiri): konektivitas hidrologi, yaitu hanya sel yang terhubung ke sumber air terpilih yang tergenang. Jelaskan algoritmanya sebelum implementasi.
- Tangani sel NoData secara eksplisit. Jangan pernah menganggap NoData sebagai elevasi 0.
- Hitung luas dengan metode yang sesuai dengan CRS. Jangan mencampur derajat dan meter.
- Tampilkan hasil dengan satuan dan sebutkan resolusi DEM sebagai batas presisi.
- Jangan membuat klaim tentang risiko banjir nyata, keselamatan, atau evakuasi berdasarkan simulasi ini.

---

## Layanan Eksternal (OSM, Google Satellite, NASA GIBS)

### Basemap

Aplikasi menyediakan pengalih basemap antara **OpenStreetMap** dan **Google Satellite**.

Aturan Google Satellite:

- Gunakan hanya Google Map Tiles API resmi (session token + API key). Baca dokumentasi resminya terlebih dahulu dan laporkan endpoint pasti, persyaratan, dan aturan atribusinya sebelum implementasi.
- Jangan memakai URL tile tidak resmi atau hasil scraping (misalnya `mt0.google.com/vt/...`). Itu bukan cara akses yang disetujui menurut ketentuan Google.
- API key milik pengguna. Jangan pernah menuliskannya langsung di file yang di-commit; simpan di file lokal yang diabaikan git (misalnya `config.local.js`) dan tambahkan file itu ke `.gitignore`. Minta key kepada pengguna. Jangan mengarang key.
- Tampilkan atribusi yang diwajibkan Google untuk basemap tersebut.
- Jika key tidak ada atau permintaan gagal, kembali ke OpenStreetMap dan jelaskan alasannya. Sampai pengguna mengonfirmasi key dan cara aksesnya, gunakan OSM saja.
- Jika pengguna lebih suka opsi satelit tanpa key, laporkan alternatifnya (terverifikasi dari dokumentasi resmi) dan jangan menggantinya secara diam-diam.

### NASA GIBS

Untuk NASA GIBS (layer curah hujan opsional), jangan mengandalkan ingatan model. Sebelum memakai sebuah layer:

1. baca dokumentasi resmi;
2. periksa dokumen GetCapabilities atau katalog produk yang relevan;
3. verifikasi identifier layer yang persis;
4. verifikasi tipe raster/vektor, layanan, proyeksi, format, TileMatrixSet;
5. verifikasi ketersediaan temporal;
6. verifikasi legenda atau metadata gaya.

Laporkan bukti sebelum implementasi. Jangan memalsukan URL yang seolah berfungsi ketika sebuah layer tidak kompatibel dengan proyeksi yang dipilih. Laporkan ketidakcocokannya dan usulkan alternatif paling sederhana.

Jangan mengganti endpoint tidak terverifikasi secara diam-diam.

---

## Aturan Temporal

Jika layer curah hujan dipakai:

- waktu adalah state kelas satu;
- mengubah tanggal tidak boleh me-reload halaman atau mereset tampilan peta;
- jangan berasumsi semua layer memiliki cakupan waktu yang sama;
- tandai layer tidak tersedia untuk tanggal di luar rentang terverifikasinya.

---

## Aturan UI

Struktur desktop yang disukai:

```text
SIDEBAR KIRI
+
PETA KANAN
```

Sidebar boleh berisi:

- judul dan pemberitahuan permanen "simulasi edukasi sederhana"
- input tinggi muka air (slider + field numerik, dalam meter)
- pengalih basemap (OpenStreetMap / Google Satellite)
- toggle layer (hillshade/elevasi DEM, overlay banjir, curah hujan)
- kontrol opasitas
- legenda
- panel metadata DEM (hanya field terverifikasi)
- ringkasan simulasi (luas tergenang, dengan satuan dan metode)
- status data/layanan

Jangan menambahkan kartu untuk metrik kejadian yang dikarang. Jaga desain tetap sederhana. Perubahan responsif harus mempertahankan fungsi.

---

## Aturan Ringkasan Simulasi

Nilai ringkasan harus **dihitung dari DEM dan input skenario**, atau diambil dari metadata terverifikasi.

Diterima:

- tinggi muka air skenario (m)
- luas tergenang (ha atau km²) beserta metodenya
- persentase ekstensi DEM yang tergenang
- sumber DEM, resolusi, CRS, datum vertikal
- tanggal dan layer curah hujan terpilih (jika dipakai)

Tidak diterima:

- penduduk terdampak, kerugian, korban jiwa
- label risiko atau tingkat keparahan yang tidak didefinisikan sumber resmi
- prediksi, prakiraan, atau probabilitas

---

## Verifikasi Browser

Verifikasi browser wajib dilakukan setelah implementasi. Gunakan BrowserOS (MCP) atau tool browser lain yang tersedia untuk memeriksa:

- halaman termuat
- rendering Leaflet, pergantian basemap, dan atribusi tiap basemap
- DEM termuat
- overlay banjir berubah saat tinggi muka air berubah
- toggle layer dan opasitas
- legenda dan panel metadata
- kondisi error
- tata letak responsif
- error console dan request jaringan

Laporkan tiap item sebagai:

```text
PASS
FAIL
NOT VERIFIED
```

Jangan menyatakan tugas selesai selama ada kriteria wajib berstatus `FAIL` atau `NOT VERIFIED`.

Untuk hasil numerik, verifikasi minimal satu kasus dengan perhitungan independen (misalnya grid uji kecil yang hasilnya diketahui) dan laporkan.

---

## Alur Debugging

```text
REPRODUCE
   ↓
OBSERVE
   ↓
COLLECT EVIDENCE
   ↓
IDENTIFY ROOT CAUSE
   ↓
APPLY MINIMAL FIX
   ↓
RETEST
   ↓
REGRESSION CHECK
```

Sebelum mengubah kode, laporkan perilaku yang diharapkan, perilaku aktual, bukti, dan dugaan akar masalah. Jangan memulai dengan refactor besar.

---

## Penanganan Error

Tangani:

- file DEM hilang, tidak terbaca, atau memiliki CRS tak terduga
- DEM terlalu besar untuk browser (laporkan batasnya, jangan membuat halaman membeku)
- NoData / cakupan parsial
- input tinggi muka air di luar rentang atau bukan angka
- kegagalan permintaan capabilities/citra GIBS (jika dipakai)
- tanggal terpilih tidak tersedia untuk sebuah layer
- legenda tidak dapat dimuat
- jaringan offline

Aplikasi harus tetap dapat dipakai sedapat mungkin dan menjelaskan kegagalan dengan bahasa yang jelas.

---

## Checklist Regresi

```text
01 page load
02 Leaflet map
03 OpenStreetMap + Google Satellite basemaps, switcher, attribution, fallback
04 DEM loads with verified metadata
05 water-level input
06 flood overlay correct for a known test case
07 flooded area calculation with units
08 layer visibility toggles
09 layer opacity
10 legend
11 simplified-simulation notice visible
12 rainfall layer (if included) verified from official metadata
13 date/layer synchronization (if rainfall included)
14 error states
15 responsive layout
16 browser console/network
```

Item wajib harus `PASS` sebelum MVP dinyatakan selesai.

---

## Code Review

Saat diminta review, jangan langsung refactor. Urutkan temuan sebagai `Critical`, `High`, `Medium`, `Low`. Tinjau kebenaran, asumsi data, penanganan satuan/CRS, konfigurasi duplikat, sinkronisasi state, penanganan error, performa, dan aksesibilitas. Implementasikan hanya temuan yang disetujui.

---

## Urutan Mission

Ikuti urutan ini kecuali diminta lain:

```text
Mission 01  First Map
Mission 02  Establish Baseline
Mission 03  Research & Document Data Sources
Mission 04  Load DEM and Verify Metadata
Mission 05  Visualize Elevation
Mission 06  Bathtub Flood Overlay
Mission 07  Water-Level Control
Mission 08  Flooded Area Calculation
Mission 09  Legend & Metadata
Mission 10  Dashboard Shell
Mission 11  Layer Controls
Mission 12  Rainfall Layer (optional, GIBS)
Mission 13  Error Handling
Mission 14  Responsive Layout
Mission 15  Full Regression
Mission 16  Final Code Review
```

Jangan mengimplementasikan mission berikutnya lebih awal.

---

## Laporan Penyelesaian

Setelah sebuah tugas:

```text
CHANGED
file dan perilaku yang berubah

VERIFIED
apa yang benar-benar diuji

RESULT
PASS / FAIL / PARTIAL

NOT VERIFIED
apa pun yang belum divalidasi

NEXT
hanya mission berikutnya
```

Jangan pernah mengklaim pengujian yang tidak dilakukan.

---

## Aturan Emas

```text
Satu prompt != satu aplikasi.

Satu prompt = satu perubahan terkendali.
```

```text
Jangan mengarang data.
Jangan mengarang API.
Jangan menyajikan simulasi sebagai prediksi.
Jangan melewatkan verifikasi.
```

Model operasi bawaan:

```text
Arahan Manusia
+
Eksekusi Agent
+
Landasan Sumber Resmi
+
Verifikasi Berkelanjutan
```
