const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = require('../utils/supabase-admin');

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

    const { data: profil } = await supabaseAdmin
      .from('kullanicilar')
      .select('id, eposta, ad, rol, aktif, sifre_belirlendi, dogtas_musteri_no, dogtas_kullanici_adi')
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

// POST /api/auth/kayit — Davet edilen kullanıcı şifre belirler + bilgilerini girer
router.post('/kayit', async (req, res) => {
  try {
    const { eposta, sifre, ad, dogtas_musteri_no, dogtas_kullanici_adi, dogtas_sifre, dogtas_client_id, dogtas_client_secret, dogtas_uygulama_kodu } = req.body;

    if (!eposta || !sifre) {
      return res.status(400).json({ hata: 'E-posta ve şifre gerekli' });
    }

    // Kullanıcıyı bul
    const { data: profil } = await supabaseAdmin
      .from('kullanicilar')
      .select('id, aktif, sifre_belirlendi')
      .eq('eposta', eposta)
      .single();

    if (!profil) {
      return res.status(404).json({ hata: 'Bu e-posta ile davet bulunamadı. Admin tarafından davet edilmeniz gerekiyor.' });
    }

    if (!profil.aktif) {
      return res.status(403).json({ hata: 'Hesap aktif değil' });
    }

    if (profil.sifre_belirlendi) {
      return res.status(400).json({ hata: 'Bu hesap için şifre zaten belirlenmiş. Giriş yapın.' });
    }

    // Auth şifresini güncelle
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(profil.id, {
      password: sifre
    });
    if (authErr) throw authErr;

    // Profili güncelle
    const updates = {
      sifre_belirlendi: true,
      guncelleme_tarihi: new Date().toISOString()
    };
    if (ad) updates.ad = ad;
    if (dogtas_musteri_no) updates.dogtas_musteri_no = dogtas_musteri_no;
    if (dogtas_kullanici_adi) updates.dogtas_kullanici_adi = dogtas_kullanici_adi;
    if (dogtas_sifre) updates.dogtas_sifre = dogtas_sifre;
    if (dogtas_client_id) updates.dogtas_client_id = dogtas_client_id;
    if (dogtas_client_secret) updates.dogtas_client_secret = dogtas_client_secret;
    if (dogtas_uygulama_kodu) updates.dogtas_uygulama_kodu = dogtas_uygulama_kodu;

    const { error: updateErr } = await supabaseAdmin
      .from('kullanicilar')
      .update(updates)
      .eq('id', profil.id);

    if (updateErr) throw updateErr;

    // Otomatik giriş yap
    const supabase = anonClient();
    const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
      email: eposta,
      password: sifre
    });

    if (loginErr) throw loginErr;

    const { data: guncelProfil } = await supabaseAdmin
      .from('kullanicilar')
      .select('id, eposta, ad, rol, aktif, sifre_belirlendi, dogtas_musteri_no, dogtas_kullanici_adi')
      .eq('id', profil.id)
      .single();

    res.json({
      token: loginData.session.access_token,
      kullanici: guncelProfil
    });
  } catch (err) {
    console.error('Kayıt hatası:', err.message);
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
      .select('id, eposta, ad, rol, aktif, sifre_belirlendi, dogtas_musteri_no, dogtas_kullanici_adi, dogtas_client_id, dogtas_uygulama_kodu')
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

// PUT /api/auth/profil (token gerekli) — Kullanıcı kendi bilgilerini günceller
router.put('/profil', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ hata: 'Token gerekli' });
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ hata: 'Geçersiz token' });
    }

    const { ad, yeni_sifre, dogtas_musteri_no, dogtas_kullanici_adi, dogtas_sifre, dogtas_client_id, dogtas_client_secret, dogtas_uygulama_kodu } = req.body;

    // Şifre değişikliği
    if (yeni_sifre) {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: yeni_sifre
      });
      if (authErr) throw authErr;
    }

    // Profil güncelle
    const updates = { guncelleme_tarihi: new Date().toISOString() };
    if (ad !== undefined) updates.ad = ad;
    if (dogtas_musteri_no !== undefined) updates.dogtas_musteri_no = dogtas_musteri_no;
    if (dogtas_kullanici_adi !== undefined) updates.dogtas_kullanici_adi = dogtas_kullanici_adi;
    if (dogtas_sifre !== undefined) updates.dogtas_sifre = dogtas_sifre;
    if (dogtas_client_id !== undefined) updates.dogtas_client_id = dogtas_client_id;
    if (dogtas_client_secret !== undefined) updates.dogtas_client_secret = dogtas_client_secret;
    if (dogtas_uygulama_kodu !== undefined) updates.dogtas_uygulama_kodu = dogtas_uygulama_kodu;

    const { data: profil, error: updateErr } = await supabaseAdmin
      .from('kullanicilar')
      .update(updates)
      .eq('id', user.id)
      .select('id, eposta, ad, rol, aktif, dogtas_musteri_no, dogtas_kullanici_adi, dogtas_client_id, dogtas_uygulama_kodu')
      .single();

    if (updateErr) throw updateErr;

    res.json(profil);
  } catch (err) {
    console.error('Profil güncelleme hatası:', err.message);
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
