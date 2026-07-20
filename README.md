# Mekard Dashboard Pemberi Kerja

Prototype frontend responsif untuk tiga route:

- `/employer/dashboard` — dashboard utama pemberi kerja
- `/employer/jobs/create` — form lowongan + rekomendasi upah interaktif
- `/employer/jobs/[id]` — daftar pelamar, saran upah berbasis jarak, dan pemilihan pekerja

## Menjalankan lokal

Dari folder proyek:

```bash
python -m http.server 8080
```

Lalu buka `http://localhost:8080`.

## Arah visual

- Mengikuti homepage Mekard: latar putih, border tipis, dan aksen oranye seperlunya.
- Seluruh card utama menggunakan border tanpa shadow.
- Sidebar dibuat terang dan lebih ramping agar tidak terasa seperti dashboard enterprise yang berat.
- Radius, ukuran ikon, heading, tombol, serta jarak antar elemen diperkecil untuk tampilan yang lebih clean.

## Fitur interaktif

- Sidebar 3 mode: normal, compact, dan hidden. Klik ikon sidebar pada header atau gunakan `Alt + S`.
- Status sidebar tersimpan di `localStorage`.
- Sidebar mobile memakai drawer dan overlay.
- Kalkulator rekomendasi upah frontend berdasarkan durasi, keterampilan, risiko, tipe jadwal, jarak, dan jumlah pekerja.
- Filter nama, status, dan jarak pelamar.
- Modal pemilihan pekerja dan pembaruan kebutuhan pekerja.
- Tabs detail lowongan dan notifikasi toast.

## Integrasi produksi

Data di dalam prototype masih statis. Hubungkan form, daftar pelamar, perhitungan upah, autentikasi, peta, dan status pekerja terpilih ke API/backend proyek. Struktur CSS dan JavaScript sengaja dibuat tanpa framework agar mudah dipindahkan ke Laravel Blade, React, Vue, atau stack lain.

## Responsive refinement

The final responsive pass adds laptop-focused breakpoints for 1280–1540px layouts:
- narrower adaptive sidebar and content gutters;
- solid sticky header to prevent content ghosting;
- applicant summary cards move below the list on laptops;
- corrected applicant-row grid so wage/status/actions never overlap;
- create-job estimator becomes full width at 1280px;
- sticky form footer is disabled on short laptop screens;
- tablet/mobile applicant cards use an intentional two-row layout.


## Catatan alur produk

- Mekard tidak menangani pembayaran atau menyimpan saldo pemberi kerja.
- Cara dan waktu pembayaran dibicarakan langsung antara pemberi kerja dan pekerja di luar platform.
- Istilah legal seperti “kontrak” diganti dengan bahasa yang lebih ringan seperti “pekerja terpilih” dan “pilih pekerja”.
- Logo resmi Mekard tersedia di `assets/mekard-mark.png`; elemen dekoratif resmi tersedia di `assets/logo-decoration.png`.
