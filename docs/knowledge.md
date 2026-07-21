# 🧠 Conhecimento (padrões + anti-padrões)

Como **construir** neste projeto: os **idiomas** que funcionam (padrões — "faça assim") e as
**armadilhas** que já custaram caro (anti-padrões — "não faça / cuidado"). É o acervo de *saber-fazer*
que reduz alucinação: uma sessão ou subagente carrega **esta** curadoria antes de implementar, em vez
de redescobrir o jeito certo (ou repetir um erro já pago).

> **Onde este doc se encaixa (não confunda os papéis):**
> - **`docs/sdd/constitution.md`** = o que **nunca** pode quebrar (invariantes P-#, inegociáveis). Um
>   anti-padrão **não** é uma violação de princípio — é um cheiro/erro recorrente que a constituição
>   não cobre. Se um "padrão" aqui é na verdade uma invariante, ele mora **lá**, não aqui.
> - **`CLAUDE.md`** = o índice-mãe (mapa de módulos, pontos de extensão) e a **referência rápida** dos
>   padrões (uma linha cada). Este doc é a **versão profunda** dos padrões **+ os anti-padrões**.
> - **`docs/context-map.md`** = por domínio, onde está cada artefato. Ele **aponta** para as linhas
>   deste doc relevantes ao domínio.

## Como usar (agentes e sessões)
1. Antes de implementar/revisar, carregue os padrões e anti-padrões do **hot path** que vai tocar
   (use o `context-map` para achar os relevantes ao domínio).
2. Siga o padrão; **evite** o anti-padrão. Se precisar divergir de um padrão, diga por quê no PR.
3. O `adversarial-reviewer` usa os **anti-padrões** como checklist de caça; o `tech-auditor` os usa
   para reconhecer drift.

## Padrões — "faça assim" (idiomas do projeto)

> **Esqueleto** — a gênese (`/ai-first-init`, dimensão 7) semeia os padrões reais do **seu** hot path;
> aqui ficam exemplos de formato. Uma linha por padrão; ancore em módulo/teste real.

| Padrão | Quando aplicar | Por que | Referência (módulo · teste) |
|---|---|---|---|
| _(ex.: reserva de idempotência antes do efeito)_ | todo efeito externo | retry é at-least-once (P-3) | `services/…` · `redelivery*` |
| _(ex.: LLM com timeout+schema+fallback)_ | toda chamada de IA | IA nunca confiada (P-4) | `ai/…` · `providerFallback` |
| _(ex.: acesso a dado só pela porta)_ | toda query | fronteira rígida (P-5) | `repositories/…` · `dataBoundary` |
| _(ex.: batch de banco em laço de fila)_ | processamento em lote | custo/latência | `…` · `…` |

## Anti-padrões — "não faça / cuidado" (armadilhas já pagas)

> Cada anti-padrão nasce de uma dor real: um bug que o `adversarial-reviewer`/`tester` pegou, um drift
> que o `tech-auditor` achou, ou um resultado que o `outcome-analyst` mostrou que não colou. **Todo bug
> vira teste de regressão E uma linha aqui** — o corpus de "o que não fazer" só cresce.

| Anti-padrão (o erro) | Sintoma / como aparece | Por que dói | O certo em vez disso |
|---|---|---|---|
| _(ex.: persistir efeito antes de confirmar o envio)_ | registro "enviado" com envio que falhou | estado mente; retry morre | reserva → efeito → confirma (P-3) |
| _(ex.: usar saída de LLM sem validar schema)_ | crash/《lixo》 quando o modelo alucina | IA confiada cegamente | validar + fallback determinístico (P-4) |
| _(ex.: `SELECT` + `UPDATE` onde cabe atômico)_ | corrida sob concorrência | dado incoerente | operação atômica / lock otimista |
| _(ex.: novo caminho que contorna o ponto de extensão)_ | lógica duplicada divergente | decadência/drift (P-14) | encaixar no ponto de extensão |
| **Ação habilitada sem a pré-condição satisfeita** | gerar link/relatório/efeito que aponta para um estado vazio/quebrado (ex.: emitir relatório de conta sem fonte de dados conectada) | o usuário chega num artefato inútil e culpa o produto; parece bug de dados | **barreira no servidor (fail-closed)** que recusa a ação sem a pré-condição **+** UI que desabilita **com o motivo** (causa + como resolver) — nunca só um dos dois |

## Qualidade visual premium (UI) — a régua do `ux-designer`/`frontend-engineer`

> **Origem (episódico → semântico):** um brief de "time de produto de elite" — benchmark explícito
> (Apple/Linear/Stripe/Vercel/Notion), justificativa por 5 lentes e entregáveis de design system
> concretos — produziu resultado **muito acima da média** numa sessão real de redesenho. O aprendizado
> virou régua durável nos dois agentes de UI (`agents/ux-designer.md`, `agents/frontend-engineer.md`).
> Ver `docs/evolution.md`. Vale para **todo trabalho significativo de interface**.

**Faça assim (padrões de UI):**

| Padrão | Quando | Por que | Onde vive |
|---|---|---|---|
| **Justifique cada decisão por 5 lentes** (usabilidade · hierarquia · acessibilidade · performance · conversão) | tela/fluxo novo ou redesenho | força o "porquê", não só o "bonito" | brief do `ux-designer` (`ux.md`) |
| **Design system primeiro: tokens, nunca valores mágicos** | qualquer CSS/estilo | ajuste cascateia; zero drift visual | camada de tokens/tema do projeto |
| **Escala tipográfica + grid + cor como sistema** | layout novo | hierarquia consistente entre telas | tokens + docs de UI |
| **Todos os estados, não só o caso feliz** (vazio→ativação, loading→skeleton, erro→acionável, sucesso, **cheio = MUITOS → paginação/busca**) | toda seção/coleção | a UI real vive nos estados de borda **e em escala** | render + best-effort por seção |
| **Todos os estados de interação** (hover · foco visível · ativo · **desabilitado-com-motivo quando a pré-condição falta**) | todo elemento interativo | acessibilidade + previsibilidade; ação que levaria a estado quebrado nasce bloqueada e explicada | componentes compartilhados |
| **Lista/tabela = paginação + filtro por padrão** (busca por campo natural c/ debounce + paginação com contagem; params `q`/`page`/`pageSize` no servidor; estado vazio de busca ≠ "sem itens") | toda coleção que cresce com o uso | acha o item + não trava/entulha em escala | data layer (server filtra/pagina) + componente de lista |
| **Movimento com propósito, 150–300ms, `prefers-reduced-motion`** | transições | comunica causa/efeito, não enfeita | tokens de duração/easing |
| **Navegação como sistema** (1 nav primária idêntica em todo o perfil + no máx. 1 secundária de contexto, `aria-current` sempre) | produto logado | usuário sempre sabe onde está e chega ao vizinho em 1 clique | componente único de nav |

**Não faça (anti-padrões de UI):**

| Anti-padrão | Sintoma | Por que dói | O certo |
|---|---|---|---|
| Valor mágico numa tela (`#hex`/`px`/`ms` solto) | tema inconsistente, ajuste espalhado | vira dívida; nada cascateia | token semântico na camada de tema |
| Entregar só repouso/caso cheio | sem foco visível, tela vazia morta, erro mudo | quebra a11y e ativação | cobrir hover/foco/ativo/desabilitado + vazio/loading/erro/sucesso |
| "Premium = mais efeito" | animação ornamental, ruído visual | sobriedade é que lê como premium | menos efeito, mais clareza/consistência |
| Design system paralelo por tela | componentes divergentes | drift visual, retrabalho | reusar/estender os padrões existentes |
| Animar layout / ignorar reduced-motion | jank, enjoo, > 300ms | performance e acessibilidade | transform/opacity, 150–300ms, reduced-motion |
| Menu espalhado (nav declarada por-tela; global só na home) | destino global inalcançável fora da home; "Sair" sozinho no header | portal parece desorganizado/confuso | nav primária padrão no componente de header, todas as telas |
| Página-hub concorrendo com nav persistente | dois menus com os mesmos destinos; seção irmã exige "voltar" | 2 cliques onde cabia 1; sem senso de lugar | nav secundária de contexto persistente; o hub morre |
| **Polir só a vitrine; deixar a tela logada como rascunho** | landing/marketing premium, mas o painel autenticado sem camada de tokens (cai em `#hardcoded`), sem dark mode, sem chrome | a régua vale onde o cliente CONVERTE, mas quebra onde ele USA todo dia | a MESMA régua (tokens → estados → a11y) em **toda** tela; a **camada de tokens é o 1º passo** de qualquer tela, não um detalhe da landing |
| **Coleção sem paginação/busca** ("cheio = a lista com itens") | lista que cresce sem limite; sem filtro para achar um item; render de N sem teto | trava/entulha com o uso real; o usuário não acha o que precisa | **projete "cheio = MUITOS"**: paginação + busca/filtro (e virtualização se preciso) **desde a 1ª versão** de toda coleção que cresce com o uso |

## Régua de excelência por ofício — a régua premium de TODO o roster

> **Origem (episódico → semântico):** a régua de "time de elite" que elevou os agentes de UI
> (benchmark nomeado + justificativa por 5 lentes + sobriedade premium) provou-se **domínio-agnóstica
> na forma** e foi estendida a **todo o roster** (`agents/*.md`). Ver `docs/evolution.md`
> (2026-07-18, 3ª rodada). O padrão abaixo é o que cada agente aplica ao **seu** ofício.

**Faça assim (padrões de excelência):**

| Padrão | Quando | Por que | Onde vive |
|---|---|---|---|
| **Benchmark de referência nomeado** (o time/produto de elite do ofício) | todo trabalho significativo | dá um teto concreto de qualidade, não "o suficiente" | seção "A régua" de cada `agent.md` |
| **Justifique a decisão por 5 lentes do domínio** (não só entregar o "pronto") | decisão não-óbvia | força o "porquê", expõe o trade-off cedo | o entregável do agente (spec/plan/brief/veredito) |
| **Premium = sóbrio** (mais rigor/clareza/rastreabilidade, não mais volume) | sempre | qualidade lê como sistema, não como excesso | todos os agentes |
| **Eleva o teto sem afrouxar o piso** (invariantes/gates/isolamento intactos) | sempre | ganho de qualidade não pode virar regressão de garantia | régua + constituição (P-*) |

**Não faça (anti-padrões de excelência):**

| Anti-padrão | Sintoma | Por que dói | O certo |
|---|---|---|---|
| Entregar "funciona" sem justificar | decisão sem "porquê"; trade-off escondido | ninguém consegue revisar/melhorar | as 5 lentes do ofício no entregável |
| Confundir premium com volume/efeito | mais texto/telas/etapas, não mais valor | ruído mascara o essencial | sobriedade: a menor peça que atinge o teto |
| Afrouxar invariante para "subir a régua" | gate pulado, isolamento quebrado | troca garantia durável por brilho pontual | régua eleva o teto; piso é inegociável |

## Como este acervo cresce (retroalimentação)
- **Gênese** (`/ai-first-init` dim. 7) — semeia os padrões/anti-padrões iniciais do projeto.
- **Fim de cada feature** (`docs-writer`) — idioma novo introduzido vira **padrão**; bug caçado pelo
  `adversarial-reviewer`/`tester` vira **regressão + anti-padrão** (com `arquivo:linha` de origem).
- **Auditoria** (`tech-auditor`) — drift recorrente vira anti-padrão (via `docs-writer`/humano).
- **Resultado** (`outcome-analyst`) — um padrão que o uso real desmentiu é rebaixado/anotado.
