/**
 * HGO - Doğtaş Bayi Prim Hesaplama Sunucusu
 */
require('dotenv').config();
const express = require('express');
const path = require('path');

const uygulama = express();
const PORT = process.env.PORT || 3000;

// Middleware
uygulama.use(express.json());
uygulama.use(express.static(path.join(__dirname, '../public')));

// Rotalar
const authRotalari = require('./rotalar/auth');
const kullaniciRotalari = require('./rotalar/kullanicilar');
const hedeflerRotalari = require('./rotalar/hedefler');
const ekPrimRotalari = require('./rotalar/ek-prim');
const hesaplamaRotalari = require('./rotalar/hesaplama');

const { yetkilendirme, sadeceAdmin } = require('./middleware/yetkilendirme');

// Health check (public)
uygulama.get('/api/health', (req, res) => {
  res.json({ durum: 'aktif', zaman: new Date().toISOString() });
});

// Auth rotaları (public)
uygulama.use('/api/auth', authRotalari);

// Korumalı rotalar (token gerekli)
uygulama.use('/api/kullanicilar', yetkilendirme, sadeceAdmin, kullaniciRotalari);
uygulama.use('/api/hedefler', yetkilendirme, hedeflerRotalari);
uygulama.use('/api/ek-prim-dilimleri', yetkilendirme, ekPrimRotalari);
uygulama.use('/api/hesapla', yetkilendirme, hesaplamaRotalari);

// Giriş sayfası
uygulama.get('/giris', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/giris.html'));
});

// SPA fallback
uygulama.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

uygulama.listen(PORT, () => {
  console.log(`HGO sunucusu çalışıyor: http://localhost:${PORT}`);
});
