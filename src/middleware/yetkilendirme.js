const supabaseAdmin = require('../utils/supabase-admin');

async function yetkilendirme(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ hata: 'Token gerekli' });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ hata: 'Geçersiz token' });
    }

    const { data: profil } = await supabaseAdmin
      .from('kullanicilar')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profil || !profil.aktif) {
      return res.status(403).json({ hata: 'Hesap aktif değil' });
    }

    req.kullanici = profil;
    next();
  } catch (err) {
    console.error('Yetkilendirme hatası:', err.message);
    res.status(401).json({ hata: 'Yetkilendirme başarısız' });
  }
}

function sadeceAdmin(req, res, next) {
  if (req.kullanici.rol !== 'admin') {
    return res.status(403).json({ hata: 'Bu işlem için admin yetkisi gerekli' });
  }
  next();
}

module.exports = { yetkilendirme, sadeceAdmin };
