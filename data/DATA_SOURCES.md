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

## 2. Basemap (bukan data di repo)

| Data | Sumber | Status |
|---|---|---|
| OpenStreetMap tiles | `tile.openstreetmap.org` | Dipakai sejak Mission 01; atribusi wajib; ketentuan: <https://www.openstreetmap.org/copyright> |
| Google Satellite | Google Map Tiles API resmi | Belum diimplementasikan; memerlukan API key pengguna + verifikasi dokumentasi resmi (Mission berikutnya sesuai urutan) |

---

## 3. Data lain

Belum ada. Layer curah hujan NASA GIBS (opsional) belum diverifikasi — akan didokumentasikan
di sini hanya setelah langkah verifikasi resmi di `AGENTS.md` selesai.
