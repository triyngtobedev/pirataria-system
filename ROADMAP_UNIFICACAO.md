# Roadmap de Unificação — Pirataria Body Art OS + Pirataria System

> Documento estratégico oficial.
> Versão: 1.0 — Data: julho/2026

---

## 1. Decisão Oficial

Fica definido que:

> **O Pirataria Body Art OS passa a ser o produto principal.**
>
> **O Pirataria System passa a ser a referência de UX, produtividade e evolução do produto.**

A partir desta data:

- Todo desenvolvimento de infraestrutura, backend, banco de dados e deploy será feito no **Body Art OS**.
- Toda inovação de interface, fluxo operacional, experiência do usuário e prototipação será validada primeiro no **Pirataria System**.
- Nenhuma funcionalidade será desenvolvida exclusivamente em um dos dois projetos sem antes ter o devido mapeamento de responsabilidades neste documento.

---

## 2. O que permanece no Body Art OS

As seguintes funcionalidades são consideradas **definitivas** no Body Art OS e **não serão recriadas** no Pirataria System:

| Funcionalidade | Motivo |
|---|---|
| **Login e Autenticação** | JWT + refresh token + recuperação de senha |
| **Multi-estúdio** | Suporte a múltiplos estúdios por instalação |
| **Banco PostgreSQL** | Persistência relacional com migrações versionadas |
| **SQLAlchemy** | ORM maduro e testado |
| **Flask** | Framework web base |
| **Docker** | Containerização do ambiente |
| **Railway** | Plataforma de deploy |
| **PWA** | Aplicação progressiva com suporte offline parcial |
| **Agenda** | Calendário com Google Calendar + Google Tasks + push notifications |
| **Estoque** | Controle de produtos, insumos e catálogo de joias |
| **Financeiro** | Caixa, relatórios, fluxo, conciliação |
| **Atendimento** | Fila, OS, comissões, pacotes |

Nenhuma destas funcionalidades será reimplementada. Quando houver necessidade de evolução, ela ocorrerá no Body Art OS, podendo incorporar validações de UX feitas no Pirataria System.

---

## 3. Funcionalidades que serão incorporadas do Pirataria System

As seguintes funcionalidades foram validadas no Pirataria System e **devem ser incorporadas ao Body Art OS** na ordem definida pela seção 6:

### UX e Produtividade

| Funcionalidade | Origem no Pirataria System | Ganho |
|---|---|---|
| **Dashboard moderno** | `_renderDashboard()` — cards com count-up, métricas do dia, atividade recente | Visão consolidada sem abrir múltiplos módulos |
| **Checklist "Comece por Aqui"** | `_renderOnboardingChecklist()` — onboarding progressivo | Reduz tempo entre instalação e primeiro atendimento |
| **Card "Próxima Ação"** | `_renderNextAction()` — orienta fluxo do atendimento | Elimina dúvida sobre o que fazer a seguir |
| **Command Palette (Ctrl+K)** | `Palette` — 22 ações com busca e teclado | Reduz cliques e tempo de navegação |
| **Empty States** | `C.emptyStateFull()` — SVGs ilustrativos + ação | Elimina sensação de sistema vazio |
| **Loading padronizado** | `App._showLoading()` — overlay com spinner | Feedback visual em operações lentas |
| **Guards contra ações duplicadas** | `App._withGuard()` / `App._locks` | Impede duplo clique e duplicação de registros |
| **Toasts** | `App._toast()` — 4 categorias com auto-dismiss | Feedback visual sem alert() |
| **Unsaved Changes** | `App._markDirty()` / `_checkDirty()` | Protege contra perda de dados |

### CRM Inteligente

| Funcionalidade | Origem no Pirataria System | Ganho |
|---|---|---|
| **Perfil completo do cliente** | Painel com resumo, timeline, gastos, frequência, top serviços | Decisão baseada em dados sem consultar histórico manual |
| **Indicadores de relacionamento** | Cliente novo / recorrente / inativo +90 dias | Base para ações de marketing e retenção |
| **Anexos documentais** | Upload por cliente, OS e termo | Centralização documental |
| **Vales (crédito do cliente)** | Controle de pagamentos antecipados | Elimina anotação externa |
| **Pacotes de serviços** | Sessões contratadas com consumo automático | Controle sem planilha paralela |

### Operação

| Funcionalidade | Origem no Pirataria System | Ganho |
|---|---|---|
| **Busca universal** | `Search.index()` — clientes + agenda + fila | Encontrar registros sem navegar entre módulos |
| **Pendências de Hoje** | `_renderPendingPanel()` — consolida o que falta | Responde "o que ainda precisa ser feito?" |
| **Auditoria visual** | `Audit.action()` — log com módulo, ação, descrição | Rastreabilidade sem consultar banco |
| **Ordem de Serviço** | Geração automática ao concluir atendimento | Documento formal sem digitação extra |
| **Termo de Consentimento** | Geração + assinatura digital | Elimina papel e arquivamento físico |
| **Assinatura digital** | Canvas com mouse/touch/caneta | Assinatura no próprio sistema |
| **Comprovante oficial** | Preparado para PDF com identidade do estúdio | Profissionaliza a entrega ao cliente |

### Relatórios

| Funcionalidade | Origem no Pirataria System | Ganho |
|---|---|---|
| **Visão geral** | Faturamento, atendimentos, ticket médio por período | Métricas sem extrair dados manualmente |
| **Ranking de profissionais** | Por faturamento, atendimentos, ticket médio | Base para comissionamento e avaliação |
| **Ranking de serviços** | Mais realizados, faturamento, participação percentual | Decisão de portfólio baseada em dados |
| **Taxas da agenda** | Conclusão, cancelamento, não confirmação | Qualidade operacional mensurável |
| **Financeiro por categoria** | Receitas, despesas, lucro operacional | Visão gerencial sem planilha |

---

## 4. Funcionalidades descartadas (não serão recriadas)

As seguintes funcionalidades **já existem no Body Art OS** ou **foram substituídas** e não serão recriadas no Pirataria System:

| Funcionalidade | Motivo |
|---|---|
| **Agenda** | Já implementada no Body Art OS com Google Calendar + Tasks + push |
| **Financeiro** | Já implementado com conciliação bancária e fluxo de caixa |
| **Login** | JWT + refresh token + OAuth no Body Art OS |
| **Estoque** | Já implementado com catálogo de joias e insumos |
| **Atendimento** | Já implementado com fluxo completo |
| **Cadastro de usuários** | Gerenciamento de acesso no Body Art OS |
| **Recuperação de senha** | Fluxo de e-mail + token no Body Art OS |
| **Multi-estúdio** | Arquitetura multi-tenant no Body Art OS |

---

## 5. Nova filosofia do produto

> **"O software deixa de ser apenas um sistema de gestão."**
>
> **"O software passa a ser um Centro de Operações para estúdios de Body Piercing."**

### Critério oficial de priorização

Toda funcionalidade futura deverá responder **SIM** para pelo menos uma das perguntas abaixo:

| Pergunta | Tradução operacional |
|---|---|
| **Reduz trabalho manual?** | Elimina planilha, anotação avulsa, cópia manual entre sistemas, duplicação de registro? |
| **Melhora o atendimento?** | Reduz tempo do cliente no estúdio, organiza o fluxo, evita erros operacionais, profissionaliza a entrega? |
| **Ajuda a trazer mais clientes?** | Gera dado que pode ser usado em CRM, marketing, relacionamento ou indicação? |

**Se não passar em pelo menos um critério, a funcionalidade permanece no backlog.**

---

## 6. Ordem de evolução

### Fase 1 — Consolidar o Body Art OS como base

| O quê | Por quê |
|---|---|
| Finalizar infraestrutura (Docker, Railway, PostgreSQL, PWA) | Base precisa estar sólida antes de receber novas funcionalidades |
| Migrar autenticação e multi-estúdio | Pré-requisito para qualquer módulo futuro |
| Garantir deploy automatizado | Ciclo curto de feedback |

### Fase 2 — Migrar as melhores ideias do Pirataria System

| O quê | Origem |
|---|---|
| Dashboard moderno + métricas | Pirataria System |
| Command Palette + Busca universal | Pirataria System |
| Empty States + Loading + Toasts + Guards | Pirataria System |
| Unsaved Changes + Auditoria visual | Pirataria System |
| OS + Termo + Assinatura digital | Pirataria System |
| Comprovante oficial PDF | Pirataria System |
| Perfil completo do cliente | Pirataria System |

### Fase 3 — Módulos exclusivos de CRM

| O quê | Problema resolvido |
|---|---|
| Indicadores de relacionamento | Saber quais clientes estão inativos sem consultar manualmente |
| Sugestão automática de contato | Cliente +90 dias sem retorno → alerta para ação |
| Clientes autorizados para marketing | Base para campanhas sem violar privacidade |
| Biblioteca de fotos autorizadas | Portfólio com permissão do cliente |

### Fase 4 — Módulos de Marketing

| O quê | Problema resolvido |
|---|---|
| Calendário editorial | Planejamento de postagens sem planilha externa |
| Banco de legendas | Legendas e CTAs organizados por tema |
| Banco de ideias | Ideias de conteúdo registradas e categorizadas |
| Agendamento de posts | Publicação programada (integração com Instagram) |

### Fase 5 — Automação e IA

| O quê | Problema resolvido |
|---|---|
| Lembrete automático de horário via WhatsApp | Reduz faltas sem trabalho manual |
| Pós-atendimento automático | Mensagem de agradecimento + pedido de avaliação |
| Sugestão de agendamento com base no histórico | "Cliente X volta em média a cada 45 dias — sugerir agenda?" |
| Classificação automática de leads | Priorizar contatos com maior chance de conversão |
| Respostas inteligentes baseadas no catálogo | Responder dúvidas frequentes sem digitar |

---

> Este documento é a referência oficial do projeto.
>
> Toda decisão de produto deve consultar este roadmap antes de ser iniciada.
>
> O Pirataria System permanece como laboratório de inovação — toda nova ideia deve ser validada nele antes de migrar para o Body Art OS.
>
> Nenhuma funcionalidade deve existir nos dois projetos simultaneamente sem justificativa registrada neste documento.
