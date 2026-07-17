# 🕸️ Mapa de contexto (context map / context mesh leve)

Camada de contexto **leve e determinística**: para cada **domínio** do sistema, aponta os
artefatos que juntos formam o contexto daquele domínio — **código ⇄ docs ⇄ ADRs ⇄ features/
issues ⇄ testes**. Substitui as listas de "leia primeiro" espalhadas: uma sessão ou subagente
que vai mexer no domínio X carrega **exatamente** esta linha, em vez de reler a base ou adivinhar.

Este é o **índice de recuperação** da camada *semantic* da memória
([`ai-first/memory.md`](ai-first/memory.md)): cada domínio carrega **tags** (palavras-chave/sinônimos)
para o `sdd-orchestrator` selecionar a linha por **casamento de tag** — recuperação por índice, não por
memória de um agente.

> Isto é a versão **determinística** de um *context mesh* — sem serviço de recuperação
> semântica. Curadoria manual > retrieval quando a base cabe num índice. Se um dia o volume não
> couber, aí sim vale indexar `docs/` + `docs/adr/` + código e expor um tool de busca. A decisão de
> **manter determinístico** (e adiar o vetorial até o volume estourar) está registrada em
> [ADR-0005](adr/0005-arquitetura-cognitiva.md) — reabri-la exige ADR novo com evidência de volume.

## Como usar (agentes e sessões)

1. **Selecione o domínio por casamento de tag:** cruze as palavras da tarefa (título/corpo da issue)
   com a coluna **Tags** da tabela. O `sdd-orchestrator` faz isso ao montar o plano de delegação e
   **cita a linha selecionada** — recuperação rastreável, não "de cabeça". Tarefa que casa duas linhas
   carrega as duas; tarefa que **não casa nenhuma** é um **achado** (domínio sem linha → RF-COG-06).
2. Carregue os artefatos daquela(s) linha(s): o **módulo** real, os **docs**, os **ADRs** (o
   *porquê* das escolhas — respeite; não re-litigue) e as **features/testes** de referência.
3. Só então decida/implemente. Mantenha o mapa coerente ao adicionar domínio/módulo novo
   (auto-manutenção — ver abaixo).

## Domínios → contexto

> **Esqueleto** — troque as linhas pelos domínios do **seu** projeto. O formato importa mais
> que o conteúdo de exemplo. Uma linha por domínio; cada célula aponta artefatos reais.

| Domínio | Tags (casamento) | Código (`src/…`) | Docs | ADRs | Refs/issues | Testes-âncora |
|---|---|---|---|---|---|---|
| _(ex.: Ingress/API)_ | `api`, `rota`, `endpoint`, `webhook`, `http`, `auth` | `api/`, `webhook/` | architecture.md | 0002 | #NNN | `apiAuth`, `webhookVerify` |
| _(ex.: Dados/persistência)_ | `banco`, `db`, `query`, `sql`, `repositório`, `migration`, `schema` | `repositories/`, `domain/` | data.md | 0007 | #NNN | `dataBoundary` |
| _(ex.: Provedores externos)_ | `ia`, `llm`, `pagamento`, `gateway`, `porta`, `adapter`, `terceiro` | `ai/`, `payments/` | architecture.md | 0006 | #NNN | `providerAdapter` |
| _(ex.: UI/painel)_ | `ui`, `painel`, `dashboard`, `tela`, `front` | `dashboard/` | dashboard.md | — | #NNN | `*dashboard*` |
| _(ex.: Observabilidade)_ | `métrica`, `log`, `trace`, `alerta`, `dlq`, `observabilidade` | `core/metrics.ts` | observability.md | — | — | `metrics*` |
| Growth/experimentação | `growth`, `experimento`, `funil`, `aarrr`, `canário`, `ativação`, `retenção`, `cac` | _(flags/experimentos + adapters de canal)_ | `product/growth-playbook.md`, `sdd/features/002-ecossistema-growth-autonomo/spec.md` | 0004 | issues `growth:*` | _(canário, guardas, `external_action_cap`)_ |
| Memória/cognição (meta) | `memória`, `consolidação`, `poda`, `esquecimento`, `retrieval`, `índice`, `painel`, `confiança`, `incerteza`, `curator`, `distill` | _(este repo-método: `docs/`, `agents/`, `skills/`)_ | `ai-first/memory.md`, `token-efficiency.md`, `sdd/features/003-arquitetura-cognitiva/spec.md` | 0005 | — | `validate-plugin.mjs` |

> **Formato das tags:** minúsculas, sem acento opcional (o casamento é frouxo — sinônimos e a raiz da
> palavra bastam). Uma tag serve a **um** domínio de preferência; colisão frequente entre dois domínios é
> sinal de que a fronteira precisa de revisão (achado para o `knowledge-curator`).

## Invariantes transversais (valem em TODO domínio)

Estas não são de um domínio — são o pano de fundo de todos. Antes de qualquer mudança:
[`docs/sdd/constitution.md`](sdd/constitution.md) (P-1…P-N) + o índice de
[`docs/adr/`](adr/) (decisões vivas). `CLAUDE.md` é o índice-mãe de módulos e invariantes.
Aprendizado de produto (o que o dono recusou): [`docs/product/rejections.md`](product/rejections.md)
— o `product-owner` lê para não repropor rejeições do tipo `produto`.

**Saber-fazer transversal:** [`docs/knowledge.md`](knowledge.md) — padrões ("faça assim") e
**anti-padrões** ("cuidado") do projeto; carregue os relevantes ao domínio antes de implementar/revisar.
**Trajetória:** [`docs/evolution.md`](evolution.md) — linha do tempo de mudanças + aprendizados (o que
o uso real ensinou); leia antes de grandes apostas para não reabrir o que já se aprendeu.
**Táticas de escala (o que pagou):** [`docs/product/growth-playbook.md`](product/growth-playbook.md) —
memória auto-evolutiva de growth (alavanca × canal → North Star × CAC); o `growth-strategist` lê antes de
propor experimento.
**Arquitetura de memória:** [`docs/ai-first/memory.md`](ai-first/memory.md) — as 4 camadas (working/
semantic/episodic/procedural), a higiene (consolidação + poda) e a metacognição (painel + incerteza). Este
mapa **é** o índice de recuperação da camada semantic.

## Auto-manutenção do índice (RF-COG-06)

O índice não é escrito uma vez e esquecido — ele **se mantém coerente com o uso**:

- **Ao fechar uma feature** (`docs-writer`): se a feature tocou um domínio, confira que a linha existe e
  que as **tags cobrem** o vocabulário da issue; adicione linha/tags que faltam. Domínio novo = linha nova.
- **Na cadência `/distill`** (`knowledge-curator`): audita o índice — domínio tocado por features recentes
  **sem** linha, tags que nunca casaram (mortas) ou que casam dois domínios (ambíguas) viram **achado**
  (proposta de correção via PR, nunca reescrita silenciosa).
- **Gap é achado, não silêncio:** uma tarefa que não casa **nenhuma** linha não é "sem contexto" — é um
  buraco no índice a reportar (o `sdd-orchestrator` sinaliza; o `knowledge-curator` corrige na destilação).

> **Ligação de volta (ADR → código):** cada ADR referencia os módulos/`P-#` que restringe; este
> mapa é o caminho inverso (domínio → ADRs). Juntos formam o grafo navegável leve.
