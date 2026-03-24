const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../utils/supabase-admin');

// GET /api/kullanicilar
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('kullanicilar')
      .select('id, eposta, ad, rol, aktif, dogtas_musteri_no, dogtas_kullanici_adi, olusturma_tarihi')
      .order('olusturma_tarihi', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Kullanıcı listeleme hatası:', err.message);
    res.status(500).json({ hata: err.message });
  }
});

// GET /api/kullanicilar/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('kullanicilar')
      .select('id, eposta, ad, rol, aktif, dogtas_musteri_no, dogtas_kullanici_adi, dogtas_client_id, dogtas_uygulama_kodu, olusturma_tarihi')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ hata: 'Kullanıcı bulunamadı' });
    res.json(data);
  } catch (err) {
    console.error('Kullanıcı detay hatası:', err.message);
    res.status(500).json({ hata: err.message });
  }
});

// POST /api/kullanicilar
router.post('/', async (req, res) => {
  try {
    const { eposta, sifre, ad, rol, dogtas_musteri_no, dogtas_kullanici_adi, dogtas_sifre, dogtas_client_id, dogtas_client_secret, dogtas_uygulama_kodu } = req.body;

    if (!eposta || !sifre || !ad) {
      return res.status(400).json({ hata: 'E-posta, şifre ve ad gerekli' });
    }

    // Supabase Auth'da kullanıcı oluştur
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: eposta,
      password: sifre,
      email_confirm: true
    });

    if (authError) throw authError;

    // kullanicilar tablosuna profil ekle
    const { data: profil, error: profilError } = await supabaseAdmin
      .from('kullanicilar')
      .insert({
        id: authData.user.id,
        eposta,
        ad,
        rol: rol || 'bayi',
        dogtas_musteri_no: dogtas_musteri_no || null,
        dogtas_kullanici_adi: dogtas_kullanici_adi || null,
        dogtas_sifre: dogtas_sifre || null,
        dogtas_client_id: dogtas_client_id || null,
        dogtas_client_secret: dogtas_client_secret || null,
        dogtas_uygulama_kodu: dogtas_uygulama_kodu || null
      })
      .select('id, eposta, ad, rol, aktif')
      .single();

    if (profilError) throw profilError;

    res.json(profil);
  } catch (err) {
    console.error('Kullanıcı oluşturma hatası:', err.message);
    res.status(500).json({ hata: err.message });
  }
});

// PUT /api/kullanicilar/:id
router.put('/:id', async (req, res) => {
  try {
    const { ad, rol, aktif, dogtas_musteri_no, dogtas_kullanici_adi, dogtas_sifre, dogtas_client_id, dogtas_client_secret, dogtas_uygulama_kodu } = req.body;

    const updates = { guncelleme_tarihi: new Date().toISOString() };
    if (ad !== undefined) updates.ad = ad;
    if (rol !== undefined) updates.rol = rol;
    if (aktif !== undefined) updates.aktif = aktif;
    if (dogtas_musteri_no !== undefined) updates.dogtas_musteri_no = dogtas_musteri_no;
    if (dogtas_kullanici_adi !== undefined) updates.dogtas_kullanici_adi = dogtas_kullanici_adi;
    if (dogtas_sifre !== undefined) updates.dogtas_sifre = dogtas_sifre;
    if (dogtas_client_id !== undefined) updates.dogtas_client_id = dogtas_client_id;
    if (dogtas_client_secret !== undefined) updates.dogtas_client_secret = dogtas_client_secret;
    if (dogtas_uygulama_kodu !== undefined) updates.dogtas_uygulama_kodu = dogtas_uygulama_kodu;

    const { data, error } = await supabaseAdmin
      .from('kullanicilar')
      .update(updates)
      .eq('id', req.params.id)
      .select('id, eposta, ad, rol, aktif')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Kullanıcı güncelleme hatası:', err.message);
    res.status(500).json({ hata: err.message });
  }
});

// DELETE /api/kullanicilar/:id (pasif yap)
router.delete('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('kullanicilar')
      .update({ aktif: false, guncelleme_tarihi: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('id, eposta, ad, aktif')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Kullanıcı silme hatası:', err.message);
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
