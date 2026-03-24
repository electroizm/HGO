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
const hedeflerRotalari = require('./rotalar/hedefler');
const ekPrimRotalari = require('./rotalar/ek-prim');
const hesaplamaRotalari = require('./rotalar/hesaplama');

// Health check
uygulama.get('/api/health', (req, res) => {
  res.json({ durum: 'aktif', zaman: new Date().toISOString() });
});

uygulama.use('/api/hedefler', hedeflerRotalari);
uygulama.use('/api/ek-prim-dilimleri', ekPrimRotalari);
uygulama.use('/api/hesapla', hesaplamaRotalari);

// SPA fallback
uygulama.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

uygulama.listen(PORT, () => {
  console.log(`HGO sunucusu çalışıyor: http://localhost:${PORT}`);
});
