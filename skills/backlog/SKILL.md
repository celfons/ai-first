---
name: backlog
description: Porta HUMANA sob demanda para o subagente `product-owner` escrever QUANTAS histórias/épicos o humano quiser de uma vez (não amarrado ao `features_per_day` da rotina diária). O humano passa a quantidade e, opcionalmente, um tema; a skill aciona o PO para propor e CRIAR exatamente esse número de issues no board — como histórias (fatias verticais) ou como épicos decompostos em histórias-filhas (sub-issues do GitHub) — com o mesmo rigor de benchmarking, dedup, labels e gate constitucional. Diferente de `/daily-backlog` (cron, `features_per_day`) e de `/feature-intake` (uma ideia já trazida pelo humano). NÃO implementa — só popula o board. Invoque como `/backlog [quantidade] [tema opcional]`.
---

# /backlog — o humano pede N histórias/épicos ao PO, sob demanda

O contraponto **on-demand e sem teto fixo** do `/daily-backlog`. A rotina diária cria
`features_per_day` issues sozinha (cron). Aqui **o humano decide a quantidade**: "escreve 10 histórias
de onboarding", "quebra pagamento em um épico com histórias", "me dá 5 apostas para o próximo sprint".
A skill roda no thread principal, aciona o subagente **`product-owner`** e cria exatamente o que o
humano pediu no board — com o mesmo padrão de issue que alimenta o resto do fluxo (`feature-spec` →
`/feature` → `/daily-build`).

> **Fonte de verdade do formato:** o padrão de issue, os labels, o dedup e o benchmarking são os do
> `agents/product-owner.md`. Esta skill só é o **driver** que passa a quantidade e o tema ao PO — se
> aquele padrão mudar, esta skill acompanha.

## Quando usar (e quando não)

- **Use** quando você quer, de uma vez, **mais de uma** aposta de produto (ou um épico inteiro
  mapeado), sem esperar a cadência diária e sem o limite `features_per_day`.
- **Diferente de `/daily-backlog`** — aquele é cron, cria `features_per_day` e roda sozinho. Aqui é
  humano, a quantidade é sua e não há teto do genoma.
- **Diferente de `/feature-intake`** — lá o humano **já tem a ideia** e a skill só formata **uma**
  issue. Aqui **o PO decide o quê** (benchmarking + roadmap + resultado real), como no diário, mas na
  quantidade que você pedir.
- **Não use** para trabalho técnico interno (refactor/infra/dívida — isso é do `tech-auditor`/
  `ops-investigator`) nem para implementar (isso é `/feature`/`/daily-build`). Aqui só popula o board.

## Entrada
`/backlog [quantidade] [tema opcional]` — ex.: `/backlog 10`, `/backlog 6 retenção`,
`/backlog épico de pagamentos`.
- **Sem quantidade:** pergunte "Quantas histórias/épicos quer que eu escreva?" (aceite um número).
- **Sem tema:** ok — o PO escolhe as lacunas de maior valor por benchmarking, como no diário.

## Fluxo

### 1 · Modo: histórias soltas ou épico(s) decompostos?
Use `AskUserQuestion` (a menos que o comando já deixe claro, ex.: a palavra "épico"):
- **Histórias soltas** — N fatias verticais independentes, cada uma tamanho de PR (default).
- **Épico(s) → histórias** — para cada épico, o PO cria a **issue-mãe** (`epic` + `needs-human-triage`)
  e a decompõe em **histórias-filhas** vinculadas por sub-issue. Pergunte quantos épicos e, se útil, o
  tema de cada. (A quantidade "N" passa a ser nº de épicos ou nº total de histórias — deixe claro qual.)

### 2 · Contexto/tema (só se o humano deu um)
Se veio um tema, passe-o ao PO como **foco** — ele ainda faz benchmarking e dedup dentro daquele
recorte. Sem tema, o PO mira as lacunas competitivas de maior valor do produto inteiro.

### 3 · Invoque o `product-owner` (tier opus/alto por padrão)
Chame o subagente `product-owner` pela ferramenta Agent, pedindo **exatamente a quantidade** que o
humano definiu (sobrepondo `features_per_day`), no modo escolhido (histórias ou épicos→filhas), com o
tema como foco quando houver. Reforce que ele deve:
- manter o **rigor de sempre**: benchmarking de mercado + sinal de resultado real, dedup contra o board
  (`search_issues`), ledger de rejeições e gate constitucional;
- aplicar os **labels funcionais** (`po-suggested`, exatamente uma `size:*`, `needs-human-triage` junto
  de `size:grande`; `epic` na issue-mãe do épico);
- vincular as histórias-filhas ao épico com `sub_issue_write`;
- **não forçar issue fraca** só para bater o número — se não há N apostas boas sem duplicar, criar
  menos e explicar.

Modelo/esforço: **`opus`/`alto`** por padrão (escolha de produto é de alta alavancagem). Baixe para
`sonnet` só se o recorte for óbvio/mecânico.

### 4 · Devolva o resultado ao humano
Repasse o resumo estruturado do PO: uma linha por issue (**número, título, tamanho, labels**) e, quando
houver épico, a **hierarquia** (épico → filhas). Se o PO criou menos que o pedido, diga quantas e por
quê (dedup, sem aposta nova boa, etc.). Aponte o próximo passo:
- filhas/histórias com `po-suggested` entram no `/daily-build` automaticamente;
- qualquer issue pode ser implementada sob demanda com `/feature <n>`.

## Regras
- **Quantidade é do humano**, não do genoma — mas **qualidade > quantidade**: nunca crie issue fraca só
  para completar o número.
- **Mesmo padrão do PO/diário** — as issues têm de ser consumíveis por `feature-spec`/`/feature`/
  `/daily-build` sem atrito (mesmo corpo, mesmos labels).
- **Só produto/negócio** — nada de trabalho técnico interno (é do `tech-auditor`/`ops-investigator`).
- **Épico nunca auto-implementa** — a issue-mãe leva `needs-human-triage`; quem entra no fluxo são as
  histórias-filhas.
- **Dedup e rejeições** — o PO avisa e evita recriar o que já existe ou re-propor um "não" sem ângulo
  novo. Não feche nem edite issues alheias.
- Não crie branch/PR nem implemente — isso é do `/feature`. Aqui só o PO popula o board.
