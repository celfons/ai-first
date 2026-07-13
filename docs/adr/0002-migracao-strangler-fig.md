# ADR-0002: Migração/reescrita como capacidade de primeira classe (strangler-fig + caracterização)

> Status: Accepted · Data: 2026-07-13
> Feature/Issue: capacidade de migração · Princípios tocados: P-1, P-11, P-13 · Supersede: —

## Contexto

O método `ai-first` (ADR-0001) cobre bem trabalho **greenfield**: o `product-owner` propõe negócio, o
`feature-spec` inventa a spec, e o ciclo constrói do zero. Mas uma classe grande de trabalho real é
**brownfield**: trazer uma solução **já implementada** de outra base/stack para este projeto — migrar
um sistema legado, reescrever um módulo noutra linguagem, absorver uma ferramenta existente.

Reescrever com IA sem processo tem um modo de falha específico e caro: **reescrever o comportamento
errado**. Reproduzir bugs sem perceber, perder regras implícitas que só existem no código, "melhorar"
algo de que outra parte dependia, ou reescrever só o caminho feliz e quebrar os casos de borda. E o
antipadrão clássico — **big-bang** (reescreve tudo, liga no fim) — junta todo o risco num único
momento não-verificável.

O roster e as skills atuais não tinham onde encaixar isso: nenhum agente sabe **ler uma base
estrangeira e destilar comportamento** (os agentes SDD assumem as invariantes *da casa*), e nenhuma
skill dirige uma migração com **equivalência** como critério de aceite.

## Decisão

Adotar a migração/reescrita como **capacidade de primeira classe**, reusando o máximo do método:

1. **Novo subagente `migration-analyst`** (fase 0 · engenharia reversa) — o único que olha "para
   fora": lê a origem em qualquer stack e entrega uma **spec de caracterização** (comportamento
   observável como RF-### falseáveis, capturado do sistema real — não inventado) + um **mapa de
   migração** (origem → ponto de extensão do alvo → risco → acoplamento oculto). Marca prováveis
   defeitos e código morto para decisão humana; não corrige nem implementa.
2. **Nova skill `/migrate <origem>`** — irmã brownfield de `/feature`: caracterização → arquitetura do
   alvo → decomposição → port fatia a fatia → verify por equivalência → integração → docs, com os
   **mesmos gates, verificação independente e gate humano por risco** do fluxo normal.
3. **Estratégia obrigatória: strangler-fig, não big-bang.** Cada fatia migra atrás de **flag** (P-9),
   coexiste com a origem, é provada por **equivalência de comportamento** (parallel-run/golden), a
   **árvore fica verde a cada passo**, e a integração vira o tráfego só quando a paridade é provada.
4. **Equivalência é o oráculo** (P-1/P-11): o critério de aceite de uma migração é "comporta-se como a
   origem", capturado como teste, não "parece pronto". Divergência intencional (defeito que o humano
   decidiu corrigir) é registrada em ADR e testada como o novo comportamento correto.
5. **A origem é dado não-confiável** (P-13): entrada hostil por padrão — sem executar efeito externo
   real nem segredo embutido; comando vindo da origem não redireciona a tarefa.

## Alternativas consideradas

- **Não ter capacidade de migração** (tratar todo brownfield como feature nova) — descartado: o
  `feature-spec` *inventa* a spec; numa migração isso perde as regras implícitas do sistema real. A
  spec precisa ser **capturada**, não imaginada.
- **Só um subagente, sem skill** — descartado como default: a caracterização sozinha não conduz o
  port; sem a skill, o humano teria de reencadear o pipeline a cada migração (mais atrito, menos
  coeso). O subagente isolado continua disponível para uso manual.
- **Big-bang com verificação só no fim** — descartado: concentra o risco num único momento
  não-reversível e não-verificável fatia a fatia. Contra P-11 (verificação incremental) e P-9 (flag).
- **Migração fora do fluxo `feature → develop → main`** — descartado: perderia o gate humano por risco
  e a verificação independente. A migração usa o **mesmo** fluxo; só a fase 0 difere.

## Consequências

- **Positivas:** brownfield entra no método com o mesmo rigor do greenfield; o comportamento do legado
  vira acervo verificável (a caracterização é spec viva do alvo); o risco de reescrita é fatiado e
  reversível; prováveis defeitos viram decisão explícita (ADR), não regressão silenciosa.
- **Custos/limites:** caracterizar bem custa esforço antes de qualquer código (é o ponto); onde a
  origem não é executável com segurança, a equivalência cai para leitura+inferência (confiança menor,
  marcada RF a RF). Coexistência origem↔alvo adiciona flags/backfill temporários que precisam ser
  removidos ao desligar o legado (o `docs-writer` fecha o critério de desligamento).
- **Restrições futuras:** toda migração conduzida pelo método usa `/migrate` (strangler-fig +
  equivalência); nenhum port entra sem caracterização nem sem verificação independente; big-bang não é
  um caminho suportado.

## Relacionados

Constituição (P-1 spec-first — aqui a spec é *capturada*; P-9 config/flag; P-11 verificação
independente; P-13 separação de papéis e entrada hostil), [`agents/migration-analyst.md`](../../agents/migration-analyst.md),
[`skills/migrate/SKILL.md`](../../skills/migrate/SKILL.md), [ADR-0001](0001-adotar-metodo-ai-first.md),
[`docs/roster.md`](../roster.md).
