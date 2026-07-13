---
name: daily-backlog
description: Rotina diária — PARTE 1 de 2 (criação da issue do dia). Skill standalone, feita para rodar como trigger agendado. Aciona o subagente `product-owner` para propor e CRIAR 1 issue NOVA de evolução de negócio/produto no board do GitHub, sem duplicar — a que será implementada no mesmo dia. NÃO implementa nada — só cria a issue. O cron de desenvolvimento (`/daily-build`) roda ~1h depois, dando tempo da issue estar pronta no board.
---

# /daily-backlog — cria a issue do dia (Parte 1/2)

Skill **autônoma e standalone** (roda numa sessão fresca, sem contexto prévio). Sua única
responsabilidade: **criar a 1 issue do dia** — a que será implementada logo depois. Quem implementa é
o `/daily-build`, que roda ~1h depois — a separação existe para a issue estar 100% gravada e visível
no board antes do desenvolvimento começar.

## O que fazer
1. Invoque o subagente **`product-owner`** pedindo **exatamente 1** issue nova de **evolução de
   negócio/produto** (nunca trabalho técnico interno), sem duplicar o board (ele já checa
   `search_issues` + `docs/sdd/tasks.md`). A escolha **não é aleatória**: ele faz um **benchmarking de
   mercado** (`WebSearch`) para este tipo de solução e mira a **lacuna competitiva de maior valor**,
   registrando o racional de mercado no corpo da issue.
2. Como essa issue será implementada no mesmo dia, ela deve ser **implementável**: prefira
   `size:trivial` ou `size:media`. Só proponha `size:grande` se for genuinamente a coisa certa — e aí
   ela recebe `needs-human-triage` (o build pula, e o dia fica sem entrega).
3. Garanta os labels que o `/daily-build` usa para achá-la: `po-suggested` (sempre) + exatamente uma
   `size:*` + label de área opcional.
4. **NÃO implemente, não crie branch, não abra PR.** Esta parte só cria a issue.

## Regras
- **1 issue/dia** — alinhada à entrega de 1 feature/dia (sem inchar o backlog). Se não houver boa
  aposta nova sem duplicar, registre o motivo e não force uma issue fraca.
- Board é a fonte do backlog; você só abastece — priorização/aprovação é do humano.
- Idempotência: não recrie o que já existe aberto; o `product-owner` deduplica.

## Relatório final (vira push/e-mail)
- **Sucesso:** uma linha curta — número e título da issue criada (e se ficou `needs-human-triage`).
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
