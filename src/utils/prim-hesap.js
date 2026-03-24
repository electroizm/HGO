/**
 * Prim Hesaplama Motoru
 * HGO.py PrimCalculator + yardımcı fonksiyonların Node.js karşılığı
 */

const TURKISH_MONTHS = {
  1: 'Ocak', 2: 'Şubat', 3: 'Mart', 4: 'Nisan',
  5: 'Mayıs', 6: 'Haziran', 7: 'Temmuz', 8: 'Ağustos',
  9: 'Eylül', 10: 'Ekim', 11: 'Kasım', 12: 'Aralık'
};

const QUARTER_MONTHS = {
  1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12]
};

const QUARTER_DATES = {
  1: { start: [1, 1], end: [3, 31] },
  2: { start: [4, 1], end: [6, 30] },
  3: { start: [7, 1], end: [9, 30] },
  4: { start: [10, 1], end: [12, 31] }
};

const DEFAULT_EK_PRIM_TIERS = [
  { alt_sinir: 50000000, oran: 5 },
  { alt_sinir: 35000000, oran: 4 },
  { alt_sinir: 20000000, oran: 3 },
  { alt_sinir: 10000000, oran: 2 },
  { alt_sinir: 7000000, oran: 1 },
];

/**
 * Aylık HGO primi hesaplar.
 * HGO = (Gerçekleşen Sipariş / Hedef) * 100
 * Prim = Prim Oranı * Net Fatura Tutarı
 */
function calculateMonthlyPremium(realizedOrder, target, realizedInvoice) {
  if (target <= 0) {
    return { hgo: 0, rate: 0, premiumAmount: 0 };
  }

  const hgo = (realizedOrder / target) * 100;

  let rate = 0;
  if (hgo >= 120) rate = 3.0;
  else if (hgo >= 110) rate = 2.5;
  else if (hgo >= 100) rate = 2.0;
  else if (hgo >= 90) rate = 1.0;

  const premiumAmount = (rate / 100) * realizedInvoice;

  return { hgo, rate, premiumAmount };
}

/**
 * Çeyrek bazlı ek hacim primi hesaplar.
 * Koşul: 3 Aylık Toplam HGO >= %100
 * Ek prim oranı toplam sipariş tutarına göre belirlenir.
 */
function calculateQuarterlyExtraPremium(totalOrder, totalTarget, totalInvoice, ekPrimTiers = null) {
  if (totalTarget <= 0) {
    return { eligible: false, hgo: 0, rate: 0, premiumAmount: 0, reason: 'Hedef tanımlanmamış' };
  }

  const hgo = (totalOrder / totalTarget) * 100;

  if (hgo < 100) {
    return { eligible: false, hgo, rate: 0, premiumAmount: 0, reason: `Çeyrek HGO %100 altı (%${hgo.toFixed(2)})` };
  }

  const tiers = ekPrimTiers || DEFAULT_EK_PRIM_TIERS;
  const sortedTiers = [...tiers].sort((a, b) => b.alt_sinir - a.alt_sinir);

  let rate = 0;
  for (const tier of sortedTiers) {
    if (totalOrder >= tier.alt_sinir) {
      rate = tier.oran;
      break;
    }
  }

  if (rate === 0) {
    return {
      eligible: false, hgo, rate: 0, premiumAmount: 0,
      reason: `Ciro barajı karşılanmadı (${formatCurrency(totalOrder)})`
    };
  }

  const premiumAmount = (rate / 100) * totalInvoice;
  return { eligible: true, hgo, rate, premiumAmount, reason: '' };
}

/**
 * Forecast / tahmin ve strateji önerileri üretir.
 */
function generateForecast(monthlyData, months, ekPrimTiers = null) {
  const lines = [];
  const currentMonth = new Date().getMonth() + 1;

  const activeMonths = months.filter(m => monthlyData[m] && monthlyData[m].realizedOrder > 0);
  const remainingMonths = months.filter(m => !monthlyData[m] || monthlyData[m].realizedOrder === 0);

  if (activeMonths.length === 0) {
    lines.push('Henüz veri yok.');
    return lines;
  }

  let totalOrder = 0, totalInvoice = 0, totalTarget = 0;
  for (const m of months) {
    if (monthlyData[m]) {
      totalOrder += monthlyData[m].realizedOrder;
      totalInvoice += monthlyData[m].realizedInvoice;
      totalTarget += monthlyData[m].target;
    }
  }

  if (totalTarget <= 0) return ['Hedef tanımlanmamış.'];

  const currentHgo = (totalOrder / totalTarget) * 100;

  let projectedOrder, projectedInvoice, projectedHgo;

  if (remainingMonths.length > 0) {
    const avgOrder = totalOrder / activeMonths.length;
    const avgInvoice = totalInvoice / activeMonths.length;
    projectedOrder = totalOrder + avgOrder * remainingMonths.length;
    projectedInvoice = totalInvoice + avgInvoice * remainingMonths.length;
    projectedHgo = (projectedOrder / totalTarget) * 100;

    lines.push(`-- ÇEYREK SONU TAHMİNİ (${activeMonths.length} ay verisi ile) --`);
    lines.push(`Aylık ortalama sipariş: ${formatCurrency(avgOrder)}`);
    lines.push(`Tahmini çeyrek sonu sipariş: ${formatCurrency(projectedOrder)}`);
    lines.push(`Tahmini çeyrek sonu HGO: %${projectedHgo.toFixed(1)}`);
    lines.push('');
  } else {
    projectedOrder = totalOrder;
    projectedInvoice = totalInvoice;
    projectedHgo = currentHgo;
    lines.push('-- ÇEYREK TAMAMLANDI --');
    lines.push(`Toplam sipariş: ${formatCurrency(totalOrder)}`);
    lines.push(`Çeyrek HGO: %${currentHgo.toFixed(1)}`);
    lines.push('');
  }

  // İçinde bulunulan ay için bireysel öneri
  const hgoTiers = [
    { threshold: 120, rate: 3, name: 'Altın' },
    { threshold: 110, rate: 2.5, name: 'Gümüş' },
    { threshold: 100, rate: 2, name: 'Bronz' },
    { threshold: 90, rate: 1, name: 'Başlangıç' },
  ];

  if (months.includes(currentMonth) && monthlyData[currentMonth]) {
    const mData = monthlyData[currentMonth];
    const mTarget = mData.target;
    const mOrder = mData.realizedOrder;
    const mName = TURKISH_MONTHS[currentMonth] || currentMonth;

    if (mTarget > 0) {
      const mHgo = (mOrder / mTarget) * 100;
      lines.push(`-- ${mName.toUpperCase()} AYI BİREYSEL HEDEF DURUMU --`);
      lines.push(`Hedef: ${formatCurrency(mTarget)} | Sipariş: ${formatCurrency(mOrder)} | HGO: %${mHgo.toFixed(1)}`);

      for (const tier of [...hgoTiers].reverse()) {
        const needed = (tier.threshold / 100) * mTarget;
        if (mOrder >= needed) {
          lines.push(`  %${tier.threshold} (${tier.name} - %${tier.rate} prim): ULAŞILDI`);
        } else {
          const gap = needed - mOrder;
          lines.push(`  %${tier.threshold} (${tier.name} - %${tier.rate} prim): ${formatCurrency(gap)} daha sipariş gerekli`);
        }
      }
      lines.push('');
    }
  }

  // Çeyreğin 3. ayında EkPrim önerisi
  const thirdMonth = months[months.length - 1];
  const tiers = ekPrimTiers || DEFAULT_EK_PRIM_TIERS;
  if (currentMonth === thirdMonth && tiers.length > 0) {
    lines.push('-- EK PRİM DURUMU --');

    const sortedTiers = [...tiers].sort((a, b) => b.alt_sinir - a.alt_sinir);
    let reached = null;
    let nextTier = null;

    for (const tier of sortedTiers) {
      if (projectedOrder >= tier.alt_sinir) {
        if (!reached) reached = tier;
      } else {
        nextTier = tier;
      }
    }

    if (reached) {
      lines.push(`  Mevcut dilim: ${formatCurrency(reached.alt_sinir)} (%${reached.oran} ek prim) - ULAŞILDI`);
    } else {
      lines.push('  Henüz hiçbir dilime ulaşılamadı.');
    }

    if (nextTier) {
      const gap = nextTier.alt_sinir - projectedOrder;
      lines.push(`  Sonraki dilim: ${formatCurrency(nextTier.alt_sinir)} (%${nextTier.oran} ek prim) - ${formatCurrency(gap)} daha sipariş gerekli`);
    }
    lines.push('');
  }

  // Strateji önerisi
  lines.push('-- STRATEJİ ÖNERİSİ --');
  if (projectedOrder >= totalTarget) {
    lines.push('  Çeyrek hedefi (%100): ULAŞILDI');
  } else {
    const gap = totalTarget - totalOrder;
    if (remainingMonths.length > 0) {
      const monthlyNeeded = gap / remainingMonths.length;
      lines.push(`  Çeyrek hedefi (%100 - Bronz): ${formatCurrency(gap)} daha sipariş gerekli`);
      lines.push(`  Kalan ${remainingMonths.length} ayda aylık ${formatCurrency(monthlyNeeded)} sipariş ile ulaşılabilir.`);
    } else {
      lines.push(`  Çeyrek hedefi (%100 - Bronz): ${formatCurrency(gap)} eksik`);
    }
  }

  // Tahmini prim kazancı
  if (projectedHgo >= 90) {
    const projResult = calculateMonthlyPremium(projectedOrder, totalTarget, projectedInvoice);
    lines.push(`  Tahmini toplam aylık prim: ${formatCurrency(projResult.premiumAmount)}`);
  }

  return lines;
}

// --- Yardımcı fonksiyonlar ---

function parseDate(dateStr) {
  if (!dateStr) return null;
  try {
    if (dateStr.includes('T')) {
      return new Date(dateStr.split('T')[0]);
    } else if (dateStr.includes('-')) {
      return new Date(dateStr);
    } else if (dateStr.includes('.')) {
      const [d, m, y] = dateStr.split('.');
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
  } catch { /* ignore */ }
  return null;
}

function parseInvoiceDate(dateStr) {
  if (!dateStr || dateStr === '00000000') return null;
  try {
    if (dateStr.length === 8 && /^\d+$/.test(dateStr)) {
      const y = dateStr.substring(0, 4);
      const m = dateStr.substring(4, 6);
      const d = dateStr.substring(6, 8);
      return new Date(Number(y), Number(m) - 1, Number(d));
    } else if (dateStr.includes('.')) {
      const [d, m, y] = dateStr.split('.');
      return new Date(Number(y), Number(m) - 1, Number(d));
    } else if (dateStr.includes('-')) {
      return new Date(dateStr);
    }
  } catch { /* ignore */ }
  return null;
}

function safeNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  let s = String(value).trim();
  // Türkçe format: nokta binlik ayırıcı, virgül ondalık ayırıcı
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Ham API verisini işleyerek aylık sonuçları döndürür.
 */
function processRawData(rawData, startDate, endDate, months, targetMap) {
  const monthlyData = {};
  for (const m of months) {
    monthlyData[m] = {
      target: targetMap[m] || 0,
      realizedOrder: 0,
      realizedInvoice: 0
    };
  }

  for (const item of rawData) {
    const qty = safeNumber(item.orderLineQuantity);
    const netPrice = safeNumber(item.netPrice);
    const originalPrice = safeNumber(item.originalPrice);
    const price = netPrice !== 0 ? netPrice : originalPrice;
    const lineTotal = qty * price;

    // SİPARİŞ: orderDate1 çeyrekte olan kayıtlar
    const oDate = parseDate(item.orderDate1);
    if (oDate) {
      const month = oDate.getMonth() + 1;
      if (monthlyData[month] && oDate >= startDate && oDate <= endDate) {
        monthlyData[month].realizedOrder += lineTotal;
      }
    }

    // FATURA: purchaseInvoiceDate çeyrekte olan kayıtlar
    const invDateStr = item.purchaseInvoiceDate;
    if (invDateStr && invDateStr !== '00000000') {
      const invDate = parseInvoiceDate(invDateStr);
      if (invDate) {
        const month = invDate.getMonth() + 1;
        if (monthlyData[month] && invDate >= startDate && invDate <= endDate) {
          monthlyData[month].realizedInvoice += lineTotal;
        }
      }
    }
  }

  return monthlyData;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(amount) + ' TL';
}

function getQuarterDates(year, quarter) {
  const q = QUARTER_DATES[quarter];
  if (!q) return null;
  return {
    start: new Date(year, q.start[0] - 1, q.start[1]),
    end: new Date(year, q.end[0] - 1, q.end[1])
  };
}

function getQuarterMonths(quarter) {
  return QUARTER_MONTHS[quarter] || [];
}

module.exports = {
  TURKISH_MONTHS,
  DEFAULT_EK_PRIM_TIERS,
  calculateMonthlyPremium,
  calculateQuarterlyExtraPremium,
  generateForecast,
  processRawData,
  formatCurrency,
  getQuarterDates,
  getQuarterMonths,
  safeNumber
};
