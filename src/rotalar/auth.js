const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = require('../utils/supabase-admin');

// Her giriş isteği için anon client oluştur
function anonClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// POST /api/auth/giris
router.post('/giris', async (req, res) => {
  try {
    const { eposta, sifre } = req.body;
    if (!eposta || !sifre) {
      return res.status(400).json({ hata: 'E-posta ve şifre gerekli' });
    }

    const supabase = anonClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: eposta,
      password: sifre
    });

    if (error) {
      return res.status(401).json({ hata: 'E-posta veya şifre hatalı' });
    }

    // Kullanıcı profilini getir
    const { data: profil } = await supabaseAdmin
      .from('kullanicilar')
      .select('id, eposta, ad, rol, aktif')
      .eq('id', data.user.id)
      .single();

    if (!profil || !profil.aktif) {
      return res.status(403).json({ hata: 'Hesap aktif değil' });
    }

    res.json({
      token: data.session.access_token,
      kullanici: profil
    });
  } catch (err) {
    console.error('Giriş hatası:', err.message);
    res.status(500).json({ hata: err.message });
  }
});

// POST /api/auth/cikis
router.post('/cikis', async (req, res) => {
  res.json({ basarili: true });
});

// GET /api/auth/profil (token gerekli)
router.get('/profil', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ hata: 'Token gerekli' });
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ hata: 'Geçersiz token' });
    }

    const { data: profil } = await supabaseAdmin
      .from('kullanicilar')
      .select('id, eposta, ad, rol, aktif')
      .eq('id', user.id)
      .single();

    if (!profil) {
      return res.status(404).json({ hata: 'Profil bulunamadı' });
    }

    res.json(profil);
  } catch (err) {
    console.error('Profil hatası:', err.message);
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
