# DATA_SOURCES.md

Berkas ini mencatat asal-usul dan metadata data yang dipakai di proyek ini.
Aturan mainnya (lihat `AGENTS.md`): **jangan mengarang nilai**. Field yang tidak bisa
diverifikasi dari file atau dari pernyataan tertulis pengguna ditulis **"belum diketahui"**.

Status penulisan: Mission 03 (Research & Document Data Sources).

---

## 1. DEM

### 1a. Sumber data (pernyataan pengguna — bukan hasil pembacaan file)

| Field | Nilai |
|---|---|
| Sumber / penerbit | DEMNAS, Badan Informasi Geospasial (BIG) |
| Lembar/tile asal | DEMNAS_1608-31_v1.0, DEMNAS_1608-32_v1.0, DEMNAS_1608-33_v1.0 (mosaik tiga lembar) |
| Nama produk | DEMNAS 8,35 m |
| Proses | File di folder ini adalah hasil **clip dan reprojeksi** dari ketiga lembar tersebut menjadi satu GeoTIFF |

### 1b. Metadata terverifikasi dari file

File: `data/DEMNAS_ok.tif`

| Field | Nilai | Metode verifikasi |
|---|---|---|
| Format | GeoTIFF, 1 band, Float32 | rasterio (driver `GTiff`) |
| Ukuran file | 128.603.794 byte | ukuran file di disk |
| Sidecar | `DEMNAS_ok.tfw`, `DEMNAS_ok.tif.aux.xml`, `DEMNAS_ok.tif.ovr`, `DEMNAS_ok.tif.xml` | daftar file |
| Dimensi | 6658 kolom × 6675 baris | rasterio |
| CRS horizontal | WGS 84 / UTM zone 49S, satuan metre; sidecar Esri menyatakan `EPSG:32749` | WKT internal GeoTIFF (rasterio) + `<peXml>` di `DEMNAS_ok.tif.xml` |
| Resolusi sel | 8,344380363942228 m × 8,344380363942253 m (tanpa rotasi) | geotransform rasterio; identik dengan `DEMNAS_ok.tfw` |
| Ekstensi (meter UTM) | barat 775582,6046934524 · timur 831139,4891565797 · selatan 9114492,466198916 · utara 9170191,20512823 | rasterio `bounds`; konsisten dengan `<nativeExtBox>` di `DEMNAS_ok.tif.xml` |
| Ukuran cakupan (nilai turunan, dihitung dari ekstensi) | ± 55,56 km × 55,70 km | selisih batas koordinat |
| NoData | -3,4028234663852886 × 10³⁸ (tepat: `-3.4028234663852886e+38`, nilai minimum Float32) | tag GDAL NoData di dalam file |
| AREA_OR_POINT | Area | tag dataset rasterio |
| Statistik nilai band (informasi, bukan metadata geospasial) | minimum -4,5633263587952 · maksimum 3046,2702636719 · rerata 455,32076457976 · standar deviasi 603,09008490489 | `DEMNAS_ok.tif.aux.xml` / band tags rasterio |

Catatan: nilai resolusi (8,3444 m) sedikit berbeda dari nama produk "8,35 m" karena file ini
hasil clip/reprojeksi, bukan lembar mentah.

### 1c. Field yang belum diketahui

| Field | Status | Alasan / catatan |
|---|---|---|
| Datum vertikal | **belum diketahui** | Tidak dideklarasikan di dalam file. Pernyataan pengguna: DEMNAS "biasanya EGM2008" — ini **asumsi umum yang belum terverifikasi**, bukan fakta dari file atau dokumen resmi. |
| Satuan nilai elevasi | **belum diketahui** | Tidak dideklarasikan di dalam file. Umumnya meter untuk produk DEMNAS, tetapi belum terverifikasi dari file/metadata resmi. |
| Lisensi resmi DEMNAS | **belum diketahui** | Belum diverifikasi dari dokumen/ketentuan resmi BIG. Pernyataan pengguna: file ini boleh dipakai untuk proyek ini; pengguna juga menyatakan DEM selain DEMNAS diizinkan. |
| Tautan unduhan resmi / tanggal pengambilan lembar | **belum diketahui** | Tidak ada di dalam file. |
| Parameter proses clip (wilayah klip, alat, tanggal proses) | **belum diketahui** | Hanya diketahui bahwa file adalah hasil clip + reprojeksi. |

---

### 1d. Turunan DEM untuk browser (Mission 04)

File induk `DEMNAS_ok.tif` terlalu besar untuk dimuat langsung di browser (± 123 MB di disk,
± 177 MB saat ter-decode). Turunan berukuran kecil dibuat untuk aplikasi web.
**Wilayah studi:** Kecamatan Besuki, Kabupaten Situbondo — bbox WGS84
(barat, selatan, timur, utara) = 113,64944 · -7,75947 · 113,74283 · -7,70878.
Bbox ini **terverifikasi berada di dalam** ekstensi DEM induk (margin 16,7 km di barat ·
28,6 km di timur · 26,8 km di selatan · 23,2 km di utara).

| Field | Nilai |
|---|---|
| Berkas turunan | `data/DEMNAS_ok_besuki.geotiff` (ekstensi `.geotiff`, bukan `.tif`: browser agent BrowserOS mengembalikan HTTP 204 untuk ekstensi `.tif`/`.tiff`/`.pdf`, sedangkan `.geotiff` tersaji normal; isi file tetap GeoTIFF standar) |
| Ukuran file | 2.954.892 byte |
| SHA-256 turunan | `3e251c494c73aac1c56693cabe8a554fa07875d9bd5867e303103625ac685c33` |
| SHA-256 induk | `df08b5efe5e81e9189f99ba3be8aca6dd709c86d6e83d01f358a1d5a0dd14936` |
| Tanggal pembuatan | 2026-10-17 (UTC) |
| Metode | Clip jendela pada CRS sumber (EPSG:32749) lalu reproyeksi bilinear ke EPSG:3857 |
| Aturan NoData saat reproyeksi | Sel keluaran menjadi NoData jika salah satu dari 4 tetangga bilinear-nya NoData |
| Kompresi / susunan | DEFLATE, tanpa predictor, tiled 256×256 |
| Dimensi | 1247 kolom × 684 baris = 852.948 sel (semua valid, 0 sel NoData) |
| CRS keluaran | EPSG:3857 (WGS 84 / Pseudo-Mercator), satuan metre |
| Resolusi | 8,344380363942228 m × 8,344380363942228 m (piksel mercator); ≈ 8,264 m di permukaan tanah pada lintang tengah -7,734° |
| Ekstensi (EPSG:3857) | barat 12651390,699 · selatan -866438,735 · timur 12661796,142 · utara -860731,179 |
| Ekstensi (WGS84) | barat 113,64938 · selatan -7,75952 · timur 113,74285 · utara -7,70872 |
| NoData | -3.4028234663852886e+38 (sama dengan induk) |
| Tipe data | Float32 (presisi nilai dipertahankan; tidak dikuantisasi ke integer) |
| Nilai valid (dari file turunan) | min -4,427 · maks 237,751 · rerata 13,226 — **satuan mewarisi status "belum diketahui"** dari induk |
| Alat | Python 3.12.5, rasterio 1.3.11, pyproj 3.7.0, numpy 2.1.3 (env `PROJ_DATA` diarahkan ke proj_data bawaan rasterio karena `PROJ_LIB` sistem memuat data PostGIS yang tidak lengkap) |

**Pernyataan jujur tentang turunan ini:** nilai elevasi mengalami interpolasi bilinear saat
reproyeksi (perpindahan grid UTM → Mercator), sehingga nilainya bukan salinan piksel-mentah
induk; resolusi ground efektif sedikit berbeda; satuan elevasi dan datum vertikal tetap
"belum diketahui" seperti induk.

**Titik uji (untuk verifikasi lintas-alat):**

| Lon, Lat | Piksel (kolom, baris) | Nilai turunan (m?) | Nilai terdekat di induk | Selisih |
|---|---|---|---|---|
| 113,66000, -7,75500 | 141, 623 | 87,4228515625 | 87,4440155029 | 0,021 |
| 113,69600, -7,73400 | 621, 340 | 9,6680259705 | 9,2470912933 | 0,421 |
| 113,73500, -7,71500 | 1142, 84 | -2,9059779644 | -2,9055809975 | < 0,001 |

---

## 2. Basemap (bukan data di repo)

| Data | Sumber | Status |
|---|---|---|
| OpenStreetMap tiles | `tile.openstreetmap.org` | Dipakai sejak Mission 01; atribusi wajib; ketentuan: <https://www.openstreetmap.org/copyright> |
| Google Satellite | Google Map Tiles API resmi | Belum diimplementasikan; memerlukan API key pengguna + verifikasi dokumentasi resmi (Mission berikutnya sesuai urutan) |

---

## 3. Data lain

Belum ada. Layer curah hujan NASA GIBS (opsional) belum diverifikasi — akan didokumentasikan
di sini hanya setelah langkah verifikasi resmi di `AGENTS.md` selesai.
