const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../utils/supabase-admin');

// GET /api/ek-prim-dilimleri?yil=2026&ceyrek=Q1
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
      .from('ek_prim_dilimleri')
      .select('*')
      .eq('kullanici_id', kullaniciId)
      .eq('yil', Number(yil))
      .eq('ceyrek', ceyrek)
      .order('alt_sinir', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Ek prim getirme hatası:', err.message);
    res.status(500).json({ hata: err.message });
  }
});

// POST /api/ek-prim-dilimleri
router.post('/', async (req, res) => {
  try {
    const { yil, ceyrek, dilimler } = req.body;
    if (!yil || !ceyrek || !dilimler) {
      return res.status(400).json({ hata: 'yil, ceyrek ve dilimler gerekli' });
    }

    const kullaniciId = req.kullanici.rol === 'admin' && req.body.kullanici_id
      ? req.body.kullanici_id
      : req.kullanici.id;

    // Önce mevcut kayıtları sil
    const { error: delErr } = await supabaseAdmin
      .from('ek_prim_dilimleri')
      .delete()
      .eq('kullanici_id', kullaniciId)
      .eq('yil', Number(yil))
      .eq('ceyrek', ceyrek);

    if (delErr) throw delErr;

    // Yeni kayıtları ekle
    const rows = dilimler.map(d => ({
      kullanici_id: kullaniciId,
      yil: Number(yil),
      ceyrek,
      alt_sinir: d.alt_sinir,
      prim_orani: d.prim_orani
    }));

    const { error: insErr } = await supabaseAdmin
      .from('ek_prim_dilimleri')
      .insert(rows);

    if (insErr) throw insErr;

    res.json({ basarili: true });
  } catch (err) {
    console.error('Ek prim kaydetme hatası:', err.message);
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
