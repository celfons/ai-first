---
name: rollback
description: Resposta a INCIDENTE em produção — a contraparte pós-`main` do `/reject-feature`. Use quando algo que JÁ está em produção (`main`) está causando problema e precisa sair rápido, com segurança e auditoria. Reverte em `main` via revert commit (sem reescrever histórico), aciona o kill-switch/flag quando existe, e abre a issue de correção. Invoque como `/rollback <PR# ou feature# ou descrição> [motivo]`. A decisão de reverter é humana (ou disparada por um alerta de ops); a skill executa com segurança.
---

# /rollback — tirar da produção o que quebrou

O `/reject-feature` remove uma feature **antes** de `main`. Esta skill é para **depois**: algo já em
produção está causando dano e precisa sair **agora**, sem pânico e sem reescrever histórico.

## Entrada
`/rollback <PR#|feature#|descrição> [motivo]` — o motivo entra na auditoria e na issue de correção.

## Ordem de resposta (do mais rápido ao mais definitivo)
1. **Kill-switch primeiro, se existe.** Se a feature está atrás de uma **flag** (P-9) ou tem um
   kill-switch, **desligue-a** — é o rollback mais rápido e reversível, sem tocar no código. Registre
   que fez isso. Muitas vezes é o suficiente para estancar enquanto o resto acontece com calma.
2. **Reverta o código em `main` (via PR, revert commit).**
   - Ache o **merge commit** que trouxe a mudança para `main` (`git log --merges` / GitHub MCP).
   - `git fetch origin main` · branch `revert/<slug>` a partir de `origin/main` ·
     `git revert -m 1 <merge-sha>`. Conflito → delegue ao `backend-engineer`, valide com o `tester`.
   - Push, abra PR `revert/<slug> → main` com título `Rollback: <feature> (#NNN) — <motivo>` e
     **acelere o gate** (incidente em produção é exceção legítima à cadência diária — deixe explícito
     no PR que é rollback de incidente). Com CI verde, mergeie.
   - **Propague para `develop`:** reverta também em `develop` (ou faça `develop` acompanhar `main`)
     para o problema não voltar na próxima promoção.
3. **Se houver dado corrompido/efeito colateral já emitido**, NÃO tente "consertar na unha" em
   produção. Registre o estado, e trate a limpeza como uma feature de correção planejada (com
   idempotência), não como um hotfix cego.

## Depois de estancar
1. **Abra a issue de correção** (`bug`+`critical`+`needs-human-triage`) com: o sintoma observado, o
   `arquivo:linha` provável, o que foi revertido/desligado, e o impacto no cliente. É o que vira
   `/feature <n>` para a correção real (com teste de regressão que impede a volta).
2. **Registre no ledger de rejeições** se a causa foi a *ideia* (produto) — senão é `execução`
   (o retrabalho é técnico). Ver `docs/product/rejections.md`.
3. **Aprenda:** o bug que escapou deveria ter sido pego. Aponte na issue **por que a rede falhou**
   (faltou teste? o `adversarial-reviewer` não dirigiu o runtime? a métrica de saúde não alertou?) —
   para o processo melhorar, não só o código.

## Regras
- **Estancar > investigar.** Primeiro tira o dano do ar (flag/revert); a causa-raiz vem depois.
- **Sem reset/rebase/force-push** em `main`/`develop`. Só revert commit via PR.
- Revert de incidente pode furar a cadência diária — mas **nunca** o gate de CI verde nem a auditoria.
- Se um alerta do `/daily-ops-scan` disparou isto, referencie a issue de ops na resposta.
- A decisão de reverter é humana (ou de um alerta explícito) — a skill executa, não decide sozinha o
  que é incidente.
