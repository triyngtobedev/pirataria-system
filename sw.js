const CACHE = 'bodyartos-v1';
const ASSETS = [
  '.',
  './index.html',
  './style.css',
  './src/design-tokens.css',
  './manifest.json',
  './favicon.svg',
  './assets/logo.svg',
  './offline.html',
  './src/constants.js',
  './src/db.js',
  './src/router.js',
  './src/app.js',
  './src/utils/dom.js',
  './src/utils/toast.js',
  './src/utils/events.js',
  './src/utils/event_bus.js',
  './src/utils/event_timeline.js',
  './src/utils/finance.js',
  './src/utils/permissions.js',
  './src/utils/auth.js',
  './src/utils/audit.js',
  './src/utils/search.js',
  './src/utils/palette.js',
  './src/utils/validation.js',
  './src/utils/metrics.js',
  './src/utils/reports.js',
  './src/utils/inventory.js',
  './src/utils/clientMetrics.js',
  './src/utils/attachments.js',
  './src/utils/migrations.js',
  './src/utils/backup.js',
  './src/utils/signature.js',
  './src/utils/hoje.js',
  './src/utils/crm.js',
  './src/utils/inbox.js',
  './src/utils/automation.js',
  './src/utils/orcamento.js',
  './src/utils/notificacao.js',
  './src/utils/posatendimento.js',
  './src/utils/marketing.js',
  './src/utils/conhecimento.js',
  './src/utils/aihub.js',
  './src/utils/oportunidade.js',
  './src/utils/fila.js',
  './src/utils/priorizacao.js',
  './src/utils/executor.js',
  './src/utils/copiloto.js',
  './src/utils/fechamento_dia.js',
  './src/utils/operador.js',
  './src/utils/memoria_operacional.js',
  './src/utils/playbook.js',
  './src/modules/operador.js',
  './src/utils/recomendacoes.js',
  './src/utils/onboarding.js',
  './src/modules/onboarding.js',
  './src/utils/comunicacao.js',
  './src/modules/comunicacao.js',
  './src/utils/confirmacao.js',
  './src/modules/confirmacao.js',
  './src/utils/agendamento_assistente.js',
  './src/utils/googleCalendar.js',
  './src/utils/whatsapp.js',
  './src/components/index.js',
  './src/components/emptyState.js',
  './src/components/badge.js',
  './src/components/modal.js',
  './src/components/table.js',
  './src/components/card.js',
  './src/components/layout.js',
  './src/repositories/index.js',
  './src/modules/hoje.js',
  './src/modules/inbox.js',
  './src/modules/orcamentos.js',
  './src/modules/oportunidades.js',
  './src/modules/filas.js',
  './src/modules/marketing.js',
  './src/modules/conhecimento.js',
  './src/modules/aihub.js',
  './src/modules/notificacoes.js',
  './src/modules/agenda.js',
  './src/modules/clientes.js',
  './src/modules/atendimento.js',
  './src/modules/financeiro.js',
  './src/modules/os.js',
  './src/modules/termos.js',
  './src/modules/lembretes.js',
  './src/modules/comissoes.js',
  './src/modules/vales.js',
  './src/modules/pacotes.js',
  './src/modules/estoque.js',
  './src/modules/relatorios.js',
  './src/modules/studio.js',
  './src/modules/pendencias.js',
  './src/utils/pendencias.js',
  './src/modules/capacidade.js',
  './src/utils/capacidade.js',
  './src/modules/reativacao.js',
  './src/utils/reativacao.js',
  './src/modules/operacao_real.js',
  './src/utils/operacao_real.js',
  './src/modules/diario_operacional.js',
  './src/utils/diario_operacional.js',
  './src/modules/gargalos_operacionais.js',
  './src/utils/gargalos_operacionais.js',
  './src/modules/acoes_prioritarias.js',
  './src/utils/acoes_prioritarias.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var fetched = fetch(e.request).then(function(response) {
        if (response.ok && response.type === 'basic') {
          var copy = response.clone();
          caches.open(CACHE).then(function(cache) { cache.put(e.request, copy); });
        }
        return response;
      }).catch(function() {
        return caches.match('./offline.html');
      });
      return cached || fetched;
    })
  );
});
