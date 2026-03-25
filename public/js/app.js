/**
 * HGO Frontend - Doğtaş Prim Hesaplama
 */

// === Türkçe Ay İsimleri ===
const AYLAR = {
  1: 'Ocak', 2: 'Şubat', 3: 'Mart', 4: 'Nisan',
  5: 'Mayıs', 6: 'Haziran', 7: 'Temmuz', 8: 'Ağustos',
  9: 'Eylül', 10: 'Ekim', 11: 'Kasım', 12: 'Aralık'
};

const CEYREK_AYLARI = {
  Q1: [1, 2, 3], Q2: [4, 5, 6], Q3: [7, 8, 9], Q4: [10, 11, 12]
};

const VARSAYILAN_DILIMLER = [
  { alt_sinir: 50000000, prim_orani: 5 },
  { alt_sinir: 35000000, prim_orani: 4 },
  { alt_sinir: 20000000, prim_orani: 3 },
  { alt_sinir: 10000000, prim_orani: 2 },
  { alt_sinir: 7000000, prim_orani: 1 },
];

// === Başlangıç ===
document.addEventListener('DOMContentLoaded', () => {
  // Auth kontrolü
  if (!authKontrol()) return;

  // Kullanıcı bilgilerini göster
  kullaniciBilgileriniGoster();

  baslatYillar();
  donemDegisti();
  tablariBagla();
  butonlariBagla();
  epBaslatYillar();
  epDonemDegisti();
});

// === Kullanıcı Bilgilerini Header'da Göster ===
function kullaniciBilgileriniGoster() {
  const kullanici = getKullanici();
  if (!kullanici) return;

  document.getElementById('user-name').textContent = kullanici.ad;
  document.getElementById('user-role').textContent = kullanici.rol;

  // Admin ise admin sekmesini göster
  if (kullanici.rol === 'admin') {
    document.getElementById('tab-btn-admin').classList.remove('hidden');
  }
}

// === Tab Yönetimi ===
function tablariBagla() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');

      // Admin sekmesine geçince kullanıcıları yükle
      if (tab.dataset.tab === 'admin') {
        kullanicilariYukle();
      }
    });
  });
}

// === Yıl Dropdown ===
function baslatYillar() {
  const yilSelect = document.getElementById('yil');
  const buYil = new Date().getFullYear();
  for (let y = buYil + 1; y >= buYil - 2; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === buYil) opt.selected = true;
    yilSelect.appendChild(opt);
  }

  // Mevcut çeyreği seç
  const buAy = new Date().getMonth() + 1;
  const mevcutCeyrek = Math.ceil(buAy / 3);
  document.getElementById('ceyrek').value = `Q${mevcutCeyrek}`;

  yilSelect.addEventListener('change', donemDegisti);
  document.getElementById('ceyrek').addEventListener('change', donemDegisti);
}

// === Dönem Değiştiğinde ===
function donemDegisti() {
  const ceyrek = document.getElementById('ceyrek').value;
  const aylar = CEYREK_AYLARI[ceyrek];
  const container = document.getElementById('hedef-inputs');
  container.innerHTML = '';

  aylar.forEach(ay => {
    const div = document.createElement('div');
    div.className = 'form-group';
    div.innerHTML = `
      <label for="hedef-${ay}">${AYLAR[ay]} Hedef</label>
      <input type="text" id="hedef-${ay}" placeholder="0" inputmode="numeric">
    `;
    container.appendChild(div);
  });

  // Kaydedilmiş hedefleri yükle
  hedefleriYukle();

  // Sonuçları gizle
  document.getElementById('sonuclar').classList.add('hidden');
}

// === Hedefleri Supabase'den Yükle ===
async function hedefleriYukle() {
  const yil = document.getElementById('yil').value;
  const ceyrek = document.getElementById('ceyrek').value;

  try {
    const res = await apiFetch(`/api/hedefler?yil=${yil}&ceyrek=${ceyrek}`);
    if (!res) return;
    const data = await res.json();

    if (Array.isArray(data)) {
      data.forEach(h => {
        const input = document.getElementById(`hedef-${h.ay}`);
        if (input && h.hedef_tutar) {
          input.value = formatSayi(Number(h.hedef_tutar));
        }
      });
    }
  } catch { /* sessiz */ }
}

// === Butonları Bağla ===
function butonlariBagla() {
  document.getElementById('btn-hesapla').addEventListener('click', hesapla);
  document.getElementById('btn-kaydet').addEventListener('click', hedefleriKaydet);

  // EkPrim butonları
  document.getElementById('btn-ep-satir-ekle').addEventListener('click', epSatirEkle);
  document.getElementById('btn-ep-varsayilan').addEventListener('click', epVarsayilanlariYukle);
  document.getElementById('btn-ep-kaydet').addEventListener('click', epKaydet);
  document.getElementById('ep-yil').addEventListener('change', epDonemDegisti);
  document.getElementById('ep-ceyrek').addEventListener('change', epDonemDegisti);
}

// === Hedefleri Kaydet ===
async function hedefleriKaydet() {
  const yil = document.getElementById('yil').value;
  const ceyrek = document.getElementById('ceyrek').value;
  const aylar = CEYREK_AYLARI[ceyrek];

  const hedefler = aylar.map(ay => ({
    ay,
    hedef_tutar: parseSayi(document.getElementById(`hedef-${ay}`).value)
  }));

  try {
    const res = await apiFetch('/api/hedefler', {
      method: 'POST',
      body: JSON.stringify({ yil: Number(yil), ceyrek, hedefler })
    });

    if (!res) return;
    const data = await res.json();
    if (data.basarili) {
      bildirimGoster('Hedefler kaydedildi', 'basarili');
    } else {
      bildirimGoster(data.hata || 'Kaydetme hatası', 'hata');
    }
  } catch (err) {
    bildirimGoster('Bağlantı hatası', 'hata');
  }
}

// === Hesapla ===
async function hesapla() {
  const yil = document.getElementById('yil').value;
  const ceyrek = document.getElementById('ceyrek').value;
  const aylar = CEYREK_AYLARI[ceyrek];
  const btn = document.getElementById('btn-hesapla');
  const loading = document.getElementById('loading');
  const sonuclar = document.getElementById('sonuclar');

  // Hedefleri topla
  const hedefler = {};
  aylar.forEach(ay => {
    hedefler[String(ay)] = parseSayi(document.getElementById(`hedef-${ay}`).value);
  });

  btn.disabled = true;
  loading.classList.remove('hidden');
  sonuclar.classList.add('hidden');
  document.getElementById('loading-text').textContent = "API'ye bağlanılıyor...";

  try {
    const res = await apiFetch('/api/hesapla', {
      method: 'POST',
      body: JSON.stringify({ yil: Number(yil), ceyrek, hedefler })
    });

    if (!res) return;
    const data = await res.json();

    if (data.hata) {
      bildirimGoster(data.hata, 'hata');
      return;
    }

    sonuclariGoster(data);
  } catch (err) {
    bildirimGoster('Hesaplama hatası: ' + err.message, 'hata');
  } finally {
    btn.disabled = false;
    loading.classList.add('hidden');
  }
}

// === Sonuçları Göster ===
function sonuclariGoster(data) {
  const sonuclar = document.getElementById('sonuclar');
  sonuclar.classList.remove('hidden');

  // Kayıt sayısı
  document.getElementById('kayit-sayisi').textContent =
    `API'den ${data.kayitSayisi} kayıt çekildi`;

  // Aylık tablo
  const tbody = document.querySelector('#sonuc-tablo tbody');
  tbody.innerHTML = '';

  data.aylikSonuclar.forEach(ay => {
    const tr = document.createElement('tr');
    const hgoClass = ay.hgo >= 100 ? 'hgo-green' : ay.hgo >= 90 ? 'hgo-orange' : 'hgo-red';

    tr.innerHTML = `
      <td><strong>${ay.ayAdi}</strong></td>
      <td class="text-right">${paraBirim(ay.hedef)}</td>
      <td class="text-right">${paraBirim(ay.siparis)}</td>
      <td class="${hgoClass}">%${ay.hgo.toFixed(1)}</td>
      <td class="text-right">${paraBirim(ay.fatura)}</td>
      <td class="text-right">%${ay.primOrani.toFixed(1)}</td>
      <td class="text-right"><strong>${paraBirim(ay.primTutari)}</strong></td>
    `;
    tbody.appendChild(tr);
  });

  // Çeyrek özeti
  const ozet = data.ceyrekOzet;
  const ozetDiv = document.getElementById('ceyrek-ozet');
  const hgoClass = ozet.ceyrekHgo >= 100 ? 'hgo-green' : ozet.ceyrekHgo >= 90 ? 'hgo-orange' : 'hgo-red';

  ozetDiv.innerHTML = `
    <div class="ozet-item">
      <div class="label">Toplam Hedef</div>
      <div class="value">${paraBirim(ozet.toplamHedef)}</div>
    </div>
    <div class="ozet-item">
      <div class="label">Toplam Sipariş</div>
      <div class="value">${paraBirim(ozet.toplamSiparis)}</div>
    </div>
    <div class="ozet-item">
      <div class="label">Toplam Fatura</div>
      <div class="value">${paraBirim(ozet.toplamFatura)}</div>
    </div>
    <div class="ozet-item">
      <div class="label">Çeyrek HGO</div>
      <div class="value ${hgoClass}">%${ozet.ceyrekHgo.toFixed(1)}</div>
    </div>
    <div class="ozet-item">
      <div class="label">Aylık Prim Toplamı</div>
      <div class="value">${paraBirim(ozet.toplamAylikPrim)}</div>
    </div>
    <div class="ozet-item">
      <div class="label">Ek Hacim Primi</div>
      <div class="value">${ozet.ekPrim.eligible ? paraBirim(ozet.ekPrim.premiumAmount) + ' (%' + ozet.ekPrim.rate + ')' : ozet.ekPrim.reason}</div>
    </div>
  `;

  // Toplam prim box
  const primBox = document.getElementById('toplam-prim-box');
  primBox.innerHTML = `
    <div class="label">TOPLAM HAK EDİLEN PRİM</div>
    <div class="total">${paraBirim(ozet.toplamHakEdilen)}</div>
    <div class="detail">
      Aylık Prim: ${paraBirim(ozet.toplamAylikPrim)}
      ${ozet.ekPrim.eligible ? ' + Ek Hacim: ' + paraBirim(ozet.ekPrim.premiumAmount) : ''}
    </div>
  `;

  // Forecast
  const forecastDiv = document.getElementById('forecast-panel');
  forecastDiv.textContent = data.forecast.join('\n');
}

// === EkPrim Tab Fonksiyonları ===
function epBaslatYillar() {
  const yilSelect = document.getElementById('ep-yil');
  const buYil = new Date().getFullYear();
  for (let y = buYil + 1; y >= buYil - 2; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === buYil) opt.selected = true;
    yilSelect.appendChild(opt);
  }

  const buAy = new Date().getMonth() + 1;
  document.getElementById('ep-ceyrek').value = `Q${Math.ceil(buAy / 3)}`;
}

async function epDonemDegisti() {
  const yil = document.getElementById('ep-yil').value;
  const ceyrek = document.getElementById('ep-ceyrek').value;

  try {
    const res = await apiFetch(`/api/ek-prim-dilimleri?yil=${yil}&ceyrek=${ceyrek}`);
    if (!res) return;
    const data = await res.json();

    const tbody = document.getElementById('ep-tbody');
    tbody.innerHTML = '';

    if (Array.isArray(data) && data.length > 0) {
      data.forEach(d => epSatirEkle(Number(d.alt_sinir), Number(d.prim_orani)));
    } else {
      epVarsayilanlariYukle();
    }
  } catch {
    epVarsayilanlariYukle();
  }
}

function epSatirEkle(altSinir, primOrani) {
  const tbody = document.getElementById('ep-tbody');
  const tr = document.createElement('tr');

  const altVal = typeof altSinir === 'number' ? formatSayi(altSinir) : '';
  const oranVal = typeof primOrani === 'number' ? primOrani : '';

  tr.innerHTML = `
    <td><input type="text" class="ep-alt-sinir" value="${altVal}" placeholder="0" inputmode="numeric"></td>
    <td><input type="number" class="ep-oran" value="${oranVal}" step="0.5" min="0" max="100" placeholder="0"></td>
    <td><button class="btn btn-danger ep-sil">Sil</button></td>
  `;

  tr.querySelector('.ep-sil').addEventListener('click', () => tr.remove());
  tbody.appendChild(tr);
}

function epVarsayilanlariYukle() {
  const tbody = document.getElementById('ep-tbody');
  tbody.innerHTML = '';
  VARSAYILAN_DILIMLER.forEach(d => epSatirEkle(d.alt_sinir, d.prim_orani));
}

async function epKaydet() {
  const yil = document.getElementById('ep-yil').value;
  const ceyrek = document.getElementById('ep-ceyrek').value;

  const dilimler = [];
  document.querySelectorAll('#ep-tbody tr').forEach(tr => {
    const altSinir = parseSayi(tr.querySelector('.ep-alt-sinir').value);
    const oran = Number(tr.querySelector('.ep-oran').value) || 0;
    if (altSinir > 0) {
      dilimler.push({ alt_sinir: altSinir, prim_orani: oran });
    }
  });

  try {
    const res = await apiFetch('/api/ek-prim-dilimleri', {
      method: 'POST',
      body: JSON.stringify({ yil: Number(yil), ceyrek, dilimler })
    });

    if (!res) return;
    const data = await res.json();
    if (data.basarili) {
      bildirimGoster('Ek prim dilimleri kaydedildi', 'basarili');
    } else {
      bildirimGoster(data.hata || 'Kaydetme hatası', 'hata');
    }
  } catch {
    bildirimGoster('Bağlantı hatası', 'hata');
  }
}

// === Yardımcı Fonksiyonlar ===
function paraBirim(n) {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n) + ' TL';
}

function formatSayi(n) {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n);
}

function parseSayi(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/\./g, '').replace(',', '.').trim();
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

function bildirimGoster(mesaj, tip) {
  const el = document.getElementById('bildirim');
  el.textContent = mesaj;
  el.className = `bildirim ${tip}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// === Profil Paneli ===
async function profilAc() {
  try {
    const res = await apiFetch('/api/auth/profil');
    if (!res) return;
    const profil = await res.json();

    document.getElementById('p-ad').value = profil.ad || '';
    document.getElementById('p-eposta').value = profil.eposta || '';
    document.getElementById('p-yeni-sifre').value = '';
    document.getElementById('p-musteri-no').value = profil.dogtas_musteri_no || '';
    document.getElementById('p-api-user').value = profil.dogtas_kullanici_adi || '';
    document.getElementById('p-api-pass').value = '';
    document.getElementById('p-client-id').value = profil.dogtas_client_id || '';
    document.getElementById('p-client-secret').value = '';
    document.getElementById('p-app-code').value = profil.dogtas_uygulama_kodu || '';

    document.getElementById('profil-overlay').classList.remove('hidden');
  } catch (err) {
    bildirimGoster('Profil yüklenemedi', 'hata');
  }
}

function profilKapat(event) {
  if (!event || event.target === document.getElementById('profil-overlay')) {
    document.getElementById('profil-overlay').classList.add('hidden');
  }
}

async function profilKaydet() {
  const btn = document.getElementById('btn-profil-kaydet');
  btn.disabled = true;
  btn.textContent = 'Kaydediliyor...';

  try {
    const body = {
      ad: document.getElementById('p-ad').value.trim(),
      dogtas_musteri_no: document.getElementById('p-musteri-no').value.trim() || null,
      dogtas_kullanici_adi: document.getElementById('p-api-user').value.trim() || null,
      dogtas_client_id: document.getElementById('p-client-id').value.trim() || null,
      dogtas_uygulama_kodu: document.getElementById('p-app-code').value.trim() || null
    };

    // Şifre alanları sadece doldurulmuşsa gönder
    const yeniSifre = document.getElementById('p-yeni-sifre').value;
    if (yeniSifre) body.yeni_sifre = yeniSifre;

    const apiPass = document.getElementById('p-api-pass').value;
    if (apiPass) body.dogtas_sifre = apiPass;

    const clientSecret = document.getElementById('p-client-secret').value;
    if (clientSecret) body.dogtas_client_secret = clientSecret;

    const res = await apiFetch('/api/auth/profil', {
      method: 'PUT',
      body: JSON.stringify(body)
    });

    if (!res) return;
    const data = await res.json();

    if (!res.ok) {
      bildirimGoster(data.hata || 'Güncelleme hatası', 'hata');
      return;
    }

    // localStorage'daki kullanıcı bilgisini güncelle
    const kullanici = getKullanici();
    if (kullanici) {
      kullanici.ad = data.ad;
      kullanici.dogtas_musteri_no = data.dogtas_musteri_no;
      kullanici.dogtas_kullanici_adi = data.dogtas_kullanici_adi;
      setKullanici(kullanici);
      document.getElementById('user-name').textContent = data.ad;
    }

    bildirimGoster('Profil güncellendi', 'basarili');
    profilKapat();
  } catch (err) {
    bildirimGoster('Güncelleme hatası: ' + err.message, 'hata');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Kaydet';
  }
}
