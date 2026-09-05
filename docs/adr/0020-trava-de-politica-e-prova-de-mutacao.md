# ADR-0020: Trava de política (só aperta) + prova de mutação das fitness functions

> Status: Accepted · Data: 2026-08-19
> Feature/Issue: governança do método (fecha o ponto cego do ADR-0006) · Princípios tocados: P-10, P-11, P-13, P-14, P-15 · Supersede: —

## Contexto

O ADR-0006 montou o enforcement em camadas: bootstrap de sessão, guard de ação, gate no servidor,
fitness functions, guia/uniformidade e retroalimentação. As camadas 1–3 protegem o **fluxo** (onde o
commit pode cair). A camada 4 protege a **arquitetura** (o que o código pode fazer). Duas coisas
ficaram de fora — e são exatamente as que o `autonomy_level: autônomo` torna críticas:

1. **Ninguém guarda a régua.** Os hooks barram push/commit direto em `main`/`develop`; a branch
   protection barra o merge sem CI verde. Nada barra **baixar a régua dentro do PR**: esvaziar uma
   fitness function, trocar `tdd_mode: estrito` por `off`, `verification_mode: panel` por `single`,
   `autonomy_level` para cima, editar o `ci.yml` que decide o verde. Com o agente escrevendo *e*
   mergeando, **afrouxar o gate é o caminho mais barato até o verde** — mais barato que consertar o
   código. Um gate que o próprio avaliado pode reescrever não é um gate.
2. **Nenhuma checagem prova que dispara.** As fitness functions (F1–F6) nunca foram vistas falhando.
   Um regex furado, um glob que não casa nada, uma guarda de aplicabilidade invertida (`if (!ctx.x)
   return skip(...)` quando devia ser o contrário) passam em **silêncio verde**. O método já exige do
   código de produto a **prova do vermelho** (ADR-0015: ver o teste falhar *pela razão certa* antes de
   implementar) — e não exigia nada disso do seu próprio gate. Checagem que nunca falhou é teatro.

O gatilho externo foi o benchmarking do `nicolasmelo1/software-factory`, que resolve as duas com
mecanismos nomeados (`L2.FACTORY_CONFIG_IS_LOCKED` + `L2.POLICY_ONLY_TIGHTENS`, e o
`sf verify`/`L5.NO_INERT_RULE` sobre fixtures de mutação). Adotamos os **mecanismos**; não o binário.

## Decisão

Adotamos **duas metades inseparáveis**, ambas executáveis e ambas no CI.

**1 · Trava de política — `docs/governance/policy.lock.json` + `scripts/policy-lock.mjs`.**
O lock sela o **digest sha256 de cada superfície de governança** (hooks, `ci.yml`, guard, os scripts de
gate, os grafos contratados) e o **valor dos knobs de rigor** do genoma §8. `--check` falha quando uma
superfície derivou sem reselo; `--seal` regenera o lock — e o reselo é **sempre uma linha de diff
revisável**, nunca silencioso.

Sobre os knobs vale a regra **só aperta**: cada knob de rigor tem escala ordinal
(`autonomy_level`, `tdd_mode`, `fast_path`, `verification_mode`, `uncertainty_escalation`,
`eval_gate`, `adversarial_panel_size`, `external_action_cap`). **Apertar** passa com reselo;
**afrouxar** é bloqueio, e só sela com `--seal --allow-loosening="motivo"`, que carimba data + motivo
em `loosenings[]` (append-only, auditável). Knob de **forma** (`bdd_style`, `orchestration_mode`,
`slice_fanout`) e de **vazão** (`features_per_day`, `parallelism`) ficam **fora** de propósito: travar
o que não é régua só geraria atrito. Apagar uma superfície selada ou remover uma fitness function do
registro conta como afrouxamento máximo.

**2 · Prova de mutação — `node scripts/ai-first-fitness.mjs --verify`.**
Toda fitness function declara `fixtures`: **o menor repositório que a viola**, em
`scripts/fitness-fixtures/<id>/`. O verify roda a regra contra cada mutação e **exige ≥1 violação**.
Regra que passa em silêncio contra a própria mutação é **inerte** e reprova. **Check sem fixture ⇒
verify falha** por "regra não provada". No CI, **`--verify` roda ANTES do `--check`**: primeiro se
prova que a régua mede, depois se mede. Quando o verify acusa, **conserta-se a regra, nunca a
fixture** — ajustar a mutação para caber na regra furada é o anti-padrão que o diretório existe para
impedir.

**O limite, dito com todas as letras.** A trava torna o afrouxamento **explícito, declarado e
revisável** — não fisicamente impossível: quem pode editar o script pode, em tese, reselar. O que o
torna impossível de **mergear** é o servidor: `templates/governance/CODEOWNERS` exige revisão humana
nomeada nesses caminhos e o job `policy-lock` do guard reprova o PR que afrouxa. **A trava é o sinal;
a branch protection é a força.** Mesmo em `autonomy_level: autônomo`, mudança de régua é a única
classe de mudança que **sempre** volta ao humano — a autonomia é sobre construir o produto, não sobre
reescrever o próprio critério de aprovação.

## Alternativas consideradas

- **Adotar o `software-factory` como dependência** (binário Rust + tree-sitter, 27 regras) — descartada.
  Traz toolchain nova e amarra o método a py/ts/go/rust, enquanto o `ai-first` é agnóstico de stack por
  construção (a stack vive no genoma). Adotamos a **forma** da regra (`why` + query + escopo + fixture);
  o binário permanece uma opção *plug-in* da camada 4 quando a stack do produto casar.
- **Confiar no `adversarial-reviewer`/`security-reviewer` para pegar o afrouxamento** — descartada. É
  probabilístico e, pior, **circular**: o afrouxamento pode desligar justamente o painel que o pegaria.
  Régua se defende com controle determinístico, fora da discricionariedade do modelo (ADR-0006).
- **Proibir por completo qualquer edição das superfícies de governança** — descartada. O método
  **precisa** evoluir (este ADR é prova). O que não pode é evoluir *para baixo* **em silêncio**.
- **Ratchet de violações herdadas com `review_by`** (congelar o legado com data de revisão) — boa ideia,
  **adiada**: o valor dela é na adoção *brownfield* (`/migrate`, ADR-0002) e ela merece o seu próprio
  ADR, com o ciclo de expiração desenhado. Não entra aqui para não misturar dois mecanismos num só.

## Consequências

- **Positivas:** o caminho barato para o verde (baixar a régua) deixa de existir em silêncio; a
  autonomia total ganha o freio que faltava. Toda fitness function passa a ser **provada**, e regra
  nova nasce com a sua mutação — a camada 4 deixa de poder apodrecer. O `/distill` ganha destino
  executável: anti-padrão recorrente pode virar **check + fixture**, não só prosa em `knowledge.md`.
- **Custos/limites:** todo PR que toca governança exige `--seal` (uma linha a mais no diff) e revisão
  humana via CODEOWNERS. O lock **não** protege contra quem já tem permissão de escrever no servidor —
  ele torna a mudança visível, não impossível. Os knobs de rigor só são comparáveis quando a gênese os
  **definiu**; em repo pré-gênese a metade "só aperta" fica dormente (a de digest, não).
- **Restrições futuras:** (a) **toda** fitness function nova nasce com fixture de mutação — sem isso o
  CI reprova; (b) mudança em superfície de governança **inclui o reselo no mesmo commit**; (c)
  afrouxamento de knob de rigor exige `--allow-loosening="motivo"` + aprovação humana, **em qualquer
  `autonomy_level`**; (d) ao criar um knob de rigor novo, registre-o em `KNOB_SCALES`/`KNOB_NUMERIC` —
  knob de régua fora da escala é knob sem trava.

## Relacionados

- ADR-0006 (arquitetura de enforcement — este ADR fecha o ponto cego da camada 4).
- ADR-0015 (duplo laço BDD/TDD — a *prova do vermelho*, aqui aplicada ao gate).
- ADR-0019 (vereditos estruturados — mesma doutrina: o motor executa, não descreve).
- ADR-0005 (higiene de memória — o `/distill` passa a promover anti-padrão a check executável).
- `docs/governance/enforcement.md` (as 6 camadas), `templates/governance/CODEOWNERS`.
- Benchmarking: `nicolasmelo1/software-factory` (`L2.FACTORY_CONFIG_IS_LOCKED`, `L2.POLICY_ONLY_TIGHTENS`,
  `L5.NO_INERT_RULE`, `sf verify`).
