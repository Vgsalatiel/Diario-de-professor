// Carregado dentro do service worker gerado pelo vite-plugin-pwa — roda em
// segundo plano, mesmo com o app fechado. O backend manda { titulo, corpo, url, tag? }.

self.addEventListener('push', (event) => {
  let dados = {}
  try {
    dados = event.data ? event.data.json() : {}
  } catch {
    dados = { corpo: event.data ? event.data.text() : '' }
  }

  event.waitUntil(
    self.registration.showNotification(dados.titulo || 'Diário', {
      body: dados.corpo || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      lang: 'pt-BR',
      // Aviso novo com a mesma tag (resumo do dia, mesmo evento remarcado)
      // substitui o anterior em vez de empilhar
      tag: dados.tag || 'aviso-diario',
      data: { url: dados.url || '/' },
    }),
  )
})

// Tocar na notificação: reaproveita uma janela do app já aberta (levando
// ela pra página do aviso) ou abre uma nova.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destino = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      const aberta = janelas.find((j) => new URL(j.url).origin === self.location.origin)
      if (aberta) {
        return aberta.focus().then((j) => (j && 'navigate' in j ? j.navigate(destino) : undefined))
      }
      return self.clients.openWindow(destino)
    }),
  )
})
