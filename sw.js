// Sandra Silveira · service worker
// Ao publicar uma versão nova do app, troque a VERSAO abaixo.
const VERSAO = 'sandra-v1';
const ARQUIVOS = ['./', './index.html', './instalar.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Firebase / Firestore / WhatsApp: sempre direto na rede, nunca do cache
  if (/firestore|googleapis\.com\/identitytoolkit|securetoken|firebase|wa\.me|whatsapp/.test(url.href) && !/fonts\.googleapis/.test(url.href)) return;

  // Páginas: rede primeiro (pega versão nova), cache se estiver sem internet
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSAO).then(ca => ca.put('./index.html', c)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }

  // Arquivos do app, fontes e bibliotecas: cache primeiro, atualiza em segundo plano
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/.test(url.href)) {
    e.respondWith(caches.match(req).then(hit => {
      const rede = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) { const c = r.clone(); caches.open(VERSAO).then(ca => ca.put(req, c)); } return r; }).catch(() => hit);
      return hit || rede;
    }));
  }
});
