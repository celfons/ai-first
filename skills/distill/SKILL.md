---
name: distill
description: Rotina de HIGIENE DA MEMÓRIA (consolida e esquece). Skill standalone para trigger agendado. Aciona o subagente `knowledge-curator` para destilar a memória episódica recorrente (`evolution.md`, `rejections.md`, históricos de `routing-policy.md`/`growth-playbook.md`) em padrões/anti-padrões datados em `docs/knowledge.md` (camada semantic) e PODAR o episódico consumido para `archive/AAAA-MM.md` — nunca apagando. Audita o índice de recuperação (`context-map.md`) e propõe promover procedimentos recorrentes a skills. Só escreve em docs/skills de memória, sob gate de PR + validate. Sinal fraco = achado, nunca padrão inventado. Notifica o dono. Ver `docs/ai-first/memory.md` e ADR-0005.
---

# /distill — a memória que consolida e esquece

Skill **autônoma e standalone**. Enquanto o `/daily-build` **produz** e o `/daily-outcome` **mede**,
esta cuida da **higiene cognitiva**: sem ela, a memória episódica (os ledgers *append-only*) incha até
contradizer a própria política de contexto enxuto, e o aprendizado recorrente nunca vira saber-fazer
durável. É o passo de **consolidação** (episódico → semantic) + **esquecimento** (poda reversível) das 4
camadas descritas em [`docs/ai-first/memory.md`](../../docs/ai-first/memory.md).

> Cadência sugerida: **semanal** (não diária — a memória precisa acumular sinal antes de consolidar).
> Defina no genoma (`docs/ai-first/project.md §8`, knob `distill_cadence`), **espaçada** dos crons pesados
> para não empilhar na mesma janela de uso do modelo. Roda sob teto de token (`daily_budget`).

## Modelo + esforço (custo-benefício)
Invoque o `knowledge-curator` em **`sonnet`/`médio`** (é reconhecimento de padrão sobre texto datado);
suba para `sonnet`/`alto` quando o julgamento "isto é um padrão real ou ruído?" for sutil. Não precisa de
opus — é curadoria, não verificação de segurança. (Ref.: tabela no `sdd-orchestrator`.)

## Pré-condição · maturação
Se os ledgers estão **jovens/vazios** (primeiras rodadas), não há o que consolidar — o curator reporta
`sem-sinal` e a skill encerra sem abrir PR. **Não é erro** (como `routing-policy.md`/`growth-playbook.md`
nascem vazios); é maturação. Não force padrão para "ter entrega".

## Fase 1 · Higiene (o curator escreve numa branch)
Crie a branch `claude/distill-<data>` a partir de `develop` e invoque o subagente **`knowledge-curator`**
para, sobre a memória episódica:
1. **Consolidar** ocorrências recorrentes (≥ limiar, default 3) em padrões/anti-padrões datados em
   `docs/knowledge.md`, deduplicando contra o existente.
2. **Podar** o episódico consumido/vencido — **movendo** para `docs/<origem>/archive/AAAA-MM.md` (nunca
   apagando; a entrada em `knowledge.md` aponta de volta). Ordem: grava semantic → poda episodic.
3. **Auditar o índice** `docs/context-map.md` (domínio sem linha, tags mortas/ambíguas → achado/correção).
4. **Propor procedimento → skill** (RF-COG-11): procedimento recorrente com árvore verde vira proposta de
   skill nova ou atualização — no mesmo PR, sujeito ao `validate`.

## Fase 2 · Gate (PR + validate verdes)
Abra o PR da branch contra `develop` (`Closes #NNN` se houver issue de higiene no board). O gate é
**`node scripts/validate-plugin.mjs` verde** + revisão — quem escreveu (o curator) **não** é quem aprova
(P-13). Padrão consolidado, poda e ajuste de índice vão **todos** no mesmo PR datado, auditável. Nada é
mergeado sem o gate; skill nova/atualizada nunca entra sem `validate` verde.

## Fase 3 · Notificação ao dono
Sua última mensagem vira o **e-mail/push**. Foco em higiene, não em produto:
```
🧠 Higiene de memória — <data>
• Consolidado: <N padrões → knowledge.md>
• Podado: <N entradas → archive/> (reversível via git)
• Índice: <linhas/tags ajustadas · achados de fronteira>
• Procedimento→skill: <proposta, se houve>
• Achados (candidatos abaixo do limiar / gaps): <lista curta ou "nenhum">
PR: <link> — aguardando gate (validate + revisão)
```

## Contrato de falha/retry (resiliência)
Se o curator falha, o PR não abre, ou o `validate` fica vermelho, **não termine em silêncio**: encerre com
alerta push/e-mail dizendo o que falhou e a frase para re-disparar (`/distill`). Ledger vazio = `sem-sinal`
(informa, não alerta como erro). Nunca mergeie no vermelho; nunca pode sem arquivar.
