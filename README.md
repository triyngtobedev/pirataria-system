# Body Art OS

Sistema de gestão para estúdios de body piercing e tatuagem.

## Objetivo Atual do Produto

Toda evolução do Body Art OS deve priorizar exclusivamente a **automação do trabalho operacional diário** do estúdio.

As prioridades, nesta ordem, são:

1. **Responder o WhatsApp do estúdio** — centralizar e agilizar o atendimento
2. **Organizar os agendamentos** — controlar a agenda sem retrabalho
3. **Sincronizar automaticamente com o Google Calendar** — manter o calendário do estúdio sempre atualizado
4. **Ajudar na gestão de dois perfis do Instagram** — @piratariabodyart_ e @digao.piercer
5. **Reduzir ao máximo o trabalho manual** — automatizar tudo que for possível

## Critério para Novas Funcionalidades

Qualquer nova implementação deve responder **positivamente** a estas perguntas:

- Ajuda a responder o WhatsApp?
- Ajuda a organizar agendamentos?
- Ajuda a manter o Google Calendar atualizado?
- Ajuda na operação dos dois perfis do Instagram?
- Reduz trabalho manual do dia a dia?

Se a resposta for **"não"**, a funcionalidade deve permanecer no backlog.

---

## Stack

- HTML / CSS / JavaScript (vanilla — sem frameworks)
- localStorage (armazenamento local no navegador)
- Servido estaticamente com `npx serve`

## Publicação

O projeto está configurado para deploy no **Railway.app** via GitHub Actions.

Para ativar o deploy automático:

1. Crie um token em https://railway.app/account/tokens
2. Adicione como `RAILWAY_TOKEN` nos Secrets do GitHub
3. Opcional: adicione `RAILWAY_SERVICE` como Variable

A cada push na branch `master`, o pipeline executa validação, versionamento automático e deploy.

## Estrutura do Projeto

```
src/
  constants.js        — Status e títulos dos módulos
  db.js               — Camada de dados (localStorage CRUD)
  router.js           — Navegação entre módulos
  app.js              — Inicialização e bootstrap
  utils/              — Serviços e lógica de negócio
    dom.js, toast.js, audit.js, auth.js, ...
    hoje.js           — Agregador da Central de Trabalho
    crm.js            — Pipeline comercial
    inbox.js          — Central de Conversas
    orcamento.js      — Orçamentos
    automacao.js      — Motor de automações
    notificacao.js    — Centro de Notificações
    posatendimento.js — Pós-atendimento
    marketing.js      — Centro de Marketing
    conhecimento.js   — Base de Conhecimento
    aihub.js          — AI Hub (recomendações inteligentes)
    oportunidade.js   — Central de Oportunidades
    fila.js           — Fila Inteligente de Atendimento
    onboarding.js     — Onboarding Inteligente
    comunicacao.js    — Central de Comunicação
  modules/            — Interfaces de cada módulo
  components/         — Componentes reutilizáveis (card, badge, table, etc.)
  repositories/       — Repositórios (abstração dos dados)
```

## Funcionalidades

### Operacional
- **Central de Trabalho** (Hoje) — visão unificada do dia
- **Central de Comunicação** — WhatsApp, agenda, calendário, Instagram
- **Agenda** — agendamentos e fila do dia
- **Atendimento** — gerenciamento da fila operacional
- **Fila Inteligente** — priorização dinâmica de atendimento

### Comercial
- **CRM** — pipeline comercial e próxima ação
- **Inbox (Conversas)** — central de atendimento
- **Orçamentos** — controle de negociação
- **Oportunidades** — detecção automática de receita

### Pós-venda
- **Pós-atendimento** — planos de acompanhamento
- **Notificações** — central de alertas

### Marketing
- **Centro de Marketing** — calendário editorial, ideias, CTAs, templates
- **Base de Conhecimento** — artigos, protocolos e FAQs

### Inteligência
- **AI Hub** — insights, score operacional e recomendações
- **Automações** — regras automáticas entre módulos

### Administrativo
- **Financeiro** — caixa e lançamentos
- **Estoque** — produtos e movimentações
- **Relatórios** — dashboards e métricas
- **Studio** — configurações do estúdio
- **Onboarding** — assistente de configuração inicial

## Licença

Uso interno — Pirataria Body Art
