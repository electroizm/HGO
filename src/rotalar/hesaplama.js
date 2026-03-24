const express = require('express');
const router = express.Router();
const dogtasApi = require('../utils/dogtas-api');
const prim = require('../utils/prim-hesap');
const supabaseAdmin = require('../utils/supabase-admin');

// POST /api/hesapla
router.post('/', async (req, res) => {
  try {
    const { yil, ceyrek, hedefler } = req.body;

    if (!yil || !ceyrek || !hedefler) {
      return res.status(400).json({ hata: 'yil, ceyrek ve hedefler gerekli' });
    }

    const kullaniciId = req.kullanici.rol === 'admin' && req.body.kullanici_id
      ? req.body.kullanici_id
      : req.kullanici.id;

    // Kullanıcının Dogtas API bilgilerini getir
    const { data: profil, error: profilErr } = await supabaseAdmin
      .from('kullanicilar')
      .select('dogtas_musteri_no, dogtas_kullanici_adi, dogtas_sifre, dogtas_client_id, dogtas_client_secret, dogtas_uygulama_kodu')
      .eq('id', kullaniciId)
      .single();

    if (profilErr || !profil) {
      return res.status(400).json({ hata: 'Kullanıcı bilgileri bulunamadı' });
    }

    if (!profil.dogtas_kullanici_adi || !profil.dogtas_sifre) {
      return res.status(400).json({ hata: 'Dogtas API bilgileri tanımlanmamış' });
    }

    const kimlikBilgileri = {
      musteriNo: profil.dogtas_musteri_no,
      kullaniciAdi: profil.dogtas_kullanici_adi,
      sifre: profil.dogtas_sifre,
      clientId: profil.dogtas_client_id,
      clientSecret: profil.dogtas_client_secret,
      uygulamaKodu: profil.dogtas_uygulama_kodu
    };

    const quarterNum = Number(ceyrek.replace('Q', ''));
    const months = prim.getQuarterMonths(quarterNum);
    const dates = prim.getQuarterDates(Number(yil), quarterNum);

    if (!dates) {
      return res.status(400).json({ hata: 'Geçersiz çeyrek' });
    }

    // API tarih aralığı: Fatura verileri için 1 yıl geriye git
    const extendedStart = new Date(dates.start);
    extendedStart.setFullYear(extendedStart.getFullYear() - 1);
    const startStr = formatDateDDMMYYYY(extendedStart);
    const endStr = formatDateDDMMYYYY(dates.end);

    // Dogtas API'den veri çek
    const rawData = await dogtasApi.fetchData(startStr, endStr, kimlikBilgileri);

    // Hedef map oluştur
    const targetMap = {};
    for (const m of months) {
      targetMap[m] = Number(hedefler[String(m)]) || 0;
    }

    // Ham veriyi işle
    const monthlyData = prim.processRawData(rawData, dates.start, dates.end, months, targetMap);

    // Aylık primler hesapla
    const aylikSonuclar = [];
    let toplamHedef = 0, toplamSiparis = 0, toplamFatura = 0, toplamPrim = 0;

    for (const m of months) {
      const d = monthlyData[m];
      const result = prim.calculateMonthlyPremium(d.realizedOrder, d.target, d.realizedInvoice);

      aylikSonuclar.push({
        ay: m,
        ayAdi: prim.TURKISH_MONTHS[m],
        hedef: d.target,
        siparis: d.realizedOrder,
        hgo: result.hgo,
        fatura: d.realizedInvoice,
        primOrani: result.rate,
        primTutari: result.premiumAmount
      });

      toplamHedef += d.target;
      toplamSiparis += d.realizedOrder;
      toplamFatura += d.realizedInvoice;
      toplamPrim += result.premiumAmount;
    }

    // Ek prim dilimlerini al
    let ekPrimTiers = req.body.ekPrimDilimleri || null;
    if (!ekPrimTiers) {
      const { data: tiersData } = await supabaseAdmin
        .from('ek_prim_dilimleri')
        .select('alt_sinir, prim_orani')
        .eq('kullanici_id', kullaniciId)
        .eq('yil', Number(yil))
        .eq('ceyrek', ceyrek);

      if (tiersData && tiersData.length > 0) {
        ekPrimTiers = tiersData.map(t => ({
          alt_sinir: Number(t.alt_sinir),
          oran: Number(t.prim_orani)
        }));
      }
    }

    // Çeyrek ek hacim primi
    const ekPrim = prim.calculateQuarterlyExtraPremium(
      toplamSiparis, toplamHedef, toplamFatura, ekPrimTiers
    );

    // Forecast
    const forecast = prim.generateForecast(monthlyData, months, ekPrimTiers);

    // Toplam hak edilen prim
    const toplamHakEdilen = toplamPrim + (ekPrim.eligible ? ekPrim.premiumAmount : 0);

    res.json({
      aylikSonuclar,
      ceyrekOzet: {
        toplamHedef,
        toplamSiparis,
        toplamFatura,
        ceyrekHgo: toplamHedef > 0 ? (toplamSiparis / toplamHedef) * 100 : 0,
        toplamAylikPrim: toplamPrim,
        ekPrim,
        toplamHakEdilen
      },
      forecast,
      kayitSayisi: rawData.length
    });

  } catch (err) {
    console.error('Hesaplama hatası:', err.message);
    res.status(500).json({ hata: err.message });
  }
});

function formatDateDDMMYYYY(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

module.exports = router;
