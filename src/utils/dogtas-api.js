/**
 * Doğtaş API Client
 * HGO.py PrimApiClient sınıfının Node.js karşılığı
 */

let token = null;

async function getToken() {
  const res = await fetch(`${process.env.DOGTAS_BASE_URL}/Authorization/GetAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userName: process.env.DOGTAS_USERNAME,
      password: process.env.DOGTAS_PASSWORD,
      clientId: process.env.DOGTAS_CLIENT_ID,
      clientSecret: process.env.DOGTAS_CLIENT_SECRET,
      applicationCode: process.env.DOGTAS_APPLICATION_CODE
    }),
    signal: AbortSignal.timeout(10000)
  });

  const data = await res.json();
  if (data.isSuccess && data.data) {
    token = data.data.accessToken;
    return true;
  }
  return false;
}

/**
 * Belirtilen tarih aralığındaki siparişleri çeker.
 * İptal edilmiş siparişler ve Z347 ödeme koşullu kayıtlar hariç tutulur.
 * orderId + orderLineId ile duplicate eliminasyonu yapılır.
 *
 * @param {string} startDate - DD.MM.YYYY
 * @param {string} endDate - DD.MM.YYYY
 * @returns {Array} Filtrelenmiş sipariş kayıtları
 */
async function fetchData(startDate, endDate) {
  if (!token) {
    const ok = await getToken();
    if (!ok) throw new Error('Token alınamadı');
  }

  const res = await fetch(`${process.env.DOGTAS_BASE_URL}${process.env.DOGTAS_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      orderId: '',
      CustomerNo: process.env.DOGTAS_CUSTOMER_NO,
      RegistrationDateStart: startDate,
      RegistrationDateEnd: endDate,
      referenceDocumentNo: '',
      SalesDocumentType: ''
    }),
    signal: AbortSignal.timeout(30000)
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

module.exports = { fetchData, getToken };
