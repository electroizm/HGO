// Token yönetimi
function getToken() {
  return localStorage.getItem('hgo_token');
}

function setToken(token) {
  localStorage.setItem('hgo_token', token);
}

function getKullanici() {
  const k = localStorage.getItem('hgo_kullanici');
  return k ? JSON.parse(k) : null;
}

function setKullanici(kullanici) {
  localStorage.setItem('hgo_kullanici', JSON.stringify(kullanici));
}

function cikisYap() {
  localStorage.removeItem('hgo_token');
  localStorage.removeItem('hgo_kullanici');
  window.location.href = '/giris';
}

// Auth kontrolü - giriş yapılmamışsa yönlendir
function authKontrol() {
  if (!getToken()) {
    window.location.href = '/giris';
    return false;
  }
  return true;
}

// Authenticated fetch wrapper
async function apiFetch(url, options = {}) {
  const token = getToken();
  if (!token) {
    cikisYap();
    return null;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    cikisYap();
    return null;
  }

  return res;
}
