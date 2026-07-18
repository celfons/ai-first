---
name: daily-backlog
description: Rotina diária — PARTE 1 de 2 (priorização das issues do dia). Skill standalone, feita para rodar como trigger agendado, DEPOIS do `/daily-growth` (ADR-0007). Aciona o subagente `product-owner` para ARBITRAR uma FILA ÚNICA de `features_per_day` vagas, misturando issues NOVAS de evolução de negócio/produto que ele cria + as PROPOSTAS de growth abertas (`growth-proposed`), aplicando `po-suggested` só ao que ganha vaga — produto ou growth. É o árbitro único de prioridade. NÃO implementa nada. O cron de desenvolvimento (`/daily-build`) roda ~1h depois e pega só o que recebeu `po-suggested`.
---

# /daily-backlog — cria as issues do dia (Parte 1/2)

Skill **autônoma e standalone** (roda numa sessão fresca, sem contexto prévio). Sua única
responsabilidade: **criar as issues do dia** — as que serão implementadas logo depois. Quem implementa
é o `/daily-build`, que roda ~1h depois — a separação existe para as issues estarem 100% gravadas e
visíveis no board antes do desenvolvimento começar.

## Parâmetro (do genoma — `docs/ai-first/project.md §8`)
- **`features_per_day`** — quantas issues criar nesta rodada (default **1**). É a **cadência variável**
  (P-15), definida na gênese e ajustável depois. Crie **exatamente** essa quantidade (ou menos, se não
  houver apostas novas boas sem duplicar — nunca force issue fraca só para bater o número).

## Modelo + esforço (custo-benefício)
Esta rotina não passa pelo roteador (`sdd-orchestrator`) — invoque o `product-owner` no tier que a
aposta do dia merece: **`opus`/`alto`** por padrão (a escolha do dia é de alta alavancagem — não
economize no julgamento). Ajuste para `sonnet` se o backlog for óbvio. (Tabela de referência no
`sdd-orchestrator`.)

## O que fazer
1. Invoque o subagente **`product-owner`** pedindo que **arbitre uma FILA ÚNICA de `features_per_day`
   vagas** (ADR-0007), misturando: (a) issues novas de **evolução de negócio/produto** que ele deriva
   (nunca trabalho técnico interno), e (b) as **propostas de growth abertas** (`label:growth-proposed`,
   criadas pelo `/daily-growth` que rodou antes). Ele **rankeia as duas lentes juntas** por valor/ROI e
   aplica **`po-suggested` só ao que ganha vaga** — produto **ou** growth. Sem duplicar o board (ele
   checa `search_issues` + `docs/sdd/tasks.md`). A escolha **não é aleatória**: ele faz **benchmarking de
   mercado** (`WebSearch`) **e** considera o **sinal de resultado real** do `/daily-outcome` (o que o
   uso mostrou que funciona/não funciona), mirando a **lacuna competitiva de maior valor** e
   registrando o racional no corpo de cada issue. As propostas de growth que **não** ganham vaga ficam
   abertas (`growth-proposed` sem `po-suggested`) e concorrem no próximo ciclo.
2. Como serão implementadas no mesmo dia, devem ser **implementáveis**: prefira `size:trivial` ou
   `size:media`. `size:grande` só se genuinamente certo — e aí recebe `needs-human-triage`.
3. Garanta os labels que o `/daily-build` usa: `po-suggested` (sempre) + exatamente uma `size:*` +
   label de área opcional.
4. **NÃO implemente, não crie branch, não abra PR.** Esta parte só cria as issues.
5. **Atualize o cache de benchmarking:** se o PO emitiu um digest de mercado novo/atualizado, **grave-o**
   em `docs/product/market-scan.md` (o PO é só-leitura de docs — quem escreve é a skill). É o cache
   compartilhado com o `/backlog` e o `/kickoff`: da próxima vez, ninguém re-varre a frio.

## Regras
- **`features_per_day` issues/dia** — alinhado à cadência de entrega (sem inchar o backlog). Se não
  houver apostas novas suficientes sem duplicar, crie menos e registre o motivo.
- Board é a fonte do backlog; você só abastece — priorização/aprovação é do humano.
- Idempotência: não recrie o que já existe aberto; o `product-owner` deduplica.

## Relatório final (vira push/e-mail)
- **Sucesso:** uma linha por issue criada — número e título (e se ficou `needs-human-triage`).
- **Falha:** ver Resiliência abaixo.

## Resiliência — falha vira ALERTA de retry (push + e-mail)
Se **não conseguir criar a issue do dia** (erro da API do GitHub, benchmarking impossível, nenhuma
aposta nova sem duplicar, subagente falhou), **não encerre em silêncio**. Trate o erro e termine a
sessão com um alerta — que vira o push/e-mail do dono — neste formato:
```
⚠️ FALHA na rotina de criação de issue (backlog) — <o que aconteceu, 1 linha>.
Nenhuma issue foi criada hoje, então o desenvolvimento do dia pode ficar sem tarefa.
Para tentar de novo: responda "rodar o backlog de novo" (eu re-disparo /daily-backlog).
```
Sucesso parcial ou incerteza também avisa. O objetivo: **você nunca fica sem saber** que o dia
começou torto.
