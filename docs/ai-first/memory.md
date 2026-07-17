# 🧠 Arquitetura de memória do método `ai-first`

Este é o **mapa cognitivo da fábrica**: nomeia as **camadas de memória** que o pipeline `ai-first` já
possui — espalhadas em artefatos versionados — e define como cada uma **nasce, é lida, consolida e
esquece**. Antes desta feature a memória existia de fato, mas sem nome; sem nome, ninguém cuidava da
**higiene** (o episódico inchava) nem do **retrieval** (dependia da memória de um agente). Aqui as
camadas ficam explícitas e cada uma ganha uma política.

> **Escopo — é a memória da FÁBRICA, não do PRODUTO.** Este doc trata do que o *pipeline* `ai-first`
> lembra entre features/rodadas. A memória de agentes do **app** que a fábrica constrói (se o produto
> for um sistema de agentes) é outra coisa — decidida na gênese e descrita no genoma
> (`docs/ai-first/project.md`), não aqui.

> **A regra de ouro (não fere o isolamento):** compartilhar memória entre subagentes é compartilhar um
> **fato datado** (um padrão, um índice, um digest), **nunca** o histórico de raciocínio de quem
> escreveu com quem revisa. Toda camada abaixo respeita a premissa do
> [`token-efficiency.md`](../token-efficiency.md): isolamento de contexto + verificação independente
> permanecem intactos.

---

## As 4 camadas (nomeadas → mapeadas ao que já existe)

| Camada | O que guarda | Volatilidade | Onde mora (artefato real) |
|---|---|---|---|
| **Working** | o contexto ativo de **uma** fatia | volátil (TTL ~1h do prompt cache) | **BLOCO DE CONTEXTO FIXO** montado pelo driver + prompt cache ([`token-efficiency.md §1`](../token-efficiency.md)) |
| **Semantic** | fatos/saber-fazer estáveis do projeto | durável, curado | [`knowledge.md`](../knowledge.md) (padrões/anti-padrões), [`CLAUDE.md`](../../CLAUDE.md) (índice-mãe), [`context-map.md`](../context-map.md) (índice domínio→artefato), [`product/market-scan.md`](../product/market-scan.md) (digest de mercado) |
| **Episodic** | o que **aconteceu**, datado | append-only → **consolida e poda** | [`evolution.md`](../evolution.md), [`product/rejections.md`](../product/rejections.md), o **histórico** de [`routing-policy.md`](routing-policy.md) e [`product/growth-playbook.md`](../product/growth-playbook.md), git/PRs |
| **Procedural** | **como** se faz (procedimentos aprendidos) | durável, evolui por gate | [`skills/`](../../skills/) (procedimentos executáveis), [`agents/`](../../agents/) (papéis pré-compilados) |

> **Por que estes quatro.** É o tripé clássico da literatura de agentes (working · semantic · episodic)
> **mais** a camada **procedural** — o saber-fazer que vira rotina. O método já tinha as quatro; faltava
> nomeá-las para poder cuidar de cada uma (higiene do episódico, índice do semantic, evolução do procedural).

---

## Ciclo de vida da memória episódica — retenção, consolidação, esquecimento

O episódico é a camada que **incha**: `evolution.md`, `rejections.md` e os históricos de `routing-policy`/
`growth-playbook` só crescem. Sem esquecimento, contradizem a política de contexto enxuto. A disciplina:

1. **Retenção declarada (RF-COG-02).** Todo ledger episódico carrega no topo uma **política de retenção**
   (limite de entradas OU TTL em dias + destino de arquivamento), derivada do knob `memory_retention` do
   genoma. Entrada além da retenção é **candidata a consolidação/poda** — nunca servida como fresca.
2. **Consolidação episódico → semantic (RF-COG-03).** Numa cadência (`distill_cadence`), o
   [`knowledge-curator`](../../agents/knowledge-curator.md) lê o episódico, **destila N ocorrências do
   mesmo aprendizado num padrão/anti-padrão datado** em [`knowledge.md`](../knowledge.md) (a camada
   semantic), e **poda** o episódico consumido. Sinal fraco = **achado** ("candidato, precisa de mais
   uso"), nunca padrão inventado.
3. **Esquecimento é MOVER, não apagar.** Podar = mover a entrada para `.../archive/AAAA-MM.md` (datado,
   reversível via git); o padrão consolidado em `knowledge.md` **aponta de volta** à origem arquivada.
   Memória apagada sem rastro é bug (P-8).

```
episódico satura → /distill → knowledge-curator:
   destila padrão datado → knowledge.md (semantic)   [grava PRIMEIRO]
   move entradas consumidas → archive/AAAA-MM.md      [poda DEPOIS — idempotente]
   (sinal fraco? reporta "sem sinal para consolidar" — não fabrica)
```

Ordem `grava semantic → poda episodic` garante idempotência: falha no meio deixa o ledger intacto e
re-tentável (nunca knowledge.md e ledger incoerentes).

## Recuperação — índice determinístico por tag (não retrieval semântico)

A camada semantic é **recuperada por índice**, não por memória de um agente. O
[`context-map.md`](../context-map.md) é o índice: cada domínio carrega **tags** (palavras-chave/sinônimos)
e a linha exata de artefatos; o `sdd-orchestrator` seleciona a linha por **casamento de tag**. A
recuperação é **determinística de propósito** — curadoria > retrieval enquanto a base cabe num índice
(decisão herdada e reafirmada em [ADR-0005](../adr/0005-arquitetura-cognitiva.md); migrar para
vetorial/semântico é ADR futuro, só quando o volume estourar).

## Evolução da memória procedural — procedimento → skill

As `skills/` são procedimentos aprendidos. Quando o `knowledge-curator` detecta uma **sequência de passos
repetida com árvore verde** (RF-COG-11), ele **propõe** promovê-la a uma skill nova (ou atualizar a
existente) — sempre pelo **gate normal** (PR + `validate` verde), nunca escrita silenciosa. É como o
*saber-fazer* também melhora com o uso, fechando as 4 camadas: o episódico ensina o semantic **e** o procedural.

## Metacognição — verificação proporcional à confiança

Duas alavancas ligadas à memória fecham o quadro cognitivo (detalhe nos agentes/ADR-0005):

- **Painel adversarial (RF-COG-07/08).** Sob risco alto / `autonomy_level: autônomo` / knob
  `verification_mode: panel`, a verificação independente roda como **N céticos de lentes distintas**
  (correção · invariante/segurança · reprodução) em vez de um; maioria refuta ⇒ bloqueia. Soma ao veredito
  único (um `BLOQUEIA` já barra); cada membro no piso opus/alto (P-14). Ver
  [`adversarial-reviewer`](../../agents/adversarial-reviewer.md) e [`token-efficiency.md §4`](../token-efficiency.md).
- **Escalada por incerteza (RF-COG-09/10).** Subagentes que implementam/decidem emitem `confidence`
  calibrado; **baixa confiança escala ao humano** (`awaiting-human`) **independentemente do tier de risco**.
  A escalada é por **risco OU incerteza, o maior** — refina P-10, não o remove (corolário na constituição).

## Knobs (genoma `project.md §8`)

| Knob | O que governa | Default |
|---|---|---|
| `memory_retention` | limite de entradas / TTL dos ledgers episódicos + arquivamento | 90 dias / 50 entradas |
| `distill_cadence` | cadência do cron `/distill` (consolidação + poda) | semanal (cron espaçado) |
| `verification_mode` | `single` (um revisor) · `panel` (N céticos) | `single` |
| `adversarial_panel_size` | nº de céticos no modo painel (só vale em `panel`) | 3 |
| `uncertainty_escalation` | escala ao humano por baixa confiança (`on`/`off` + limiar) | `on` · limiar `confidence: baixa` |

## Quem alimenta cada camada (retroalimentação)

- **Working** — o **driver** (skill) monta o bloco fixo por fatia; some ao fim da fatia.
- **Semantic** — o `docs-writer` grava o idioma/anti-padrão ao fechar a feature; o `knowledge-curator`
  destila o episódico recorrente; o `product-owner`/PO caches semeiam `market-scan`.
- **Episodic** — `/daily-outcome` (`outcome-analyst`), `/growth-outcome` (`growth-analyst`),
  `/reject-feature`, `finops-steward` (`routing-policy`), `docs-writer`. O `knowledge-curator` **poda**.
- **Procedural** — o mantenedor (skills à mão) **e** o `knowledge-curator` (propõe promoção via gate).

> **Ligação de volta:** este doc é o índice cognitivo; as políticas operacionais moram nos artefatos que
> ele mapeia. Ao adicionar um artefato de memória novo, registre-o aqui (tarefa do `docs-writer`/
> `knowledge-curator`) — um artefato de memória fora deste mapa é um achado.
