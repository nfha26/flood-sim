# SPEC.md

# WebGIS Simulasi Banjir — Model Bathtub Sederhana

## Konteks

WebGIS edukasi tempat pengguna memasukkan tinggi muka air skenario dan melihat area mana dalam wilayah studi kecil yang akan tergenang menurut **model bathtub sederhana** di atas DEM dari sumber resmi.

Ini **bukan** prakiraan banjir, **bukan** simulasi hidrodinamika, dan **bukan** peta bahaya resmi.

Lingkungan: Windows native, proyek di drive D, OpenCode + BrowserOS (MCP).

---

## Tujuan Pengguna

Pengguna dapat mengeksplorasi bagaimana kenaikan tinggi muka air mengubah area genangan di atas dataset elevasi nyata, memahami batasan model, dan membaca metadata terverifikasi tentang data yang dipakai.

---

## Fitur MVP

Pengguna dapat:

1. membuka peta Leaflet interaktif;
2. beralih antara OpenStreetMap dan Google Satellite sebagai basemap acuan;
3. memuat DEM dari pengguna untuk wilayah studi kecil;
4. memeriksa metadata DEM terverifikasi (sumber, CRS, datum vertikal, resolusi, ekstensi, NoData, lisensi);
5. melihat elevasi (misalnya hillshade atau color ramp) beserta legenda;
6. memasukkan tinggi muka air skenario dalam meter (slider + input numerik);
7. melihat area genangan digambar sebagai overlay banjir yang diperbarui saat level berubah;
8. melihat luas tergenang (ha atau km²) dan persentase ekstensi DEM, beserta metode perhitungannya;
9. menyalakan/mematikan layer dan mengubah opasitas;
10. selalu melihat pemberitahuan bahwa ini simulasi edukasi sederhana;
11. mendapat tampilan UI yang berguna saat data hilang atau tidak valid.

Opsional (setelah MVP): layer presipitasi NASA GIBS yang terverifikasi (misalnya IMERG) dengan pemilih tanggal, ditampilkan hanya sebagai konteks dan tidak dipakai dalam perhitungan banjir.

---

## Data

| Data | Sumber | Aturan |
|------|--------|--------|
| DEM | Disediakan pengguna, dari sumber resmi (misalnya DEMNAS dari BIG) | Asal-usul dicatat di `data/DATA_SOURCES.md` |
| Basemap (jalan) | OpenStreetMap | Atribusi wajib |
| Basemap (satelit) | Google Satellite, lewat Google Map Tiles API resmi | Memerlukan API key dari pengguna; cara akses dan ketentuan diverifikasi dari dokumentasi resmi Google; atribusi/logo wajib; URL tile tidak resmi tidak diizinkan |
| Curah hujan (opsional) | NASA GIBS | Identifier, proyeksi, format, rentang waktu diverifikasi dari GetCapabilities |
| Tinggi muka air | Input pengguna | Parameter skenario, bukan observasi |

Jika DEM tidak tersedia, agent berhenti dan bertanya kepada pengguna. Agent tidak boleh membuat DEM palsu.

---

## Definisi Simulasi

```text
tergenang(sel) = elevasi(sel) <= tinggi_muka_air
```

Asumsi yang ditampilkan di UI:

- tanpa aliran air, durasi, infiltrasi, drainase, atau hambatan;
- akurasi dibatasi oleh resolusi dan akurasi vertikal DEM;
- tinggi muka air relatif terhadap datum vertikal DEM (atau acuan yang ditentukan pengguna);
- sel NoData dikecualikan, tidak pernah dianggap elevasi 0.

Kemungkinan mission lanjutan: konektivitas hidrologi dari sel sumber pilihan pengguna. Perlu algoritma yang dijelaskan dan persetujuan terlebih dahulu.

---

## Metadata dan Hasil yang Ditampilkan

Hanya field terverifikasi atau hasil hitung yang ditampilkan:

- sumber, file, format DEM
- CRS, datum vertikal dan satuan
- ukuran sel / resolusi
- ekstensi
- tinggi muka air skenario (m)
- luas tergenang beserta satuan dan metode
- persentase ekstensi yang tergenang
- (opsional) judul layer curah hujan, identifier, tanggal, legenda

---

## Di Luar Cakupan

- jumlah korban, kerugian, atau pengungsi
- estimasi penduduk terdampak
- prediksi banjir real-time atau prakiraan
- pemodelan hidrodinamika (aliran, routing, drainase)
- "kejadian" sintetis atau pos duga air yang dikarang
- autentikasi, database, backend
- prediksi AI
- panel admin

---

## Arsitektur yang Disukai

```text
DEM resmi (dari pengguna)            NASA GIBS (opsional)
        │                                   │
        ▼                                   ▼
 Konfigurasi data terverifikasi ──► Konfigurasi layer terverifikasi
        │                                   │
        └──────────────► app.js ◄───────────┘
                           │
        ┌──────────────────┼───────────────┐
        ▼                  ▼               ▼
     Leaflet        Mesin simulasi      Kontrol /
   (peta + canvas)  (bathtub + luas)   Metadata / Legenda
        │
        ▼
 Verifikasi Browser (BrowserOS)
```

---

## Kriteria Penerimaan

### First Map

GIVEN aplikasi dibuka
WHEN halaman dimuat
THEN peta Leaflet yang berfungsi tampil dengan tile OSM dan atribusi.

### Basemap Switching

GIVEN peta sudah dimuat
WHEN pengguna beralih antara OpenStreetMap dan Google Satellite
THEN basemap berganti tanpa me-reload halaman atau mereset tampilan peta, atribusi yang benar tampil untuk tiap basemap, dan layer DEM/banjir tetap berada di atas basemap.

Jika basemap Google Satellite tidak dapat dimuat (key hilang, kuota, jaringan), aplikasi kembali ke OpenStreetMap dan menjelaskan alasannya.

### DEM Loading

GIVEN DEM dari pengguna yang valid
WHEN aplikasi memuatnya
THEN DEM tampil di lokasi yang benar dan metadatanya ditampilkan tanpa field yang dikarang.

### Water Level

GIVEN DEM sudah dimuat
WHEN pengguna mengubah tinggi muka air
THEN overlay banjir diperbarui tanpa me-reload halaman atau mereset tampilan peta.

### Correctness

GIVEN grid uji kecil dengan elevasi diketahui dan tinggi muka air diketahui
WHEN simulasi dijalankan
THEN sel tergenang dan luas tergenang sesuai dengan hasil yang dihitung secara independen.

### Area and Units

GIVEN hasil genangan
WHEN ringkasan ditampilkan
THEN luas ditampilkan dengan satuan yang benar, memakai metode yang sesuai dengan CRS DEM, dan resolusi DEM dinyatakan.

### Layers

GIVEN beberapa layer
WHEN pengguna menyalakan/mematikan layer atau mengubah opasitas
THEN hanya layer tersebut yang terpengaruh.

### Legend

GIVEN layer elevasi atau banjir yang terlihat
WHEN layer itu aktif
THEN legenda beserta satuannya ditampilkan.

### Disclaimer

GIVEN kondisi aplikasi apa pun
THEN pemberitahuan "simulasi edukasi sederhana, bukan prediksi" terlihat.

### Error State

GIVEN DEM hilang, tidak terbaca, terlalu besar, atau input tidak valid
WHEN kegagalan terjadi
THEN aplikasi tetap dapat dipakai dan menjelaskan masalahnya.

### Rainfall (opsional)

GIVEN layer presipitasi GIBS yang terverifikasi
WHEN pengguna memilih tanggal valid lain
THEN layer diperbarui tanpa reload halaman atau reset peta, dan tanggal yang tidak tersedia ditandai.

---

## Penyelesaian MVP

MVP selesai hanya setelah checklist regresi lengkap di `AGENTS.md` terverifikasi.
