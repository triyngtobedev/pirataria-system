# Mapa de Coexistência dos Sistemas — Pirataria System

> Documento interno de diagnóstico.
> Versão: 1.0 — Data: julho/2026

---

## 1. Responsabilidades do sistema atual

O software já utilizado pelo estúdio (Instagram, WhatsApp, agenda de rede social, etc.) continua responsável por:

| Área | Responsabilidade | Motivo |
|---|---|---|
| **Atendimento ao cliente** | Recepção de mensagens, dúvidas rápidas, contato inicial via WhatsApp/Instagram DM | O público já está nessas plataformas; migrar isso geraria atrito |
| **Agenda pública / disponibilidade** | Exibição de horários disponíveis para o público externo | O Pirataria System é interno; não substitui uma landing page ou agregador de agenda |
| **Marketing orgânico** | Postagem de conteúdo, stories, portfólio, interação com seguidores | Rede social é o canal de aquisição; o Pirataria System não deve competir com isso |
| **Comunicação com cliente** | Lembrete de horário por WhatsApp, confirmação de agendamento, pós-atendimento | O Pirataria System não possui disparo de mensagens nativo nesta versão |
| **Portfólio visual** | Fotos de trabalhos realizados, apresentação de resultados | O Pirataria System armazena anexos documentais, não portfólio artístico |
| **Pagamento online** | Link de pagamento, maquininha, PIX avulso | O Pirataria System registra o pagamento, mas não processa a transação |

---

## 2. Responsabilidades do Pirataria System

### Produtividade diária

| Funcionalidade | Problema resolvido |
|---|---|
| Painel "Próxima Ação" | Operador não precisa lembrar do fluxo — o sistema orienta |
| Painel "Pendências de Hoje" | Operador enxerga o que falta sem abrir 5 módulos separados |
| Dashboard operacional | Métricas do dia em tempo real sem calcular manualmente |
| Busca universal (Ctrl+K) | Encontrar cliente/agendamento sem navegar entre módulos |
| Command Palette (Ctrl+K) | Executar ações sem clicar em menus |

### Organização operacional

| Funcionalidade | Problema resolvido |
|---|---|
| Cadastro de clientes com perfil completo | Dados centralizados, histórico, métricas por cliente |
| Agenda com visão semanal/diária | Planejamento do dia sem depender de agenda física |
| Fila de atendimento | Status visual de cada cliente no expediente |
| Ordem de Serviço | Documento formal do atendimento realizado |
| Termo de Consentimento | Proteção jurídica com registro de autorização |
| Comissões automáticas | Cálculo baseado em regras, elimina planilha manual |
| Pacotes de serviços | Controle de sessões contratadas sem controles paralelos |
| Vales (crédito do cliente) | Gestão de pagamentos antecipados sem anotação externa |

### CRM complementar

| Funcionalidade | Problema resolvido |
|---|---|
| Perfil completo do cliente (gastos, frequência, timeline) | Entender o relacionamento sem consultar histórico manual |
| Indicadores de cliente novo, recorrente, inativo | Base para ações de relacionamento |
| Anexos documentais por cliente | Documentos centralizados no perfil |

### Estoque e vendas

| Funcionalidade | Problema resolvido |
|---|---|
| Controle de produtos e categorias | Saber o que tem em estoque sem conferir fisicamente |
| Movimentações (entrada/saída/ajuste) | Histórico de alterações sem planilha |
| Venda com baixa automática de estoque | Unificar venda e controle de estoque |

### Financeiro

| Funcionalidade | Problema resolvido |
|---|---|
| Caixa diário com abertura/fechamento | Conferência no fim do dia sem cálculo manual |
| Lançamentos por forma de pagamento | Saber quanto entrou em PIX, dinheiro, cartão |
| Fechamento com diferença | Identificar divergência sem fazer conta |
| Lançamentos manuais (despesas) | Registrar gasto do dia sem sistema externo |
| Relatórios por período | Visão gerencial sem extrair dados manualmente |

### Infraestrutura

| Funcionalidade | Problema resolvido |
|---|---|
| Backup e restauração | Segurança dos dados sem processo manual |
| Migrações automáticas de schema | Atualizações seguras sem intervenção |
| Auditoria de ações | Rastreabilidade de alterações |
| Controle de acesso por perfil | Cada operador vê apenas o necessário |
| Event Bus | Comunicação desacoplada entre módulos |
| Unsaved Changes | Proteção contra perda de dados |

---

## 3. Áreas de integração futura

Possíveis pontos de integração entre o sistema atual e o Pirataria System (não implementar agora, apenas mapear):

| Integração | Descrição |
|---|---|
| **Calendário público → Pirataria System** | Cliente agenda online → disponibilidade bloqueada automaticamente no sistema |
| **Pirataria System → WhatsApp** | Lembrete automático de horário, confirmação de agendamento, pós-atendimento |
| **Pirataria System → Instagram** | Publicar portfólio a partir de anexos marcados como "para divulgar" |
| **Pirataria System → Financeiro externo** | Exportar lançamentos para contabilidade |
| **Pirataria System → E-mail** | Envio de OS, termo e comprovantes por e-mail |
| **Gateway de pagamento** | Links de cobrança gerados automaticamente ao finalizar OS/venda |
| **WhatsApp → Pirataria System** | Cliente envia mensagem → sistema abre ou localiza ficha |

---

## 4. Critério oficial de priorização

> **Toda funcionalidade implementada no Pirataria System deve responder SIM a pelo menos uma das perguntas abaixo:**

1. **Isso reduz trabalho manual?**
   Elimina planilha, anotação avulsa, cálculo manual, duplicação de registro?

2. **Isso melhora o atendimento?**
   Reduz tempo do cliente no estúdio, organiza o fluxo, evita erros operacionais?

3. **Isso ajuda a trazer mais clientes?**
   Gera dado que pode ser usado em ação de marketing, CRM, relacionamento?

### O que NÃO será priorizado

- Funcionalidades já resolvidas pelo sistema atual (rede social, comunicação direta, portfólio)
- Módulos que não passem no critério acima
- Automações complexas sem ganho operacional claro
- Integrações que exijam manutenção externa constante

---

> Este documento deve ser revisado a cada nova funcionalidade proposta.
> Se a funcionalidade não passar no critério de priorização, ela permanece no backlog.
> Se ela duplicar responsabilidade do sistema atual, ela é descartada.
