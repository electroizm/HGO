const express = require('express');
const router = express.Router();
const dogtasApi = require('../utils/dogtas-api');
const prim = require('../utils/prim-hesap');

// POST /api/hesapla
// Body: { yil, ceyrek, hedefler: { "1": 5000000, "2": 6000000, "3": 7000000 } }
router.post('/', async (req, res) => {
  try {
    const { yil, ceyrek, hedefler } = req.body;

    if (!yil || !ceyrek || !hedefler) {
      return res.status(400).json({ hata: 'yil, ceyrek ve hedefler gerekli' });
    }

    const quarterNum = Number(ceyrek.replace('Q', ''));
    const months = prim.getQuarterMonths(quarterNum);
    const dates = prim.getQuarterDates(Number(yil), quarterNum);

    if (!dates) {
      return res.status(400).json({ hata: 'Geçersiz çeyrek' });
    }

    // API tarih aralığı: Fatura verileri için 1 yıl geriye git
    // (Önceki çeyreklerde sipariş verilip bu çeyrekte faturalanan kayıtlar için)
    const extendedStart = new Date(dates.start);
    extendedStart.setFullYear(extendedStart.getFullYear() - 1);
    const startStr = formatDateDDMMYYYY(extendedStart);
    const endStr = formatDateDDMMYYYY(dates.end);

    // Doğtaş API'den veri çek
    const rawData = await dogtasApi.fetchData(startStr, endStr);

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

    // Ek prim dilimlerini al (request body'den veya Supabase'den)
    let ekPrimTiers = req.body.ekPrimDilimleri || null;
    if (!ekPrimTiers) {
      // Supabase'den çek
      const supabase = require('../utils/supabase');
      const { data: tiersData } = await supabase
        .from('ek_prim_dilimleri')
        .select('alt_sinir, prim_orani')
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
