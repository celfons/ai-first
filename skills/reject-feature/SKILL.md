---
name: reject-feature
description: Use quando você (stakeholder) REPROVA uma feature que já foi auto-mergeada em `develop` e quer removê-la ANTES da promoção `develop → main`. Reverte o merge commit da feature em `develop` (sem reescrever histórico), devolve a issue ao board para retrabalho e atualiza o PR de promoção `develop → main` (a feature revertida sai do diff). Invoque como `/reject-feature <issue# ou PR#> [motivo]`. É a "porta de saída" do gate humano — a decisão de reprovar é sua; a skill só executa.
---

# /reject-feature — remover uma feature reprovada de develop

Contraparte do fluxo autônomo: o `/daily-build` **põe** features em `develop`; esta skill **tira** as
que você reprovou, antes de `main`. Você decide o que reprovar (revisando o PR `develop → main`); a
skill executa o revert de forma segura e auditável.

## Entrada
`/reject-feature <issue# ou PR#> [motivo]` — aceita mais de um identificador.

**O motivo é obrigatório para o aprendizado** (registro no ledger de rejeições). Se o dono não deu um
motivo, **pergunte** antes de finalizar: *"Por que reprovar? E é a **ideia** que não serve
(`produto`) ou o **jeito que foi feito** (`execução`)?"* — é o que impede o `product-owner` de
repropor a mesma coisa amanhã.

## Por que revert (e não reset/force-push)
`develop` é branch compartilhada e já promovida em PRs anteriores. **Nunca** reescreva o histórico
dela (sem `reset`/rebase/force-push). A remoção correta é um **revert commit**: inverte exatamente o
diff da feature, é auditável e não quebra quem já puxou `develop`.

## Fluxo
### 1 · Localize o merge da feature em develop
1. Ache o PR que mergeou a feature em `develop` (pelo `Closes #NNN` ou pelo número do PR) e pegue o
   **SHA do merge commit** (`git log --merges` em `develop`, ou via GitHub MCP).
2. Confirme que ainda **não** foi promovido para `main` (se já está em `main`, o revert precisa ir
   também num PR `develop → main` — avise o usuário; o normal é reprovar antes disso).

### 2 · Reverta num PR contra develop
1. `git fetch origin develop` · branch `git checkout -B revert/<slug> origin/develop`.
2. `git revert -m 1 <merge-sha>` (o `-m 1` mantém o 1º pai = `develop`). Um revert por feature.
3. **Conflito no revert?** → delegue ao subagente **`backend-engineer`** para resolver mantendo o
   resto intacto; depois valide com **`tester`** (`typecheck`/`lint`/`test` verdes). Não force um
   revert sujo.
4. Push e abra PR `revert/<slug> → develop` com título `Revert feature #NNN (reprovada)` e o motivo
   no corpo. Com a CI verde, **mergeie em `develop`**.

### 3 · Devolva a issue ao board (feedback loop)
1. **Reabra** a issue #NNN (`state=open`), aplique o label `rejected`/`needs-rework` e comente o
   **motivo** da reprovação.
2. Deixe claro no comentário: o retrabalho é uma **feature nova** (branch/PR novos), não um re-merge
   da branch antiga.

### 4 · Registre no ledger de rejeições (aprendizado do PO)
Adicione **uma linha no topo** da tabela de [`docs/product/rejections.md`](../../docs/product/rejections.md)
com: data, `#NNN`, o que foi entregue (1 linha), **Tipo** (`produto` = ideia não serve · `execução`
= jeito errado), **Motivo** (nas palavras do dono) e **Takeaway** (o que evitar/mudar). Isto vai no
**mesmo revert PR** (é uma mudança de doc). Sem motivo, volte ao passo de Entrada e pergunte — não
registre linha vazia.

### 4½ · Registre o aprendizado em `docs/evolution.md`
No **mesmo revert PR**, adicione **uma linha no topo** da linha do tempo de
[`docs/evolution.md`](../../docs/evolution.md): data, feature/`#NNN`, sinal **❌** (reprovada), o
**aprendizado** (nas palavras do dono, o que evitar) e o link para a rejeição no ledger. É a mesma
lição do ledger, mas na trajetória cronológica que o `product-owner`/`architect` leem.

### 5 · Atualize o PR de promoção develop → main
1. Depois do revert mergeado em `develop`, **atualize** o corpo do PR `develop → main`: mova a feature
   de "mergeada" para "reprovada/revertida (issue reaberta)". O diff da promoção já não contém mais a
   feature.
2. Não mergeie o PR de promoção — a decisão de promover o resto continua sendo sua.

## Regras
- A decisão de reprovar é **humana**; a skill nunca decide sozinha o que remover.
- Sem reset/rebase/force-push em `develop`/`main`. Só revert commit via PR.
- Um revert por feature (rastreável a `#NNN`), mesmo reprovando várias no mesmo dia.
- Se a feature já vazou para `main`, avise e proponha o revert também em `main` (PR próprio).
- Não toque em features não citadas; não reabra o que não foi reprovado.
