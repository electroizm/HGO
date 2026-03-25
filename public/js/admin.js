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
          <div class="eposta">${k.eposta}</div>
          ${k.dogtas_musteri_no ? `<div class="musteri-no">Müşteri No: ${k.dogtas_musteri_no}</div>` : '<div class="musteri-no" style="color:#ea580c;">API bilgileri henüz girilmemiş</div>'}
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span class="${k.aktif ? 'badge-aktif' : 'badge-pasif'}">${k.aktif ? 'Aktif' : 'Pasif'}</span>
          ${k.aktif
            ? `<button class="btn btn-danger" onclick="kullaniciDurumDegistir('${k.id}', false)">Pasif Yap</button>`
            : `<button class="btn btn-secondary" style="padding:6px 12px;font-size:0.8rem;" onclick="kullaniciDurumDegistir('${k.id}', true)">Aktif Yap</button>`
          }
        </div>
      </li>
    `).join('');
  } catch (err) {
    console.error('Kullanıcı listeleme hatası:', err);
  }
}

async function kullaniciDavetEt() {
  const eposta = document.getElementById('k-eposta').value.trim();

  if (!eposta) {
    bildirimGoster('E-posta adresi gerekli', 'hata');
    return;
  }

  const btn = document.getElementById('btn-kullanici-ekle');
  btn.disabled = true;
  btn.textContent = 'Davet ediliyor...';

  try {
    const res = await apiFetch('/api/kullanicilar', {
      method: 'POST',
      body: JSON.stringify({ eposta })
    });

    if (!res) return;
    const data = await res.json();

    if (!res.ok) {
      bildirimGoster(data.hata || 'Hata oluştu', 'hata');
      return;
    }

    bildirimGoster(`${eposta} davet edildi`, 'basarili');
    document.getElementById('k-eposta').value = '';
    kullanicilariYukle();
  } catch (err) {
    bildirimGoster('Davet hatası: ' + err.message, 'hata');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Davet Et';
  }
}

async function kullaniciDurumDegistir(id, aktif) {
  try {
    const method = aktif ? 'PUT' : 'DELETE';
    const url = `/api/kullanicilar/${id}`;
    const options = aktif
      ? { method: 'PUT', body: JSON.stringify({ aktif: true }) }
      : { method: 'DELETE' };

    const res = await apiFetch(url, options);
    if (!res) return;
    bildirimGoster(aktif ? 'Kullanıcı aktif yapıldı' : 'Kullanıcı pasif yapıldı', 'basarili');
    kullanicilariYukle();
  } catch (err) {
    bildirimGoster('Hata: ' + err.message, 'hata');
  }
}

// Event listener
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-kullanici-ekle');
  if (btn) btn.addEventListener('click', kullaniciDavetEt);
});
