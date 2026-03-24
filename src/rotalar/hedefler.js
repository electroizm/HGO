const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../utils/supabase-admin');

// GET /api/hedefler?yil=2026&ceyrek=Q1
router.get('/', async (req, res) => {
  try {
    const { yil, ceyrek } = req.query;
    if (!yil || !ceyrek) {
      return res.status(400).json({ hata: 'yil ve ceyrek parametreleri gerekli' });
    }

    const kullaniciId = req.kullanici.rol === 'admin' && req.query.kullanici_id
      ? req.query.kullanici_id
      : req.kullanici.id;

    const { data, error } = await supabaseAdmin
      .from('hedefler')
      .select('*')
      .eq('kullanici_id', kullaniciId)
      .eq('yil', Number(yil))
      .eq('ceyrek', ceyrek)
      .order('ay');

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Hedef getirme hatası:', err.message);
    res.status(500).json({ hata: err.message });
  }
});

// POST /api/hedefler
router.post('/', async (req, res) => {
  try {
    const { yil, ceyrek, hedefler } = req.body;
    if (!yil || !ceyrek || !hedefler) {
      return res.status(400).json({ hata: 'yil, ceyrek ve hedefler gerekli' });
    }

    const kullaniciId = req.kullanici.rol === 'admin' && req.body.kullanici_id
      ? req.body.kullanici_id
      : req.kullanici.id;

    // Önce mevcut kayıtları sil
    const { error: delErr } = await supabaseAdmin
      .from('hedefler')
      .delete()
      .eq('kullanici_id', kullaniciId)
      .eq('yil', Number(yil))
      .eq('ceyrek', ceyrek);

    if (delErr) throw delErr;

    // Yeni kayıtları ekle
    const rows = hedefler.map(h => ({
      kullanici_id: kullaniciId,
      yil: Number(yil),
      ceyrek,
      ay: h.ay,
      hedef_tutar: h.hedef_tutar
    }));

    const { error: insErr } = await supabaseAdmin
      .from('hedefler')
      .insert(rows);

    if (insErr) throw insErr;

    res.json({ basarili: true });
  } catch (err) {
    console.error('Hedef kaydetme hatası:', err.message);
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
