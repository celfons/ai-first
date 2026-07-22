# Plan: [NOME DA FEATURE]

> Local: `docs/sdd/features/NNN-slug/plan.md` · Deriva de `spec.md` (aprovada).
> Aqui entram as decisões técnicas — cada uma **rastreada ao RF** que serve.

## 1 · Abordagem

Resumo da solução em 3–5 frases e por que esta abordagem (alternativas descartadas em uma
linha cada).

> **Decisão arquitetural durável?** (novo módulo/porta, nova invariante, trade-off que
> restringe o futuro) → registre um **ADR** em `docs/adr/` (leia o índice ANTES de decidir,
> para não contradizer decisões vivas). Tweak/bugfix não vira ADR.

## 2 · Módulos tocados

| Módulo (`src/…`) | Mudança | RFs |
|---|---|---|
| | | |

Respeitar P-5 (fronteiras de camada) e os **pontos de extensão** do projeto (ver `CLAUDE.md`):
não invente um caminho novo onde já existe um ponto de extensão canônico (nova rota, nova
Action/handler, nova porta de provedor, novo repositório).

**Footprint de escrita (ADR-0007) — obrigatório.** Declare, no bloco máquina-legível abaixo, as
superfícies (dirs/arquivos, globs permitidos) que esta feature vai **modificar**. É o que
`scripts/plan-batch.mjs` parseia e o `/daily-build` usa para rodar em paralelo o que é **disjunto** e
serializar o que **sobrepõe**. Prefira superfícies **estreitas e disjuntas** (ver o padrão
"superfícies paralelizáveis" em `docs/knowledge.md`) — footprint largo demais serializa à toa; estreito
demais só cai para o merge serializado (rede de segurança), nunca corrompe `develop`.

```footprint
# Superfícies de ESCRITA desta feature. Um caminho por linha sob `writes:`. Globs: `dir/**`, `dir/*`.
writes:
  - <caminho ou glob>
  - <caminho ou glob>
backend-frontend: disjunto | dependente
```

## 3 · Dados

- **Migrations/esquema**: sempre com a chave de escopo do projeto (ex.: `tenant_id`); índice
  casando os `WHERE` reais; alteração de schema separada da criação de índice quando o banco pede.
- Estado quente/cache/índice novos? TTL/retenção/poda definidos?
- Dado pessoal novo? → aplicar P-7 (máscara em log, redação antes de persistir/externalizar).

## 4 · Idempotência e falha

- Novo efeito colateral → **chave de reserva** (`<escopo>:<ação>[:<ocorrência>]`) e comportamento
  sob redelivery/retry.
- Falha parcial: o que **libera a reserva**, o que **audita**, o que vai para dead-letter.
- Degradação sem cada dependência **opcional** envolvida (P-8/P-9).

## 5 · Config e rollout

- Flags/envs novos (default seguro; feature custosa/arriscada nasce **opt-in**, P-9).
- **Kill-switch:** todo efeito arriscado atrás de flag desligável, para o `/rollback` estancar sem
  tocar no código.
- Ordem de deploy (migration → código → flag), plano de reversão.

## 6 · Observabilidade e medição de resultado

- Métricas/logs novos (com correlação), o que alertar (P-8).
- **Instrumente a métrica de sucesso da spec (§8)** (P-12): sem o evento/número instrumentado, o
  `outcome-analyst` fica cego e não há como saber se a feature moveu o ponteiro. Diga qual evento/
  consulta expõe o resultado.

## 7 · Testes

- Unit/integration por módulo/efeito; **teste de invariante** se tocar P-3/P-5/P-6/P-7;
  **eval** (mínimo determinístico) se mudar comportamento de IA.

## 8 · Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| | | |
