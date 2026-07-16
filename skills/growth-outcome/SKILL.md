---
name: growth-outcome
description: Rotina de RESULTADO de GROWTH (fecha o loop dos experimentos). Skill standalone para trigger agendado. Aciona o `growth-analyst` para medir por COORTE se os experimentos vivos moveram a métrica-alvo (§8) sem ferir as guardrail_metrics, e decidir ESCALAR (subir %) / ITERAR / MATAR. Roda junto o `finops-steward` (CAC/ROI + taxa de queima da janela de token, realimenta paralelismo/cadência). Grava o que pagou no `growth-playbook.md` e o aprendizado no `evolution.md`. NÃO implementa. Notifica o dono.
---

# /growth-outcome — o experimento moveu o funil? (loop de growth fechado)

Skill **autônoma e standalone**. É a irmã de `/daily-outcome`, mas para **experimentos de crescimento**:
enquanto o `/daily-growth` **propõe** e o `/daily-build` **implementa** (no canário), esta pergunta
**o experimento moveu o funil — e até onde escalar?** Sem ela, o canário nunca vira crescimento (ou um
experimento ruim fica ligado).

> Cadência sugerida: **algumas vezes por semana** (coortes levam dias para maturar; respeite a janela da
> §8). Defina no genoma (`docs/ai-first/project.md §8`). Espace do `/daily-outcome` para não somar a
> queima de token na mesma janela de 5h.

## Modelo + esforço (custo-benefício)
Invoque o `growth-analyst` em **`sonnet`/`alto`** (raciocínio sobre coorte/atribuição); suba para `opus`
se a atribuição causal for sutil. O `finops-steward` em `sonnet`/`alto`.

## Fase 1 · Medição por coorte
Invoque o subagente **`growth-analyst`** para, na janela recente, medir os experimentos **vivos** (no
canário/ramp) contra a **métrica-alvo da §8**, por coorte, respeitando a janela de maturação. Ele:
- checa as **`guardrail_metrics` antes de qualquer ramp** (guarda ferida → matar, mesmo com alvo movido);
- classifica cada um em ✅ **escalar até %** · 〜 inconclusivo · ❌ **matar**;
- é **honesto sobre acesso** (coorte não instrumentada = achado, não lift inventado).

## Fase 2 · Feedback ao board (sem implementar)
Para achados acionáveis, o `growth-analyst` abre issues:
- ✅ pronto para ramp → nota/issue "subir canário para Y%" com o dado (`po-suggested`+`size:*`). **A subida
  de % é uma mudança de config pelo fluxo normal — nunca aqui, e nunca direto a 100%.**
- ❌ matar → issue de kill/reversão (`/rollback`/flag off); `needs-human-triage` se for aposentar a direção.
- **Lacuna de instrumentação** → `needs-human-triage` (sem coorte, o loop fica cego).
Nada é implementado aqui.

## Fase 2¾ · Custo, ROI e queima de token (AIOps/FinOps)
Invoque o **`finops-steward`** (`sonnet`/`alto`) sobre a **mesma janela**: ele traz o **CAC/custo** que
fecha o ROI com o lift que o `growth-analyst` mediu, e mede a **taxa de queima** de token vs.
`growth_budget_per_cycle`/`daily_budget` e a janela de uso ~5h. Ele produz:
- **Ajuste de paralelismo/cadência/teto:** se o loop de growth está queimando a janela rápido demais,
  recomende baixar `parallelism` ou espaçar a cadência (**você grava** o ajuste em
  `docs/ai-first/routing-policy.md` — seção 1 vigente + histórico append-only abaixo do
  `<!-- FINOPS:APPEND-AQUI -->`; o subagente é só-leitura de docs). Piso de segurança P-14 nunca desce.
- **Experimento com CAC > `cac_ceiling` ou que estourou `external_action_cap`:** marcado para não
  escalar — sinal ao `growth-strategist` (issue como na Fase 2).
Se a telemetria de custo/CAC não é alcançável, ele **diz** (não inventa) — some ao ⚠️ da Fase 4.

## Fase 3 · Registrar o aprendizado (as duas memórias auto-evolutivas)
Pegue os textos que os subagentes emitiram e **grave** (o subagente é só-leitura de docs; quem escreve é
a skill):
- **`docs/product/growth-playbook.md`** — a **entrada do `growth-analyst`**: a tática vencedora/perdedora
  (alavanca × canal → efeito na North Star × CAC), datada. Atualize a **tabela vigente (seção 1)** e
  **acrescente** no **histórico append-only (seção 2)** abaixo do `<!-- GROWTH:APPEND-AQUI -->`. É a
  memória que o `growth-strategist` relê para dobrar no que pagou.
- **`docs/evolution.md`** — as **linhas de aprendizado** (✅ escalou / 〜 / ❌ matou / 🔧 cego / 💰 CAC),
  no topo da linha do tempo, formato do doc. Costura o resultado de growth ao aprendizado geral.
Uma entrada por experimento avaliado; não duplique.

## Fase 4 · Notificação ao dono (o que o funil disse)
Sua última mensagem vira o **e-mail/push**. Linguagem de negócio, foco em funil:
```
📈 Resultado dos experimentos de growth — <janela>

✅ Escalar (N):   • <experimento> moveu <alavanca/métrica> +<x%> na coorte → subir canário p/ <Y%>
❌ Matar (M):     • <experimento> — <alvo vs. real / guarda ferida> → desliguei/sugeri kill
〜 Cedo (K):      • <experimento> — reavaliar em <quando>
🔧 Cego (J):      • <coorte não instrumentada> — precisa medir
💰 Custo/CAC:     • CAC vs. cac_ceiling · queima de token vs. orçamento · paralelismo/cadência afinados

Nenhum % sobe sozinho; o ramp é o número no board. Nada mais é mexido sem os gates.
```
Se **nada** tem coorte medível ainda, diga isso (falta instrumentação — não invente lift).

## Resiliência — falha vira ALERTA de retry (push + e-mail)
```
⚠️ FALHA na análise de growth — <o que aconteceu>.
Ex.: "sem acesso à telemetria de coorte — não deu para medir se o experimento moveu o funil."
Para tentar de novo: responda "rodar a análise de growth de novo" (ou configure o acesso).
```
**Acesso/instrumentação faltando é ACHADO, não silêncio.**

## Invariantes da rotina
- **Só lê; nunca muta produção, nunca sobe % sozinho, nunca implementa.** Só mede, decide o ramp e cria issue.
- **Nunca inventa lift.** "Não medível" ≠ "funcionou". **Guarda ferida > alvo movido.**
- Respeita a janela de maturação (cedo ≠ falhou). Deduplica. Sem PII.
