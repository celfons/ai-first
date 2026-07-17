# ADR-0005: Arquitetura cognitiva de 2ª ordem (memória nomeada + higiene + verificação por painel)

> Status: Proposed · Data: 2026-07-17
> Feature/Issue: capacidade de arquitetura cognitiva (`docs/sdd/features/003-arquitetura-cognitiva/`)
> Princípios tocados: P-8, P-9, P-10, P-11, P-13, P-14, P-15 · Supersede: —

## Contexto

O método `ai-first` já possui uma **memória de fato** — não nomeada — espalhada em artefatos versionados:
`docs/knowledge.md` (saber-fazer), `docs/context-map.md` (mapa domínio→artefato), `docs/evolution.md`
(linha do tempo), `docs/ai-first/routing-policy.md` (memória de roteamento), `docs/product/rejections.md`,
`docs/product/market-scan.md`, `docs/product/growth-playbook.md`, e o próprio bloco de contexto fixo +
prompt cache (`docs/token-efficiency.md`). Essa memória **funciona**, mas tem quatro fragilidades de 2ª
ordem que só emergem em escala/tempo:

1. **Sem esquecimento** — os ledgers são *append-only* e incham em meses de loop diário, contradizendo a
   política de contexto enxuto (token-efficiency §1).
2. **Recuperação dependente de memória do orchestrator** — o `context-map` é curado à mão, sem índice.
3. **Verificação de passe único** — um `adversarial-reviewer` é o ponto mais fino no tier `autônomo`.
4. **Gate humano por categoria, não por incerteza** — P-10 escala por tier de risco, ignorando o sinal
   mais barato: a própria hesitação do pipeline.

Além disso, as `skills/` são **memória procedural** (procedimentos aprendidos) que hoje não evolui com o uso.

## Decisão

Adotamos uma **arquitetura cognitiva explícita** para a fábrica (o pipeline `ai-first`), sem infraestrutura
nova — só docs/agents/skills versionados — com cinco decisões duráveis:

1. **Nomeamos 4 camadas de memória** em `docs/ai-first/memory.md`, mapeadas aos artefatos existentes:
   **working** (bloco de contexto fixo + prompt cache), **semantic** (`knowledge.md`, `CLAUDE.md`,
   `context-map.md`, `market-scan.md`), **episodic** (`evolution.md`, `rejections.md`, históricos de
   `routing-policy.md`/`growth-playbook.md`, git/PRs) e **procedural** (`skills/`, `agents/`).
2. **Toda memória episódica tem retenção + consolidação:** ledgers *append-only* declaram política de
   retenção; o novo agente `knowledge-curator` (via skill `/distill`) **destila** ocorrências recorrentes
   em padrões semânticos (`knowledge.md`) e **poda** (move para `archive/` datado) o episódico consumido.
3. **A recuperação permanece DETERMINÍSTICA:** o `context-map.md` vira **índice por tag** (curadoria +
   casamento de palavra-chave), **não** retrieval semântico/vetorial — reafirmando a nota já presente no
   `context-map`. Indexação vetorial fica adiada até a base não caber num índice (novo ADR quando ocorrer).
4. **A verificação independente pode operar como PAINEL:** sob risco alto / `autonomy_level: autônomo` /
   knob `verification_mode: panel`, o `adversarial-reviewer` roda como **N céticos com lentes distintas**;
   maioria refuta ⇒ bloqueia. O painel **soma** ao veredito único (um `BLOQUEIA` já barra) e cada membro
   respeita o piso opus/alto (P-14).
5. **A escalada ao humano passa a ser por risco OU incerteza:** subagentes que implementam/decidem emitem
   `confidence` calibrado; baixa confiança escala ao humano **independentemente do tier** (refina P-10, não
   o remove). Tudo **opt-in por knob** (P-15), defaults conservadores.

## Alternativas consideradas

- **Retrieval semântico/vetorial (embeddings + tool de busca)** — descartado **agora**: a base cabe num
  índice determinístico; curadoria > retrieval nesse regime, e o custo/opacidade não se paga. Herdamos a
  decisão de adiar já registrada no `context-map`. Reabre-se por ADR quando o volume estourar.
- **Consolidação automática sem gate** — descartado: feriria P-13 (quem escreve ≠ quem aprova). O
  `knowledge-curator` **propõe**; PR + `validate` aprovam.
- **Painel sempre ligado** — descartado: encarece o caminho comum (N× opus/alto) sem retorno no risco
  baixo. Fica opt-in, acionado só onde o gate humano some ou o risco é alto.
- **Manter escalada só por tier** — descartado: desperdiça o sinal de incerteza; trava humano em 🔴
  trivial e libera 🟢 mal-entendida.

## Consequências

- **Positivas:** memória **não incha** (higiene com esquecimento); recuperação **rastreável** por tag sem
  depender de memória de um agente; verificação **proporcional ao risco** (fortalece o modo autônomo, o
  ponto mais frágil); gate humano gasto **onde a máquina hesita**; o saber-fazer procedural (skills) passa
  a **melhorar com o uso**, fechando o quadro cognitivo (as 4 camadas evoluem).
- **Custos/limites:** o painel custa N× no risco alto (contido por knob); a consolidação exige disciplina
  de limiar para não poluir `knowledge.md`; a calibração da confiança pode gerar falsos-baixos (mitigado
  por limiar ajustável e por "confiança roteia, não bloqueia"). A poda nunca apaga (move para `archive/`).
- **Restrições futuras (o que trabalhos seguintes DEVEM respeitar):**
  - **Não fundir raciocínio** ao compartilhar memória — só **fatos datados** (padrões, índice). O
    isolamento de contexto e a independência do revisor/cada cético do painel são invioláveis.
  - **Piso opus/alto por membro do painel** (P-14) — nunca desce.
  - **Escalada é por risco OU incerteza, o maior** — nenhum gate automático (CI, adversarial, segurança,
    orçamento) é removido; em modo autônomo o painel é *fortalecimento*, não substituição.
  - **Recuperação continua determinística** até um ADR futuro decidir o contrário com evidência de volume.

## Relacionados

- Constituição: `P-8` (auditável), `P-9` (opt-in), `P-10` (gate por risco — corolário aditivo de incerteza),
  `P-11` (verificação independente — painel), `P-13` (separação de papéis), `P-14` (piso de modelo/custo),
  `P-15` (knobs).
- Docs: `docs/ai-first/memory.md` (novo), `docs/token-efficiency.md` (§4 painel, §7 consolidação),
  `docs/context-map.md` (índice por tag), `docs/knowledge.md` (destino da consolidação).
- ADRs: relaciona-se a `0001` (método) e `0003` (Workflow — o painel usa o padrão de fan-out).
- Feature: `docs/sdd/features/003-arquitetura-cognitiva/`.
