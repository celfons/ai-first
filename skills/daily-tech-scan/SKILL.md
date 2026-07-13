---
name: daily-tech-scan
description: Rotina diária de SAÚDE DO CÓDIGO (independente da rotina de produto). Skill standalone, feita para trigger agendado. Aciona o subagente `tech-auditor` para varrer o repositório em busca de BUGS CRÍTICOS e DÉBITO TÉCNICO e criar issues no board — SEM implementar. As issues ficam FORA do fluxo autônomo (`needs-human-triage`, sem `po-suggested`): o humano dispara a correção com `/feature <n>` quando quiser. Notifica o dono com o que foi encontrado.
---

# /daily-tech-scan — auditoria diária de saúde do código

Skill **autônoma e standalone** (roda numa sessão fresca). Diferente da rotina de produto (que
entrega features de negócio), esta **só levanta problemas** — bugs críticos e débito técnico — e os
registra como issues. **Nada é corrigido automaticamente**; o humano decide o que virar trabalho e
**dispara `/feature <n>` manualmente**.

## Modelo + esforço (custo-benefício)
Invoque o `tech-auditor` em **`opus`/`alto`**: caçar bug sutil de correção/invariante e drift
arquitetural é exatamente onde modelo barato deixa passar. (Ref.: tabela no `sdd-orchestrator`.)

## Fase 1 · Varredura
Invoque o subagente **`tech-auditor`** para varrer o repositório e criar issues dos achados
**confirmados** (bugs críticos primeiro, depois débito de alto custo), deduplicando contra o board.
Ele aplica os labels `bug`/`tech-debt` (+ `critical`) **e sempre `needs-human-triage`**, e **nunca**
`po-suggested`/`size:*` — é isso que mantém esses itens **fora** do `/daily-build`.

## Fase 2 · Nada é implementado aqui
Esta rotina **não** cria branch, PR, nem chama o fluxo `/feature`. A correção é ato humano: você
revisa as issues e roda `/feature <n>` nas que quiser.

## Fase 3 · Notificação ao dono (o que achei hoje)
Sua última mensagem vira o **e-mail/push**. Seja curto e claro. Aqui pode nomear "bug" e "débito
técnico" (é o público certo para isso). Modelo:
```
🔎 Varredura de saúde do código — <data>

🐛 Bugs a olhar (N):
  • #NNN <título> — severidade <crítica/alta/média>

🧹 Débito técnico (M):
  • #NNN <título>

Nada é corrigido sozinho. Para consertar algum, responda com o número, ou deixe no board.
```
Se **nada** foi encontrado, diga só isso ("Nenhum achado crítico hoje ✅") — sem inventar item.

## Resiliência — falha vira ALERTA de retry (push + e-mail)
Se a **varredura não puder rodar** ou a **criação de issue falhar**, **não encerre em silêncio**:
```
⚠️ FALHA na varredura de saúde do código — <o que aconteceu, 1 linha>.
Nenhuma auditoria concluída hoje. Para tentar de novo: responda "rodar a varredura de novo".
```
**"Nenhum achado" NÃO é falha** — é sucesso com zero problemas. O alerta é só para quando a rotina
**não conseguiu executar/registrar**.

## Invariantes da rotina
- **Só cria issue; nunca corrige.** Sem branch/PR/merge.
- Achados ficam **fora do fluxo autônomo** (`needs-human-triage`, sem `po-suggested`).
- **Só achados confirmados** — falso positivo polui o board. Cap ~3/dia.
- Deduplica contra issues abertas.
- A correção é **disparada pelo humano** (`/feature <n>`).
