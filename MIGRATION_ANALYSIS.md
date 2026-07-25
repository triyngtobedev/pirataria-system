# Análise de Migração de Interface

> **Branch:** `feature/interface-migration-analysis`
> **Status:** Análise pendente — aguardando abertura do projeto do site antigo
> **Data de criação:** 2026-07-25

## Instruções

Este documento deve ser preenchido quando o segundo projeto (site antigo do Pirataria Body Art) for aberto no OpenCode.

Para cada seção abaixo, analise o código do site antigo e documente os achados.

---

## 1. Inventário Visual

> Liste aqui todos os componentes visuais encontrados no site antigo.

### Estrutura de pastas
```
(analisar e documentar)
```

### HTML
- Quantidade de páginas:
- Estrutura de templates:
- Comentários relevantes:

### CSS
- Arquivos encontrados:
- Linhas totais:
- Metodologia (BEM, utility-first, etc.):

### JavaScript
- Arquivos encontrados:
- Dependências/bibliotecas:
- Padrões de código:

### Assets
- Fontes:
- Ícones:
- Imagens:
- Logos:

---

## 2. Design System

### Cores

| Token | HEX | Uso |
|-------|-----|-----|
| Primary | | |
| Secondary | | |
| Background | | |
| Surface | | |
| Text | | |
| Text muted | | |
| Border | | |
| Accent | | |
| Success | | |
| Warning | | |
| Error | | |

### Tipografia

| Propriedade | Valor |
|-------------|-------|
| Fonte principal | |
| Fonte de títulos | |
| Fonte monospace | |
| Tamanho base | |
| Line-height | |
| Weights usados | |

### Espaçamentos

- Padding padrão:
- Margin padrão:
- Grid gaps:
- Breakpoints:

### Sombras e bordas

- Border-radius padrão:
- Box-shadow padrão:
- Tipos de borda:

### Botões

| Tipo | Padding | Background | Cor do texto | Border | Hover |
|------|---------|------------|--------------|--------|-------|
| Primary | | | | | |
| Secondary | | | | | |
| Danger | | | | | |
| Ghost | | | | | |
| Small | | | | | |

### Inputs e Formulários

- Input text:
- Select:
- Textarea:
- Checkbox/Radio:
- Validação (erro/sucesso):

### Badges e Tags

| Tipo | Background | Texto | Border-radius |
|------|------------|-------|---------------|

### Tabelas

- Header:
- Row:
- Border:
- Hover:
- Responsividade:

### Cards

- Padding:
- Background:
- Border:
- Sombra:
- Hover:

### Grids e Layout

- Container width:
- Grid columns:
- Gap:
- Media queries:

### Modais / Overlays

- Overlay background:
- Modal width:
- Padding:
- Animação:

### Navegação

- Sidebar ou topbar:
- Menu ativo:
- Largura:
- Ícones:

---

## 3. Componentes Reutilizáveis

> Componentes do site antigo que podem ser usados **diretamente** no Body Art OS sem adaptação.

| Componente | Localização | Observações |
|------------|-------------|-------------|
| | | |
| | | |

---

## 4. Componentes que Precisarão de Adaptação

> Componentes que exigirão ajustes para funcionar com os módulos do Body Art OS.

| Componente | Localização | Adaptação necessária |
|------------|-------------|----------------------|
| | | |
| | | |

---

## 5. Mapeamento de Telas

> Relacionar cada página/tela do site antigo com os módulos correspondentes do Body Art OS.

| Site Antigo | Body Art OS | Observações |
|-------------|-------------|-------------|
| Home / Landing | — (nova landing) | |
| Dashboard | Meu Dia (`hoje`) | |
| Clientes | Client Management (`clientes`) + CRM (`crm`) | |
| Agenda | Agenda (`agenda`) + Confirmações (`confirmacao`) | |
| Financeiro | Financeiro (`financeiro`) + Caixa | |
| Estoque | Estoque (`estoque`) + Catálogo de Joias | |
| Orçamentos | Orçamentos (`orcamentos`) | |
| Atendimento | Atendimento (`atendimento`) + Fila (`filas`) | |
| Conversas | Inbox (`inbox`) + Assistente WhatsApp | |
| Marketing | Marketing (`marketing`) + Instagram | |
| Base de Conhecimento | Conhecimento (`conhecimento`) | |
| Notificações | Notificações (`notificacoes`) | |
| Relatórios | Relatórios (`relatorios`) | |
| Configurações | Studio (`studio`) | |
| Login / Cadastro | Login + Setup + Onboarding | |
| Perfil do Cliente | Client Panel (`clientes`) | |
| Pós-atendimento | Pós-atendimento (`posatendimento`) | |
| Oportunidades | Oportunidades (`oportunidades`) | |
| AI Hub | AI Hub (`aihub`) | |
| Central de Comunicação | Comunicação (`comunicacao`) | |

---

## 6. Estratégia de Migração

### Etapa 1 — Design System
> Incorporar cores, tipografia, espaçamentos, botões e formulários do site antigo.

**Arquivos afetados:**
- `style.css` — substituir variáveis CSS e estilos base
- `index.html` — atualizar estrutura do shell se necessário

**Risco:** Baixo — alteração apenas de estilo visual

### Etapa 2 — Layout Base
> Substituir sidebar, header e footer do Body Art OS pelos do site antigo.

**Arquivos afetados:**
- `index.html` — sidebar, header, footer
- `style.css` — classes de layout

**Risco:** Médio — requer ajuste nas classes JS que manipulam navegação

### Etapa 3 — Navegação
> Adaptar o router para usar a estrutura de navegação do site antigo.

**Arquivos afetados:**
- `src/router.js` — adaptar seletores de `data-module`
- `src/app.js` — adaptar `bindNav()`

**Risco:** Médio — requer mapeamento entre rotas e links do menu antigo

### Etapa 4 — Dashboard (Meu Dia)
> Replicar a estrutura do dashboard antigo com os dados inteligentes do Body Art OS.

**Arquivos afetados:**
- `src/modules/hoje.js` — layout dos cards e seções
- `style.css` — classes do dashboard

**Risco:** Alto — maior volume de alterações

### Etapa 5 — Demais Módulos
> Aplicar o novo design system em cada módulo, um por vez.

**Ordem sugerida:**
1. Inbox (WhatsApp)
2. Agenda
3. Clientes / CRM
4. Atendimento
5. Financeiro
6. Marketing
7. Demais módulos

**Risco:** Médio — cada módulo requer adaptação de templates

### Etapa 6 — Polimento Final
> Ajustar responsividade, animações, estados vazios e de carregamento.

**Risco:** Baixo — ajustes finos

### Etapa 7 — Validação
> Revisar todos os módulos para garantir que nenhuma funcionalidade foi perdida.

**Checklist:**
- [ ] Login / Cadastro
- [ ] Onboarding
- [ ] Agenda
- [ ] Inbox + WhatsApp
- [ ] Assistente de Atendimento
- [ ] Assistente de Agendamento
- [ ] Fluxo de Agendamento
- [ ] CRM
- [ ] Orçamentos
- [ ] Atendimento
- [ ] Fila Inteligente
- [ ] Pós-atendimento
- [ ] Marketing / Instagram
- [ ] Financeiro / Caixa
- [ ] Estoque
- [ ] Base de Conhecimento
- [ ] Notificações
- [ ] Central de Comunicação
- [ ] Central de Oportunidades
- [ ] Central de Confirmações
- [ ] Meu Dia
- [ ] AI Hub
- [ ] Google Calendar
- [ ] Evolution API
- [ ] Busca Global
- [ ] PWA / Service Worker
- [ ] Pipeline CI/CD

---

## Próximos Passos

1. Abrir o projeto do site antigo no OpenCode
2. Preencher este documento com a análise real
3. Revisar a estratégia com base nos achados
4. Iniciar a migração pela Etapa 1 (Design System)

---

*Documento gerado em 2026-07-25 — aguardando análise do projeto do site antigo.*
