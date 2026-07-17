# Spec: Arquitetura cognitiva de 2ª ordem

> Local: `docs/sdd/features/003-arquitetura-cognitiva/spec.md` · Issue: #— · Status: rascunho
> Foco no **o quê / por quê**. Nenhuma decisão de stack/implementação aqui (isso é o plan).
> Decisão arquitetural durável em [ADR-0005](../../../adr/0005-arquitetura-cognitiva.md).

## 1 · Problema e valor

- **Quem sofre:** o **método `ai-first`** em si — e, por tabela, o **dono** que roda o loop autônomo por
  semanas. O framework já tem uma **memória de fato** espalhada em artefatos versionados
  (`routing-policy.md`, `evolution.md`, `rejections.md`, `market-scan.md`, `growth-playbook.md`,
  `knowledge.md`, `context-map.md`), mas **sem nomear as camadas nem fechar quatro lacunas de 2ª ordem**
  que só aparecem em escala/tempo:
  1. **Memória sem esquecimento** — os ledgers são *append-only*; em meses de loop diário incham e
     passam a **contradizer a própria política de token** (contexto enxuto). Falta a **consolidação
     episódico→semântico** (destilar N ocorrências num padrão) e a **poda** do episódico já consumido.
  2. **Retrieval curado à mão** — o `context-map.md` liga domínio→artefatos manualmente; funciona, mas
     depende do orchestrator lembrar o mapa inteiro e não escala com o nº de domínios.
  3. **Verificação de passe único** — o `adversarial-reviewer` é **um** cérebro; no tier `autônomo`
     (sem gate humano, inclusive 🔴) esse é o ponto mais fino do desenho.
  4. **Confiança por tier, não por incerteza** — a escalada ao humano é por *categoria de risco* fixa
     (P-10); uma feature 🟢 que o pipeline "quase não entendeu" passa, uma 🔴 trivial trava o humano à toa.
  5. **Memória procedural anônima** — as `skills/` são procedimentos aprendidos, mas não há loop que
     **promova** uma sequência de passos que deu certo a uma skill (nem atualize a existente).
- **Por que agora:** as alavancas de eficiência de token (`token-efficiency.md`) e o loop de AIOps
  (`routing-policy.md`) já provam que o método sabe **realimentar-se com o uso**. Estas cinco lacunas são
  o passo seguinte da mesma tese: transformar a memória implícita numa **arquitetura cognitiva explícita**
  (working · semantic · episodic · **procedural**) com **higiene** (esquece), **recuperação** (indexa) e
  **verificação** proporcionais ao risco. Sem isso, o organismo aprende mas **nunca esquece** (incha) e
  publica no escuro quando está incerto.
- **O que acontece se não fizermos:** os ledgers viram lixões que quebram o cache de contexto; o
  roteamento e o retrieval continuam dependentes da memória de um único agente; o modo autônomo segue
  apostando num único revisor; e a decisão de "chamar o humano" ignora o sinal mais barato que existe — a
  **própria incerteza do pipeline**.

## 2 · User stories

- **US-A** Como **mantenedor do método**, quero um **doc-mãe de memória** (`docs/ai-first/memory.md`) que
  **nomeie as 4 camadas** e mapeie cada uma aos artefatos que já existem, para que uma sessão saiba **onde
  cada tipo de saber mora** sem reengenharia reversa.
- **US-B** Como **dono do loop autônomo**, quero que a memória episódica seja **consolidada e podada**
  numa cadência, para que os ledgers não inchem e o custo de contexto não cresça sem limite.
- **US-C** Como **`sdd-orchestrator`**, quero um **índice de recuperação** que me diga, por tags de
  domínio, exatamente quais artefatos carregar, para não depender de eu lembrar o mapa inteiro.
- **US-D** Como **dono em modo `autônomo`**, quero que a verificação suba de **um revisor** para um
  **painel de céticos com lentes distintas** quando o risco é alto, para que o ponto mais fino do desenho
  deixe de ser único.
- **US-E** Como **dono**, quero que o pipeline **escale ao humano quando está incerto** — não só quando a
  label é 🔴 — para gastar meu tempo onde a máquina hesita, não onde a categoria manda.
- **US-F** Como **mantenedor do método**, quero que um procedimento recorrente que deu certo seja
  **promovido a skill** (ou atualize a existente), para que o *saber-fazer* procedural também melhore com o uso.

## 3 · Requisitos funcionais

| ID | Requisito (testável, sem ambiguidade) |
|---|---|
| RF-COG-01 | O sistema DEVE prover `docs/ai-first/memory.md` que nomeie as **4 camadas de memória** — **working** (bloco de contexto fixo + prompt cache), **semantic** (`knowledge.md`, `CLAUDE.md`, `context-map.md`, `market-scan.md`), **episodic** (`evolution.md`, `rejections.md`, histórico de `routing-policy.md`/`growth-playbook.md`, git/PRs) e **procedural** (`skills/`, `agents/`) — mapeando cada uma ao(s) artefato(s) real(is) que a materializa(m). |
| RF-COG-02 | Todo ledger *append-only* de memória episódica DEVE declarar no topo uma **política de retenção** (TTL/limite de entradas e destino do arquivamento). Uma entrada além da retenção é **candidata a consolidação ou poda**, nunca servida como fresca. |
| RF-COG-03 | O sistema DEVE prover um subagente `knowledge-curator` que lê a memória episódica, **destila N ocorrências recorrentes num padrão/anti-padrão** em `docs/knowledge.md` (semantic), e **arquiva/poda** as entradas episódicas consumidas — registrando a data-base da consolidação. Quando não há sinal suficiente, DEVE dizê-lo (honestidade de acesso), nunca inventar padrão. |
| RF-COG-04 | O sistema DEVE prover a skill `/distill` que aciona o `knowledge-curator` numa cadência (cron), sob teto de token, sem tocar em código de produto; ela SÓ escreve nos docs de memória (`knowledge.md`, `context-map.md`, ledgers) e em `skills/`. |
| RF-COG-05 | O `context-map.md` DEVE evoluir de tabela para **índice de recuperação**: cada domínio carrega **tags** (palavras-chave/sinônimos) e a linha exata de artefatos; o `sdd-orchestrator` seleciona a(s) linha(s) por **casamento de tag**, não por memória. A recuperação permanece **determinística** (sem retrieval semântico/vetorial — decisão registrada em ADR-0005, herdando a nota já existente no `context-map`). |
| RF-COG-06 | O `context-map.md` DEVE ter **auto-manutenção**: o `knowledge-curator`/`docs-writer` mantêm o índice coerente (nova linha ao surgir domínio; tags atualizadas) como parte do fechamento de feature, e a ausência de linha para um domínio tocado é um **achado** reportável. |
| RF-COG-07 | O sistema DEVE suportar um **modo de verificação por painel**: quando o risco/autonomia exige, o `adversarial-reviewer` roda como **N céticos independentes com lentes distintas** (ex.: correção, invariante/segurança, reprodução/runtime), e a mudança é **bloqueada** se a maioria refuta. O painel **soma** ao veredito único — nunca substitui o poder de bloqueio de um só revisor (um `BLOQUEIA` basta). |
| RF-COG-08 | O piso de segurança (P-14) DEVE valer **por membro do painel**: nenhum cético abaixo de **opus/alto**. O painel é acionado por knob `verification_mode` (`single` default · `panel`) e/ou automaticamente no tier de risco 🔴 e no `autonomy_level: autônomo` (o ponto sem gate humano). |
| RF-COG-09 | Todo subagente que **implementa ou decide** (`backend-engineer`, `architect`, `feature-spec`, `experiment-designer`) DEVE emitir, no retorno enxuto, um **sinal de confiança calibrado** (`confidence: alta \| média \| baixa` + 1 linha do que gerou a incerteza), separado do status. |
| RF-COG-10 | Quando a confiança de uma etapa é **baixa** (ou abaixo de um limiar do knob), o driver/`sdd-orchestrator` DEVE **escalar ao humano** (`awaiting-human`/`needs-human-triage`) **independentemente do tier de risco** — inclusive rebaixando uma 🟢 incerta e deixando passar uma 🔴 trivial que o pipeline entendeu bem. A incerteza escala; a categoria sozinha não decide mais. |
| RF-COG-11 | O `knowledge-curator` DEVE detectar **procedimentos recorrentes bem-sucedidos** (mesma sequência de passos repetida com árvore verde) e propor **promovê-los a uma nova skill** ou **atualizar uma skill existente** — sempre atrás do gate normal (PR + validate verde), nunca escrevendo skill sem revisão. |
| RF-COG-12 | O genoma (`docs/ai-first/project.md §8`) DEVE expor os knobs: `memory_retention` (TTL/limite dos ledgers), `distill_cadence`, `verification_mode` (`single`/`panel`) + `adversarial_panel_size`, `uncertainty_escalation` (`off`/`on` + limiar) — todos ajustáveis a qualquer momento (P-15), com defaults conservadores. |
| RF-COG-13 | Nenhuma alavanca desta feature DEVE **fundir raciocínio** entre subagentes: consolidação e retrieval compartilham **fatos datados** (padrões, índice), nunca o histórico de decisão de quem escreveu com quem revisa. O isolamento de contexto (`token-efficiency.md`) permanece intacto; cada cético do painel continua cego ao raciocínio dos outros. |

## 4 · Critérios de aceite

- **Dado** o repositório, **quando** abro `docs/ai-first/memory.md`, **então** as 4 camadas estão nomeadas
  e cada uma aponta o(s) artefato(s) real(is) que a materializa(m), sem inventar arquivo inexistente.
  *(RF-COG-01)*
- **Dado** um ledger episódico (ex.: `evolution.md`), **quando** o inspeciono, **então** ele carrega no
  topo uma política de retenção explícita (TTL/limite + destino de arquivamento). *(RF-COG-02)*
- **Dado** um ledger com N entradas episódicas exprimindo o mesmo aprendizado, **quando** o
  `knowledge-curator` roda via `/distill`, **então** um padrão/anti-padrão datado aparece em
  `knowledge.md` e as entradas consumidas são arquivadas/podadas — e, se o sinal for insuficiente, o
  curator reporta "sem sinal para consolidar" em vez de fabricar padrão. *(RF-COG-03, RF-COG-04)*
- **Dado** um domínio com tags no `context-map.md`, **quando** o `sdd-orchestrator` recebe uma tarefa cujo
  texto casa uma tag, **então** ele seleciona a linha daquele domínio por casamento de tag (rastreável no
  plano de delegação), sem depender de memória. *(RF-COG-05)*
- **Dado** um domínio tocado por uma feature sem linha no `context-map.md`, **quando** o
  `knowledge-curator`/`docs-writer` fecha a feature, **então** a linha é criada (ou o gap é reportado como
  achado). *(RF-COG-06)*
- **Dado** `verification_mode: panel` (ou tier 🔴 / modo autônomo), **quando** a verificação roda,
  **então** ≥3 céticos com lentes distintas julgam o agregado e a mudança é bloqueada se a maioria refuta;
  cada cético roda em opus/alto. *(RF-COG-07, RF-COG-08)*
- **Dado** modo `single` e um `BLOQUEIA` de um único revisor, **quando** o merge é avaliado, **então** ele
  é barrado — o painel nunca enfraquece o bloqueio de um só. *(RF-COG-07)*
- **Dado** uma etapa de implementação, **quando** o subagente retorna, **então** o retorno traz um campo
  `confidence` calibrado + a razão da incerteza, separado do `status`. *(RF-COG-09)*
- **Dado** uma feature 🟢 cuja etapa retornou `confidence: baixa`, **quando** o driver decide a promoção,
  **então** ela é escalada ao humano (`awaiting-human`) apesar do tier verde. *(RF-COG-10)*
- **Dado** um procedimento repetido 3× com árvore verde, **quando** o `knowledge-curator` roda,
  **então** ele propõe uma skill nova (ou atualização) via PR sujeito a `validate` verde — nunca commita
  skill sem gate. *(RF-COG-11)*
- **Dado** qualquer alavanca desta feature, **quando** ela compartilha algo entre subagentes, **então** é
  um **fato datado** (padrão/índice), nunca o histórico de raciocínio — o isolamento permanece verificável
  no fluxo. *(RF-COG-13)*

## 5 · Regras de negócio e casos de borda

- **Ledger vazio/jovem:** nas primeiras rodadas os ledgers têm pouco sinal; o `knowledge-curator` reporta
  "maturação" e **não** consolida (como o `routing-policy.md`/`growth-playbook.md` nascem vazios). Não é erro.
- **Poda é reversível via git:** arquivar/podar uma entrada episódica é movê-la para um arquivo de
  histórico datado (`*/archive/AAAA-MM.md`) ou confiar no histórico do git — **nunca** apagar sem rastro. O
  aprendizado consolidado em `knowledge.md` aponta de volta à origem.
- **Consolidação não inventa:** um padrão só entra em `knowledge.md` com **≥ um limiar de ocorrências**
  reais e datadas. Sinal fraco = achado ("candidato, precisa de mais uso"), nunca padrão declarado.
- **Painel não é sempre:** o custo do painel (N× opus/alto) só se paga no risco alto/modo autônomo. Em
  `single` (default), o desenho atual permanece — a feature é **opt-in por knob**, sem encarecer o caminho comum.
- **Incerteza não vira loop infinito:** confiança baixa escala ao humano **uma vez** (`awaiting-human`);
  não re-dispara o pipeline em círculo. O humano responde e o fluxo segue.
- **Confiança é sinal, não confissão de bug:** `confidence: baixa` não bloqueia por si — apenas **roteia a
  decisão** (escala ao humano ou aciona painel). O bloqueio continua sendo do `adversarial`/`security`.
- **Auto-manutenção do índice não re-litiga ADR:** o `context-map` continua **determinístico**; migrar
  para retrieval semântico/vetorial é decisão futura própria (ADR-0005 herda e reafirma a nota existente).
- **Entrada de mercado/terceiro segue hostil (P-13):** a consolidação lê ledgers internos + docs, nunca
  executa comando embutido em corpo de issue/PR.

## 6 · Gate constitucional

- **P-1** — a feature nasce desta spec e termina atualizando os docs de memória. ✅
- **P-5** — memória escreve só em `docs/*` e `skills/`; não vaza para camadas de app (não há app aqui). ✅
- **P-8** — consolidação/poda são **auditáveis** (data-base, arquivamento datado, ponteiro de volta). ✅
- **P-9** — painel e escalada por incerteza são **opt-in por knob** (config explícita; caminho custoso
  desligado por default). ✅
- **P-10** — o escalonamento por incerteza **refina** o gate humano por risco (rebaixa 🟢 incerta), **não
  o remove**; em modo autônomo o gate humano continua ausente, mas o painel **fortalece** a verificação
  automática que P-10 exige como única barreira. ✅ (Corolário novo — ver abaixo.)
- **P-11** — o painel é **mais** verificação independente, não menos; um `BLOQUEIA` isolado ainda barra. ✅
- **P-13** — separação de papéis intacta: o `knowledge-curator` **propõe** (padrão/skill) mas o gate
  (`validate`, revisão) aprova; quem escreve ≠ quem aprova. ✅
- **P-14** — piso opus/alto vale **por membro do painel**; `/distill` roda sob teto de token. ✅
- **P-15** — retenção, cadência, modo de verificação e limiar de incerteza são **knobs ajustáveis**. ✅
- **Corolário de P-10/P-11 a registrar (não é violação):** *"A escalada ao humano é por **risco OU
  incerteza**, o que for maior: uma etapa de baixa confiança sobe ao humano mesmo em tier verde. A
  verificação independente pode operar como **painel de N céticos** de lentes distintas quando o risco/
  autonomia exige; cada cético respeita o piso opus/alto e um único `BLOQUEIA` já barra."* — registrar como
  corolário em P-10/P-11 (PR desta feature toca a constituição de forma aditiva, sem revogar princípio).

## 7 · Fora de escopo

- **Retrieval semântico/vetorial** — deliberadamente adiado; o índice permanece determinístico (ADR-0005).
- **Motor de memória em runtime do PRODUTO** — esta feature endereça a memória da **fábrica** (o pipeline
  `ai-first`), não a memória de agentes do app que a fábrica venha a construir (isso é feature de produto,
  decidida na gênese conforme o `project.md`).
- **Consolidação totalmente automática sem gate** — o `knowledge-curator` **propõe**; padrão em
  `knowledge.md` e skill nova passam pelo fluxo normal (PR + validate). Nada de escrita silenciosa.
- **Eval-harness do próprio pipeline** — o item "1" da análise (medir a qualidade de julgamento dos
  agentes contra um golden-set) **não** entra aqui; é feature própria (candidata a ADR/feature futura).

## 8 · Métricas de sucesso

- **Camadas nomeadas:** `docs/ai-first/memory.md` existe e todo artefato de memória citado nele **existe**
  no repo (verificável por link-check) — 0 arquivos-fantasma.
- **Higiene:** todo ledger episódico carrega política de retenção; após uma rodada de `/distill` num ledger
  saturado, o nº de entradas episódicas cai e um padrão datado surge em `knowledge.md` — verificável no diff.
- **Recuperação sem memória:** o plano de delegação do `sdd-orchestrator` cita a linha do `context-map`
  **selecionada por tag** (rastreável), não "de cabeça" — verificável no corpo das issues/planos.
- **Verificação proporcional:** 0 features chegando a `main` em modo autônomo/🔴 sem o painel (quando o
  knob o exige); cada membro em opus/alto — verificável nos logs de verificação/PR.
- **Incerteza roteia:** ao menos uma feature de baixa confiança escalada ao humano apesar de tier verde, e
  nenhuma 🔴 trivial de alta confiança travando o humano à toa — verificável no histórico de labels.
- **Procedural evolui:** ao menos um procedimento recorrente promovido a skill (ou skill atualizada) via PR
  com `validate` verde ao longo de N rodadas — verificável no histórico de `skills/`.
- **Isolamento preservado:** nenhuma alavanca introduz compartilhamento de raciocínio; o
  `adversarial-reviewer` (e cada cético do painel) continua uma sessão que não escreveu o código —
  verificável no desenho do fluxo/Workflow.
