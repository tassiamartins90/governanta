// Guarda os arquivos do app no aparelho para abrir mesmo sem internet.
// Ao alterar qualquer arquivo do app, aumente o número da versão abaixo.
const VERSAO = "governanta-v1";
const ARQUIVOS = ["./", "./index.html", "./config.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(chaves => Promise.all(chaves.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Arquivos do próprio app: tenta a rede primeiro (pega atualizações), cai no guardado se estiver sem internet.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(r => {
        const copia = r.clone();
        caches.open(VERSAO).then(c => c.put(req, copia));
        return r;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Biblioteca do Firebase (versão fixa): usa a cópia guardada quando houver.
  if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) {
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(resp => {
        const copia = resp.clone();
        caches.open(VERSAO).then(c => c.put(req, copia));
        return resp;
      }))
    );
  }
  // Demais pedidos (banco de dados, login) seguem direto para a rede.
});
