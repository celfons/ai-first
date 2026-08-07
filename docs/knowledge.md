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
| **Superfícies paralelizáveis** (registry · um-arquivo-por-unidade · append-only) | feature nova onde muitos agentes escrevem em paralelo | footprints disjuntos não colidem no merge (ADR-0007) — cada feature no seu arquivo | pontos de extensão do `CLAUDE.md` · `scripts/plan-batch.mjs` |
| **Duplo laço: cenário de aceitação vermelho por fora, ciclo vermelho→verde→refatorar por dentro** | toda mudança de comportamento (ADR-0015) | o teste-depois espelha a implementação e passa por acidente; o teste-antes prova o contrato e denuncia o acoplamento | `acceptance.*` da feature · micro-testes da unidade |
| **Prova do vermelho no retorno do implementador** (qual teste falhou primeiro + a razão) | toda etapa de implement em `tdd_mode` ≠ `off` | torna a disciplina verificável em vez de declarada — é teste de mutação a custo ~zero | campo `tdd:` do retorno · auditoria do `tester` |
| **Bug reproduz em vermelho antes da correção** | **sempre** (todos os modos, inclusive `fast_path`) | regressão que nunca falhou não prova que pega o bug | corpus de regressão (P-11) |
| **Pareto antes de projetar** (causas contadas de fonte real · ordenadas por impacto × frequência · acumulado · corte explícito · cauda declarada) | feature que é um **problema** (lento/caro/quebra/suporte), não capacidade nova | sem ranking o plano ataca tudo: diff grande, risco alto, esforço na cauda. O ganho é limitado pela fração que não se toca (Amdahl) | §1 do `plan.md` · `agents/architect.md` · `engineering-principles.md` §12 |

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
| **Teste escrito depois que espelha a implementação** | mesmos ramos/nomes internos do código; mock devolvendo exatamente o que a função pede; suíte verde que nunca ficou vermelha | passa porque descreve o que o código faz, não o que a spec pede — e regride junto com ele (pior no fluxo autônomo: mesmo cérebro dos dois lados) | teste **antes** do código (ADR-0015), nomeado pelo comportamento, com a **prova do vermelho** declarada |
| **Verde falso** (asserção frouxa: `toBeTruthy`/`not.toThrow`; `skip` silencioso; mock do próprio código sob teste) | CI verde com bug vivo; sabotar a linha de produção não derruba nenhum teste | dá confiança sem cobertura — é o pior estado possível, porque desliga a desconfiança | asserção do valor/efeito concreto; sabotagem pontual como conferência (o `adversarial-reviewer` faz isso) |
| **Pular o passo de refatorar** ("está verde, segue") | duplicação e nomes provisórios acumulam atrás de testes verdes | a dívida nasce protegida por teste, então ninguém a vê até custar caro | refatorar **com a árvore verde** é parte do ciclo, não item de backlog |
| **Mock elaborado para contornar um teste difícil** | fixture gigante para exercitar uma regra simples | teste difícil é sintoma de acoplamento — o mock esconde o diagnóstico | corrija a fronteira (porta/injeção, P-5); o teste volta a ser simples |
| **Cadeia de PRs empilhados** (branch de feature com base em outra branch de feature) | PR aberto contra `claude/<outra-slug>` em vez de `develop`; rebase em cascata quando o de baixo muda | multiplica o gate caro (opus/alto pago N vezes), enche a fila de merge serializada e quebra a contagem de WIP/footprint — sem comprar revisão barata, que o isolamento por slice já dá (ADR-0016) | **um PR por feature contra `develop`**, slices como commits verdes; se precisar de checkpoint auditável, **sub-issues** sequenciadas pelo `wip_limit` |
| **Suíte completa dentro do laço interno** (rodar `test` inteiro a cada ciclo vermelho→verde) | um ciclo de TDD que leva minutos; o implementador começa a "agrupar" comportamentos para pagar menos vezes — e o teste volta a nascer depois do código | o custo do laço é o que faz a disciplina ser abandonada na prática; ninguém declara isso, só para de fazer | **escopo escalado ao diff** (ADR-0017): relacionado no laço → suíte do footprint ao fechar a slice → **completa no gate, sempre**; com os freios (migration/config/DI/fixture e invariante ⇒ completa) |
| **Método que só existe na prosa** (o agente/skill descreve um comportamento que o motor não executa) | a skill manual faz certo, o workflow autônomo colapsa a etapa; ninguém nota porque o doc "diz" que acontece | o caminho autônomo é o de maior volume e o de menor observação — a divergência aparece como qualidade instável, não como bug; **quando prosa e motor divergem, o motor é o que roda** | contrato **estruturado** (`schema`) entre o agente e o script; a etapa vira dado roteável e falha **explícita** quando o dado é inválido |
| **Pareto inventado** (percentual estimado de cabeça, sem fonte contável — "causa A ≈ 45%") | tabela de diagnóstico com números redondos e nenhuma coluna de fonte/janela; ninguém consegue reproduzir a contagem | é um palpite com aparência de medição: dirige o plano inteiro e **passa na revisão justamente por parecer medido**. Pior que não analisar, porque desliga a desconfiança | `sem dado` declarado + **fatia 1 instrumenta**; ou enumeração qualitativa (espinha de peixe/5 Whys) **nomeada como qualitativa**. Toda linha cita fonte e janela |
| **Plano que ataca a cauda** (esforço distribuído por todas as causas plausíveis de um problema) | diff largo, muitos módulos tocados, ganho medido bem abaixo do esperado | o teto do ganho é a fração que você não toca (Amdahl); e mexer fora do gargalo não move o sistema (restrição) | corte explícito no acumulado: ataca-se o topo, **declara-se** o que ficou de fora e por quê |
| **Corte por frequência que engole o risco** (causa rara descartada como cauda por ter 2%) | invariante/segurança/perda de dado fora do plano "porque quase não acontece" | frequência não é impacto — o evento raro e catastrófico é exatamente o que a constituição protege (P-6/P-7) | ordenar por **impacto × frequência**; item de invariante/segurança **nunca** é cortado como cauda |
| **Cap silencioso numa varredura** (auditor/investigador abre as 3 issues do teto e não diz o que ficou fora) | relatório que lê como "varri tudo e só tinha isto"; a próxima rodada recomeça do zero e reacha o mesmo | o teto é um **corte**, e corte não declarado vira cobertura fantasma — some o sinal de que a fila é maior que a vazão | **declare a cauda** no retorno: quantos grupos/tipos ficaram fora + uma linha cada |
| **Issue por sintoma em vez de por causa** (8 ocorrências da mesma abstração furada = 8 issues) | board inflado com irmãs; humano tria 8 vezes o mesmo problema; o cap de 3 é gasto em sintomas de uma causa só | multiplica triagem e esconde o tamanho real do problema — corrigir 1 das 8 "resolve" a issue e deixa o resto | **agrupe por causa** antes de ranquear; uma issue pela causa, listando as ocorrências |
| **Arquivo-deus compartilhado** (rota/tipos/DI/i18n/CHANGELOG central que TODA feature edita) | duas features paralelas batem no mesmo arquivo → conflito/rebase constante, contexto inflado | acopla features independentes e serializa o que devia correr junto — mata o paralelismo na raiz (ADR-0007) | **um slot por feature**: registry em vez de array central, um-arquivo-por-handler, migrations timestamped, barrels **gerados** por codegen, logs append-only |

## Qualidade visual premium (UI) — a régua do `ux-designer`/`frontend-engineer`

> **Origem (episódico → semântico):** um brief de "time de produto de elite" — benchmark explícito
> (Apple/Linear/Stripe/Vercel/Notion), justificativa por 5 lentes e entregáveis de design system
> concretos — produziu resultado **muito acima da média** numa sessão real de redesenho. O aprendizado
> virou régua durável nos dois agentes de UI (`agents/ux-designer.md`, `agents/frontend-engineer.md`).
> Ver `docs/evolution.md`. Vale para **todo trabalho significativo de interface**.
>
> **2ª rodada (2026-08-07):** a régua garantia *sóbrio* mas não *específico* — faltava defesa contra a
> tela **genérica**. As linhas de neutro/tipografia-de-dado/estrutura/copy e o anti-padrão da "cara de
> IA" entraram aqui; o catálogo completo da disciplina é [`design-principles.md`](design-principles.md)
> (análogo de `engineering-principles.md` para `ux-designer`/`frontend-engineer`).

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
| **Plano de sistema visual antes da tela** (4–6 cores **nomeadas** · papéis tipográficos display/corpo/utilitária · conceito de layout em 1–2 frases) | tela/fluxo novo ou redesenho | força a escolha a ser derivada do domínio e revisável **antes** de virar CSS | brief do `ux-designer` (`ux.md`) |
| **Neutro escolhido, com viés de matiz na direção do acento** | toda paleta | cinza puro lê como "não foi decidido"; o viés lê como sistema | camada de tokens |
| **Estado codificado na FORMA, não só no número** (pill · chip · faixa de severidade) | painel/tabela/lista com estado | o que exige atenção lê num relance e não depende de cor (a11y) | componentes compartilhados |
| **Tipografia de dado** (`tabular-nums` onde dígito alinha em coluna · medida ~65ch no texto corrido · `text-wrap: balance` em título) | tabela, KPI, preço, texto longo | coluna que não "dança" e leitura que não cansa — detalhe barato, lido como acabamento caro | tokens + componentes de dado |

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
| **A "cara de design gerado por IA"** (creme `#F4F1EA` + serifa + terracota · quase-preto com um verde-ácido solitário · gradiente roxo→azul no hero · Inter/Space Grotesk como face "segura" · emoji como marcador de seção · tudo centralizado · `rounded-lg` em tudo · card arredondado com trilho de acento) | a tela **poderia ser de qualquer produto**; nada nela vem do domínio | com 100% da UI autorada por IA, este é o modo de falha **default** — "premium = sóbrio" barra o excesso, **não** barra o genérico | derive a escolha do **domínio da persona** (vocabulário, materiais, instrumentos); onde nada foi especificado, não gaste a liberdade no cluster — ver `design-principles.md` §8. **A palavra do humano vence sempre**; e reusar o token/componente existente não é genérico, é a lei nº 1 |
| **Neutro herdado da lib** (`gray-500` puro direto do default) | paleta cinza morta que não conversa com o acento | lê como ausência de decisão, mesmo com tudo o mais certo | neutro com leve viés de matiz na direção do acento, definido no token |
| **Numeração/eyebrow decorativa** (`01 / 02 / 03` em conteúdo que não é sequência) | marcador de ordem onde a ordem não informa nada | ruído com aparência de rigor — o device afirma algo falso sobre o conteúdo | só numere sequência real (processo, linha do tempo); senão, o device sai |
| **Copy na língua do sistema** ("configuração de webhook", "sincronizar entidade", "algo deu errado") | rótulo que descreve a implementação; erro que não diz como sair dele | a persona não conhece a arquitetura; erro vago vira ticket | nomeie pelo que a pessoa reconhece; o controle diz o que acontece; erro = o que houve + como resolver |
| **Especificidade que se cancela** (`.section` brigando com `.cta` por padding/margin) | espaçamento que "some" sem ninguém ter mudado nada | o bug mora entre a fonte e o render; some do diff e reaparece na tela | estruture a cascata; espaço pelo layout (`gap`), não por margem por elemento |

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
