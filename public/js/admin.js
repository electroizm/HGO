// Admin panel - Kullanıcı Yönetimi

async function kullanicilariYukle() {
  try {
    const res = await apiFetch('/api/kullanicilar');
    if (!res) return;
    const liste = await res.json();
    const el = document.getElementById('kullanici-liste');

    if (!liste.length) {
      el.innerHTML = '<li style="color:#6b7280;text-align:center;padding:20px;">Henüz kullanıcı yok</li>';
      return;
    }

    el.innerHTML = liste.map(k => `
      <li>
        <div class="kullanici-bilgi">
          <div class="isim">${k.ad}</div>
          <div class="eposta">${k.eposta} &mdash; <span class="${k.aktif ? 'badge-aktif' : 'badge-pasif'}">${k.aktif ? 'Aktif' : 'Pasif'}</span></div>
          ${k.dogtas_musteri_no ? `<div class="musteri-no">Müşteri No: ${k.dogtas_musteri_no}</div>` : ''}
        </div>
        <div style="display:flex;gap:8px;">
          ${k.aktif
            ? `<button class="btn btn-danger" onclick="kullaniciPasifYap('${k.id}')">Pasif Yap</button>`
            : `<button class="btn btn-secondary" style="padding:6px 12px;font-size:0.8rem;" onclick="kullaniciAktifYap('${k.id}')">Aktif Yap</button>`
          }
        </div>
      </li>
    `).join('');
  } catch (err) {
    console.error('Kullanıcı listeleme hatası:', err);
  }
}

async function kullaniciEkle() {
  const ad = document.getElementById('k-ad').value.trim();
  const eposta = document.getElementById('k-eposta').value.trim();
  const sifre = document.getElementById('k-sifre').value;

  if (!ad || !eposta || !sifre) {
    bildirimGoster('Ad, e-posta ve şifre zorunlu', 'hata');
    return;
  }

  try {
    const res = await apiFetch('/api/kullanicilar', {
      method: 'POST',
      body: JSON.stringify({
        ad,
        eposta,
        sifre,
        rol: document.getElementById('k-rol').value,
        dogtas_musteri_no: document.getElementById('k-musteri-no').value.trim() || null,
        dogtas_kullanici_adi: document.getElementById('k-api-user').value.trim() || null,
        dogtas_sifre: document.getElementById('k-api-pass').value || null,
        dogtas_client_id: document.getElementById('k-client-id').value.trim() || null,
        dogtas_client_secret: document.getElementById('k-client-secret').value || null,
        dogtas_uygulama_kodu: document.getElementById('k-app-code').value.trim() || null
      })
    });

    if (!res) return;
    const data = await res.json();

    if (!res.ok) {
      bildirimGoster(data.hata || 'Hata oluştu', 'hata');
      return;
    }

    bildirimGoster(`${data.ad} kullanıcısı oluşturuldu`, 'basarili');

    // Formu temizle
    ['k-ad', 'k-eposta', 'k-sifre', 'k-musteri-no', 'k-api-user', 'k-api-pass', 'k-client-id', 'k-client-secret', 'k-app-code'].forEach(id => {
      document.getElementById(id).value = '';
    });

    kullanicilariYukle();
  } catch (err) {
    bildirimGoster('Kullanıcı oluşturma hatası: ' + err.message, 'hata');
  }
}

async function kullaniciPasifYap(id) {
  try {
    const res = await apiFetch(`/api/kullanicilar/${id}`, {
      method: 'DELETE'
    });
    if (!res) return;
    bildirimGoster('Kullanıcı pasif yapıldı', 'basarili');
    kullanicilariYukle();
  } catch (err) {
    bildirimGoster('Hata: ' + err.message, 'hata');
  }
}

async function kullaniciAktifYap(id) {
  try {
    const res = await apiFetch(`/api/kullanicilar/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ aktif: true })
    });
    if (!res) return;
    bildirimGoster('Kullanıcı aktif yapıldı', 'basarili');
    kullanicilariYukle();
  } catch (err) {
    bildirimGoster('Hata: ' + err.message, 'hata');
  }
}

// Event listener
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-kullanici-ekle');
  if (btn) btn.addEventListener('click', kullaniciEkle);
});
