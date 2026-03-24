const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

// GET /api/hedefler?yil=2026&ceyrek=Q1
router.get('/', async (req, res) => {
  try {
    const { yil, ceyrek } = req.query;
    if (!yil || !ceyrek) {
      return res.status(400).json({ hata: 'yil ve ceyrek parametreleri gerekli' });
    }

    const { data, error } = await supabase
      .from('hedefler')
      .select('*')
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
// Body: { yil, ceyrek, hedefler: [{ ay, hedef_tutar }] }
router.post('/', async (req, res) => {
  try {
    const { yil, ceyrek, hedefler } = req.body;
    if (!yil || !ceyrek || !hedefler) {
      return res.status(400).json({ hata: 'yil, ceyrek ve hedefler gerekli' });
    }

    // Önce mevcut kayıtları sil
    const { error: delErr } = await supabase
      .from('hedefler')
      .delete()
      .eq('yil', Number(yil))
      .eq('ceyrek', ceyrek);

    if (delErr) throw delErr;

    // Yeni kayıtları ekle
    const rows = hedefler.map(h => ({
      yil: Number(yil),
      ceyrek,
      ay: h.ay,
      hedef_tutar: h.hedef_tutar
    }));

    const { error: insErr } = await supabase
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
