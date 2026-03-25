const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../utils/supabase-admin');

// GET /api/kullanicilar
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('kullanicilar')
      .select('id, eposta, ad, rol, aktif, dogtas_musteri_no, olusturma_tarihi')
      .order('olusturma_tarihi', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Kullanıcı listeleme hatası:', err.message);
    res.status(500).json({ hata: err.message });
  }
});

// POST /api/kullanicilar — Admin sadece e-posta ile davet oluşturur
router.post('/', async (req, res) => {
  try {
    const { eposta } = req.body;

    if (!eposta) {
      return res.status(400).json({ hata: 'E-posta gerekli' });
    }

    // Geçici şifre ile Auth kullanıcısı oluştur (kullanıcı sonra değiştirecek)
    const geciciSifre = `Temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: eposta,
      password: geciciSifre,
      email_confirm: true
    });

    if (authError) throw authError;

    // kullanicilar tablosuna profil ekle (bilgiler boş, kullanıcı dolduracak)
    const { data: profil, error: profilError } = await supabaseAdmin
      .from('kullanicilar')
      .insert({
        id: authData.user.id,
        eposta,
        ad: eposta.split('@')[0],
        rol: 'bayi',
        aktif: true,
        sifre_belirlendi: false
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

// PUT /api/kullanicilar/:id — Admin: aktif/pasif + rol güncelleme
router.put('/:id', async (req, res) => {
  try {
    const { aktif, rol } = req.body;
    const updates = { guncelleme_tarihi: new Date().toISOString() };
    if (aktif !== undefined) updates.aktif = aktif;
    if (rol !== undefined) updates.rol = rol;

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

// DELETE /api/kullanicilar/:id — Pasif yap
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
