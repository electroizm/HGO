const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

// GET /api/ek-prim-dilimleri?yil=2026&ceyrek=Q1
router.get('/', async (req, res) => {
  try {
    const { yil, ceyrek } = req.query;
    if (!yil || !ceyrek) {
      return res.status(400).json({ hata: 'yil ve ceyrek parametreleri gerekli' });
    }

    const { data, error } = await supabase
      .from('ek_prim_dilimleri')
      .select('*')
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
// Body: { yil, ceyrek, dilimler: [{ alt_sinir, prim_orani }] }
router.post('/', async (req, res) => {
  try {
    const { yil, ceyrek, dilimler } = req.body;
    if (!yil || !ceyrek || !dilimler) {
      return res.status(400).json({ hata: 'yil, ceyrek ve dilimler gerekli' });
    }

    // Önce mevcut kayıtları sil
    const { error: delErr } = await supabase
      .from('ek_prim_dilimleri')
      .delete()
      .eq('yil', Number(yil))
      .eq('ceyrek', ceyrek);

    if (delErr) throw delErr;

    // Yeni kayıtları ekle
    const rows = dilimler.map(d => ({
      yil: Number(yil),
      ceyrek,
      alt_sinir: d.alt_sinir,
      prim_orani: d.prim_orani
    }));

    const { error: insErr } = await supabase
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
