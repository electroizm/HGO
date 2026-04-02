/**
 * Dogtas API Client
 * Kullanıcıya özel kimlik bilgileri ile çalışır.
 */

// Kullanıcı bazlı token cache
const tokenCache = new Map();

async function getToken(kimlikBilgileri) {
  const cacheKey = kimlikBilgileri.kullaniciAdi;
  const cached = tokenCache.get(cacheKey);

  // Cache'de varsa ve 25 dakikadan yeni ise kullan
  if (cached && (Date.now() - cached.zaman < 25 * 60 * 1000)) {
    return cached.token;
  }

  const res = await fetch(`${process.env.DOGTAS_BASE_URL}/Authorization/GetAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userName: kimlikBilgileri.kullaniciAdi,
      password: kimlikBilgileri.sifre,
      clientId: kimlikBilgileri.clientId,
      clientSecret: kimlikBilgileri.clientSecret,
      applicationCode: kimlikBilgileri.uygulamaKodu
    }),
    signal: AbortSignal.timeout(10000)
  });

  const data = await res.json();
  if (data.isSuccess && data.data) {
    const token = data.data.accessToken;
    tokenCache.set(cacheKey, { token, zaman: Date.now() });
    return token;
  }

  throw new Error('Dogtas API token alınamadı');
}

/**
 * Belirtilen tarih aralığındaki siparişleri çeker.
 *
 * @param {string} startDate - DD.MM.YYYY
 * @param {string} endDate - DD.MM.YYYY
 * @param {Object} kimlikBilgileri - { musteriNo, kullaniciAdi, sifre, clientId, clientSecret, uygulamaKodu }
 * @returns {Array} Filtrelenmiş sipariş kayıtları
 */
async function fetchData(startDate, endDate, kimlikBilgileri) {
  const token = await getToken(kimlikBilgileri);

  const res = await fetch(`${process.env.DOGTAS_BASE_URL}${process.env.DOGTAS_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      orderId: '',
      CustomerNo: kimlikBilgileri.musteriNo,
      RegistrationDateStart: startDate,
      RegistrationDateEnd: endDate,
      referenceDocumentNo: '',
      SalesDocumentType: ''
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!res.ok) throw new Error(`API yanıt kodu: ${res.status}`);

  const result = await res.json();
  if (!result.isSuccess || !Array.isArray(result.data)) {
    throw new Error('API başarısız yanıt');
  }

  // İptal edilmiş siparişleri ve Z347 kayıtlarını çıkar
  const filtered = result.data.filter(record =>
    !String(record.orderStatus || '').toLowerCase().includes('iptal') &&
    String(record.odemeKosulu || '').trim() !== 'Z347'
  );

  // Duplicate eliminasyon: orderId + orderLineId
  const seen = new Set();
  const unique = [];
  for (const record of filtered) {
    const key = `${record.orderId || ''}-${record.orderLineId || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(record);
    }
  }

  return unique;
}

module.exports = { fetchData };
