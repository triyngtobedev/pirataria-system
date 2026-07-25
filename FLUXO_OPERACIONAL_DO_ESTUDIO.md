# Fluxo Operacional do Estúdio — Mapeamento de um Dia Típico

> Documento de análise operacional.
> Versão: 1.0 — Data: julho/2026
> Objetivo: Identificar gargalos, trabalho manual e oportunidades antes de priorizar novas funcionalidades.

---

## 1. Antes da abertura

| Etapa | Ferramenta atual | Trabalho manual | Oportunidade para o Pirataria System |
|---|---|---|---|
| Preparação do estúdio | — | Organização física independente do sistema | — |
| Conferência da agenda | Pirataria System / Agenda física | Abrir o sistema e verificar agendamentos do dia | Já resolvido — Dashboard exibe agendamentos de hoje |
| Conferência de materiais | Planilha / Anotação avulsa | Verificar estoque físico; comparar com agendamentos previstos | Sugerir materiais necessários com base nos serviços agendados do dia (ex.: piercing marcado → verificar se tem joia disponível) |
| Organização financeira | Planilha / Caixa físico | Preparar troco, conferir saldo inicial | Caixa diário já registra saldo inicial; pode sugerir valor com base no histórico de dias anteriores |

---

## 2. Chegada de novos contatos (pré-atendimento)

| Etapa | Ferramenta atual | Trabalho manual | Oportunidade para o Pirataria System |
|---|---|---|---|
| Cliente envia mensagem | WhatsApp / Instagram DM | Responder dúvidas sobre serviços, valores, disponibilidade | — (fora do escopo — responsabilidade do sistema atual) |
| Cliente pede orçamento | WhatsApp | Digitar valores, serviços, explicar procedimento | Template de respostas rápidas com base nos serviços cadastrados; compartilhar portfólio |
| Cliente pede agenda | WhatsApp + Pirataria System | Consultar disponibilidade no sistema e responder manualmente | Disponibilidade não é pública; integração futura com calendário público |
| Cliente confirma interesse | WhatsApp | Anotar nome, telefone, serviço desejado | Se o contato vier de um lead, o cadastro pode ser iniciado automaticamente |
| Cadastro no sistema | Pirataria System | Recepcionista digita dados que o cliente já enviou no WhatsApp | **Copy-paste entre WhatsApp e sistema** — maior gargalo de pré-atendimento |

---

## 3. Agendamento

| Etapa | Ferramenta atual | Trabalho manual | Oportunidade para o Pirataria System |
|---|---|---|---|
| Definir horário | Pirataria System + WhatsApp | Verificar disponibilidade no sistema; confirmar com cliente via WhatsApp | Já resolvido — agenda mostra disponibilidade. Gargalo está na comunicação bidirecional |
| Registrar agendamento | Pirataria System | Criar agendamento com dados do cliente | Já resolvido — criação com vínculo a cliente existente ou novo |
| Anotar observações | Pirataria System | Copiar observações da conversa do WhatsApp para o campo de notas | **Duplicação manual de informação entre WhatsApp e sistema** |
| Confirmar agendamento | WhatsApp | Enviar mensagem de confirmação; cliente pode não responder | Integração futura: disparo automático de confirmação |
| Cliente não comparece | Pirataria System | Marcar como não comparecido; tentar contato novamente | Já resolvido — status "cancelado" no agendamento |

---

## 4. Dia do atendimento

### 4.1 Recepção

| Etapa | Ferramenta atual | Trabalho manual | Oportunidade para o Pirataria System |
|---|---|---|---|
| Cliente chega | Pirataria System | Localizar cliente na fila de atendimento | Já resolvido — fila de atendimento com status visual |
| Confirmar cadastro | Pirataria System | Verificar dados, atualizar se necessário | Já resolvido — edição inline no painel do cliente |
| Verificar pendências | Pirataria System | Checar se cliente tem vale, pacote, OS pendente | Parcialmente resolvido — Pendências de Hoje mostra alertas, mas não por cliente individual |
| Iniciar atendimento | Pirataria System | Clicar em "Iniciar" na fila | Já resolvido — botão "Iniciar" muda status para `in_progress` |

### 4.2 Atendimento

| Etapa | Ferramenta atual | Trabalho manual | Oportunidade para o Pirataria System |
|---|---|---|---|
| Executar procedimento | — (físico) | Atendimento em si não depende de software | — |
| Registrar observações | Pirataria System / Papel | Anotar detalhes do procedimento | Já resolvido — campo de observações no atendimento |
| Fotografar resultado | Câmera do celular | Tirar foto; depois organizar em galeria/pasta | **Anexo ao cliente/OS não substitui portfólio** — fotos ficam no celular, não no sistema |

### 4.3 Ordem de Serviço

| Etapa | Ferramenta atual | Trabalho manual | Oportunidade para o Pirataria System |
|---|---|---|---|
| Gerar OS | Pirataria System | Clicar em "Gerar OS" após atendimento | Já resolvido — prompt automático ao concluir atendimento |
| Preencher dados | Pirataria System | Sistema pré-preenche com dados do atendimento | Já resolvido |
| Imprimir / assinar | Papel | Imprimir OS para assinatura do cliente | **Documento digital existe, mas assinatura é física** — campo de assinatura digital preparado, mas não implementado |

### 4.4 Termo de Consentimento

| Etapa | Ferramenta atual | Trabalho manual | Oportunidade para o Pirataria System |
|---|---|---|---|
| Gerar termo | Pirataria System | Sistema pergunta se deseja gerar (integrado com OS) | Já resolvido — verificação automática de termo pendente |
| Cliente ler e assinar | Papel | Imprimir termo; cliente assina; depois guardar | **Mesmo gargalo da OS** — assinatura digital eliminaria papel |
| Arquivar | Pasta física | Guardar via física; difícil consultar depois | Já resolvido — termo digital permanece no sistema; consultável a qualquer momento |

### 4.5 Pagamento

| Etapa | Ferramenta atual | Trabalho manual | Oportunidade para o Pirataria System |
|---|---|---|---|
| Calcular valor | Pirataria System + cabeça | Valor do serviço + produtos + descontos | Já resolvido — valor registrado no atendimento + venda |
| Processar pagamento | Maquininha / PIX | Cliente paga por fora do sistema | **Registro do pagamento é manual** — operador precisa lançar no financeiro separadamente |
| Registrar forma de pagamento | Pirataria System | Lançar entrada no financeiro com forma de pagamento | Já resolvido — lançamento manual ou automático via Event Bus |
| Emitir comprovante | Papel / PIX | Comprovante da maquininha (não integrado) | **Sem emissão de comprovante oficial do estúdio** — poderia gerar PDF com logo e dados |

### 4.6 Encerramento do atendimento

| Etapa | Ferramenta atual | Trabalho manual | Oportunidade para o Pirataria System |
|---|---|---|---|
| Finalizar na fila | Pirataria System | Clicar em "Concluir" | Já resolvido — botão "Concluir" atualiza status |
| Próxima ação | Pirataria System | Sistema sugere o que fazer (OS, termo, pagamento) | Já resolvido — card "Próxima Ação" no Atendimento |

---

## 5. Pós-atendimento

| Etapa | Ferramenta atual | Trabalho manual | Oportunidade para o Pirataria System |
|---|---|---|---|
| Registrar fotos do resultado | Câmera / WhatsApp | Fotos ficam no celular ou na conversa do cliente | **Anexo ao histórico do cliente** já existe, mas fotos de portfólio não são separadas de fotos documentais |
| Organizar documentos do dia | Pirataria System + Papel | OS e termo impressos precisam ser arquivados | Se assinatura digital for implementada, documentos físicos são eliminados |
| Verificar retorno | Pirataria System | Agendar retorno se necessário | Já resolvido — novo agendamento pode ser criado |
| Ação de relacionamento | Instagram / WhatsApp | Marcar cliente para campanha futura | **Sem CRM integrado** — cliente inativo >90 dias aparece nos relatórios, mas não gera ação automática |
| Compartilhar resultado | Instagram | Publicar foto do trabalho (com autorização) | **Portfólio externo não é responsabilidade do sistema** — mas o sistema poderia marcar anexos como "para divulgar" |

---

## 6. Encerramento do expediente

| Etapa | Ferramenta atual | Trabalho manual | Oportunidade para o Pirataria System |
|---|---|---|---|
| Verificar pendências | Pirataria System | Olhar o que ficou aberto no dia | Já resolvido — painel "Pendências de Hoje" |
| Fechar caixa | Pirataria System + Calculadora | Conferir valor do sistema vs. valor físico | Já resolvido — assistente de fechamento com diferença calculada |
| Conferir valores por forma de pagamento | Pirataria System | Ver se PIX, dinheiro e cartão batem | Já resolvido — relatório por forma de pagamento no fechamento |
| Conferir estoque | Físico | Verificar se saída do dia está correta | Movimentações já são registradas; conferência física continua necessária |
| Fazer backup | Pirataria System | Exportar backup ao final do dia | Já resolvido — botão "Exportar backup" no Studio |
| Anotar ocorrências | Papel / Bloco de notas | Registrar algo fora do comum no dia | **Sem campo de diário de bordo** — poderia ter um campo de "ocorrências do dia" no fechamento de caixa |

---

## Resumo dos gargalos identificados

| # | Gargalo | Impacto | Solução possível |
|---|---|---|---|
| 1 | **Copy-paste entre WhatsApp e sistema** | Alto — toda conversa precisa ser digitada novamente no cadastro | Template de respostas rápidas + integração futura com API do WhatsApp |
| 2 | **Assinatura digital ausente** | Alto — OS e termos precisam ser impressos e assinados em papel | Implementar campo de assinatura digital (já preparado no modelo de dados) |
| 3 | **Fotos de portfólio vs. anexos documentais** | Médio — fotos do resultado ficam no celular, não no sistema | Criar marcador "para divulgar" nos anexos (já existe estrutura de anexos) |
| 4 | **Sem emissão de comprovante oficial** | Médio — comprovante é o da maquininha, sem identidade do estúdio | Gerar PDF de comprovante com logo e dados do estúdio |
| 5 | **Retorno de cliente inativo não gera ação** | Médio — cliente +90 dias aparece no relatório mas ninguém age | Sugestão automática de contato para clientes inativos |
| 6 | **Diário de bordo ausente** | Baixo — ocorrências do dia não têm onde ser registradas | Campo de "ocorrências do dia" no fechamento de caixa |
| 7 | **Checklist de materiais** | Baixo — profissional precisa verificar estoque manualmente antes do atendimento | Sugerir materiais necessários com base nos serviços do dia |

---

## Próximos passos recomendados

Com base no mapeamento acima, os gargalos que mais impactam o uso diário (sem criar novos módulos) são:

1. **Assinatura digital** — elimina papel e arquivamento físico de OS e termos
2. **Comprovante oficial** — gera PDF do atendimento com identidade do estúdio
3. **Marcador "para divulgar" em anexos** — conecta o registro do atendimento ao portfólio

Estes três itens resolvem gargalos reais sem depender de integração externa e sem criar novos módulos.
