# Pirataria Body Art — Sistema de Gestão

Sistema interno para o estúdio de tatuagem e piercing **Pirataria Body Art**, localizado no Centro Histórico de Salvador (Santo Antônio Além do Carmo).

## Módulos

| Módulo       | Descrição |
|--------------|-----------|
| **Agenda**   | Calendário semanal e diário com agendamentos por profissional. Criar, editar, confirmar e concluir agendamentos. Ao concluir, registro automático no histórico do cliente. |
| **Clientes** | Cadastro com nome, telefone, Instagram, interesse. Busca ao vivo. Painel lateral com edição inline e histórico completo de atendimentos (data, serviço, profissional, valor). |
| **Atendimento** | Tela principal durante o expediente. Fila do dia com agendamentos e avulsos. Botões para iniciar/concluir/cancelar. Resumo com total, pendentes, em atendimento, concluídos e faturamento do dia. |
| **Studio**   | Configurações gerais do estúdio (nome, endereço, telefone, Instagram, horários, sobre). |

## Tecnologias

- HTML / CSS / JavaScript puro (sem frameworks, sem build)
- Dados persistidos em `localStorage`
- Design escuro, tipografia limpa
- Zero dependências de frontend

## Deploy

Projeto estático. Qualquer static host serve.

### Railway

```bash
npx serve .
```

O arquivo `railway.json` já está configurado para deploy automático via Nixpacks.

## Desenvolvimento

Abra o `index.html` diretamente no navegador. Nenhum servidor necessário.

## Estrutura

```
pirataria-system/
├── index.html              — Entry point (SPA)
├── style.css               — Estilos globais
├── railway.json            — Configuração Railway
├── package.json            — Dependências de servidor
├── README.md
├── .gitignore
└── src/
    ├── app.js              — Bootstrap e inicialização
    ├── router.js            — Roteamento entre módulos
    ├── constants.js         — Constantes do sistema
    ├── db.js                — Camada de dados (localStorage)
    ├── modules/             — Módulos da aplicação
    │   ├── agenda.js
    │   ├── atendimento.js
    │   ├── clientes.js
    │   ├── estoque.js
    │   ├── financeiro.js
    │   ├── relatorios.js
    │   └── studio.js
    ├── utils/               — Utilitários
    │   ├── audit.js
    │   ├── auth.js
    │   ├── backup.js
    │   ├── clientMetrics.js
    │   ├── dom.js
    │   ├── events.js
    │   ├── finance.js
    │   ├── inventory.js
    │   ├── metrics.js
    │   ├── migrations.js
    │   ├── permissions.js
    │   ├── reports.js
    │   ├── search.js
    │   ├── toast.js
    │   └── validation.js
    └── repositories/        — Padrão Repository
        ├── index.js
        ├── agendaRepository.js
        ├── atendimentoRepository.js
        ├── clientesRepository.js
        ├── financeiroRepository.js
        ├── produtosRepository.js
        └── studioRepository.js
```
