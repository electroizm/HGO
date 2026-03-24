# HGO - Doğtaş Bayi Prim Hesaplama

## Proje Hakkında
Doğtaş bayileri için Hedef Gerçekleşme Oranı (HGO) bazlı prim hesaplama web uygulaması.
Python/PyQt5 masaüstü uygulamasından dönüştürülmüştür.

## Teknoloji
- **Backend:** Node.js + Express.js
- **Frontend:** Vanilla HTML + CSS + JavaScript (framework yok)
- **Veritabanı:** Supabase (PostgreSQL)
- **Deploy:** GitHub → Render.com → gunesler.info/hgo

## Çalıştırma
```bash
npm install
cp .env.example .env  # .env'yi doldur
npm run dev            # geliştirme (--watch)
npm start              # prodüksiyon
```

## Dosya Yapısı
```
src/sunucu.js           - Express sunucu
src/rotalar/hedefler.js - Hedef CRUD API
src/rotalar/ek-prim.js  - Ek prim dilimleri CRUD API
src/rotalar/hesaplama.js - Doğtaş API + prim hesaplama
src/utils/supabase.js   - Supabase client
src/utils/dogtas-api.js - Doğtaş API client
src/utils/prim-hesap.js - Prim hesaplama motoru
public/                 - Frontend statik dosyalar
```

## Supabase Tabloları
- `hedefler` — yil, ceyrek, ay, hedef_tutar
- `ek_prim_dilimleri` — yil, ceyrek, alt_sinir, prim_orani

## Prim Kuralları
- HGO = (Sipariş / Hedef) × 100
- ≥120% → %3, ≥110% → %2.5, ≥100% → %2, ≥90% → %1, <90% → %0
- Ek hacim primi: Çeyrek HGO ≥100% ve ciro barajına göre %1-5

## API Filtreleme
- `iptal` durumundaki siparişleri çıkar
- `odemeKosulu: Z347` olanları çıkar
- `orderId + orderLineId` ile duplicate eliminasyonu

## Kod Dili
Değişken/fonksiyon adları Türkçe (Barkod projesiyle tutarlı).
