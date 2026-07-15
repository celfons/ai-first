# Política de roteamento — memória auto-evolutiva do AIOps

**Este documento se ALTERA durante as execuções.** Ele é o substrato que fecha o loop de AIOps
(`docs/token-efficiency.md` §5): o `finops-steward` mede o custo real do pipeline a cada rodada e
**grava aqui** o que aprendeu; o `sdd-orchestrator` **lê aqui** antes de rotear a próxima feature. É
assim que o roteamento **melhora sozinho com o uso real** em vez de ficar preso à heurística fixa.

> **Embarca vazio, enche com o uso.** Todo projeto que usa o método nasce com este arquivo em branco
> (só a estrutura). Ele **não** é preenchido na gênese/entrevista — é **populado automaticamente** pelas
> rodadas do `/daily-outcome` (subagente `finops-steward`). Sem execuções ainda = tabela vazia = o
> orchestrator usa a heurística-base do `sdd-orchestrator`. Cada rodada o afina.

> **Quem escreve:** a skill `/daily-outcome` (thread principal), a partir do texto que o
> `finops-steward` emite — mesmo padrão de `docs/evolution.md` (o subagente é só-leitura de docs).
> **Quem lê:** o `sdd-orchestrator` (está no "Contexto obrigatório" dele).

---

## 1 · Overrides de roteamento VIGENTES  ← o orchestrator aplica esta tabela

A política atual, destilada. Uma linha por **classe de tarefa** cujo piso foi ajustado pelo custo real.
O `sdd-orchestrator` aplica o piso daqui **por cima** da sua heurística-base (o override só **sobe**
piso; o piso de segurança P-14 é intocável). Quando uma classe volta a se comportar, o `finops-steward`
**remove/relaxa** a linha (registrando no histórico abaixo).

| Classe de tarefa | Piso vigente (model/effort) | Motivo (métrica) | Desde | Rev. em |
|---|---|---|---|---|
| _(vazio até a 1ª rodada do finops-steward)_ | | | | |

> Exemplo de linha que uma rodada pode gravar:
> `implement c/ efeito de pagamento | sonnet/alto | haiku forçou 2 re-runs/7d | 2026-07-20 | 2026-08-20`

---

## 2 · Histórico (append-only) — a trilha de como a política evoluiu

Nunca reescrito: cada rodada que muda algo **acrescenta** uma entrada no topo (mais recente primeiro).
É a auditoria do aprendizado — por que cada piso subiu/relaxou, com o dado que justificou.

<!-- FINOPS:APPEND-AQUI (o /daily-outcome insere a entrada nova logo abaixo desta linha) -->

_(sem entradas ainda — a primeira rodada do `finops-steward` grava aqui)_

Formato de cada entrada:
```
### <data> · janela <de–até>
- **Observado:** <classe X: N re-runs / cache-hit Y% / custo por feature mergeada Z>
- **Ajuste:** <subiu piso de X para sonnet/alto | relaxou X de volta à base | nenhum>
- **Efeito esperado:** <1 linha>
- **Links:** <issues/PRs/features>
```

---

## Invariantes deste documento
- **Só o `finops-steward` propõe mudança** (via a skill que escreve); nenhum outro agente edita.
- **Override só SOBE piso.** O loop nunca abaixa modelo/esforço abaixo da heurística-base nem toca o
  piso de segurança/invariante (P-14). Barato que se provou caro sobe; nunca o contrário por custo.
- **Toda linha vigente é datada e tem revisão** — override sem data de revisão apodrece; ao vencer, o
  `finops-steward` reavalia (a classe melhorou? relaxa; continua cara? mantém e re-data).
- **Histórico é append-only** — a seção 1 (vigente) muta; a seção 2 (trilha) só cresce.
