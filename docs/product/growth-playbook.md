# Growth playbook — memória auto-evolutiva das táticas de crescimento

**Este documento se ALTERA durante as execuções.** É o substrato que fecha o loop de aprendizado de
growth (ADR-0004): o `growth-analyst`/`finops-steward` medem cada experimento e **gravam aqui** qual
**alavanca × canal** moveu a North Star e a que **CAC**; o `growth-strategist` **lê aqui** antes de
propor o próximo lote. É assim que a estratégia de escala **melhora sozinha com o uso real** — dobra no
que pagou, evita o que falhou — em vez de re-testar as mesmas apostas.

> **Molde:** é o par de growth do `docs/ai-first/routing-policy.md` (memória de roteamento) e do
> `docs/product/market-scan.md` (cache de benchmarking). Mesma mecânica: nasce vazio, tabela vigente que
> muta + histórico append-only que só cresce.

> **Embarca vazio, enche com o uso.** Todo projeto nasce com este arquivo em branco (só a estrutura).
> **Não** é preenchido na gênese — é **populado automaticamente** pelas rodadas do `/growth-outcome`
> (subagente `growth-analyst`). Sem experimentos medidos ainda = tabela vazia = o `growth-strategist`
> decide pela heurística de funil + mercado. Cada rodada o afina.

> **Quem escreve:** a skill `/growth-outcome` (thread principal), a partir do texto que o
> `growth-analyst`/`finops-steward` emitem — o subagente é só-leitura de docs (como no `evolution.md`).
> **Quem lê:** o `growth-strategist`, antes de propor (está nas "Fontes de verdade" dele).

> **Retenção (memória episódica — ver [`../ai-first/memory.md`](../ai-first/memory.md)):** a **tabela
> vigente** (§1) é o estado atual (não expira). O **histórico append-only** obedece `memory_retention`:
> o `knowledge-curator` destila táticas recorrentes que pagaram/falharam e **move** o histórico antigo
> para `archive/AAAA-MM.md` (nunca apaga).

---

## 1 · Táticas VIGENTES  ← o growth-strategist prioriza a partir daqui

O que já pagou (ou não), destilado. Uma linha por **alavanca × canal** com sinal medido. O
`growth-strategist` usa isto para estimar o ROI da próxima aposta — **dobra** nas ✅, **evita** as ❌,
**re-testa** as 〜 só com hipótese nova.

| Alavanca (funil) | Canal/tática | Efeito na North Star | CAC | Sinal | Desde | Rev. em |
|---|---|---|---|---|---|---|
| _(vazio até a 1ª rodada do growth-analyst)_ | | | | | | |

> Exemplo de linha que uma rodada pode gravar:
> `ativação | onboarding 1-clique | +12% D1 na coorte | — | ✅ escalou p/ 100% | 2026-07-25 | 2026-08-25`
> `aquisição | e-mail frio em massa | +2% signup, spam-rate +0.8% (guarda) | alto | ❌ matou | 2026-07-25 | —`

---

## 2 · Histórico (append-only) — como o playbook aprendeu

Nunca reescrito: cada rodada que muda algo **acrescenta** uma entrada no topo (mais recente primeiro).
É a trilha de por que cada tática subiu/morreu, com o dado de coorte/CAC que justificou.

<!-- GROWTH:APPEND-AQUI (o /growth-outcome insere a entrada nova logo abaixo desta linha) -->

_(sem entradas ainda — a primeira rodada do `growth-analyst` grava aqui)_

Formato de cada entrada:
```
### <data> · janela <de–até>
- **Experimento:** #NNN — <alavanca × canal × variante>
- **Medido:** <métrica-alvo: real vs. meta na coorte> · **Guardas:** <intactas | ferida: qual>
- **CAC/ROI:** <do finops-steward, se medido>
- **Decisão:** <✅ escalar p/ Y% | 〜 reavaliar em <quando> | ❌ matar/kill>
- **Aprendizado (o que o playbook dobra/evita):** <1–2 linhas>
- **Links:** <issue/PR/feature>
```

---

## Invariantes deste documento
- **Só o `growth-analyst`/`finops-steward` propõem entrada** (via a skill que escreve); nenhum outro
  agente edita.
- **A decisão vem de coorte medida, nunca de opinião.** "Não medível" não vira linha ✅ — vira achado de
  instrumentação (`🔧`).
- **Guarda ferida derruba a tática** por mais que o alvo tenha subido (ganho local ≠ escala).
- **Toda linha vigente é datada e tem revisão** — tática sem revisão apodrece; ao vencer, o
  `growth-analyst` reavalia (ainda paga? mantém e re-data; parou? relaxa/remove, registrando no histórico).
- **Histórico é append-only** — a seção 1 (vigente) muta; a seção 2 (trilha) só cresce.
