# 🛡️ Enforcement — como GARANTIR e FORÇAR o método (não só orientar)

Como fazer com que **toda sessão** que trabalha num repo do `ai-first` siga à risca os fundamentos, os
princípios, os passos da pipeline e o modelo de trabalho — **e** realimente o conhecimento de forma
saudável, sustentável, auditável, uniforme e coesa.

> **A distinção que sustenta tudo:** documento **orienta**, não **força**. `CLAUDE.md`, os agentes e os
> catálogos de princípios são *probabilísticos* — o modelo os lê e tende a seguir, mas nada impede um
> desvio. Para **garantir**, é preciso um controle **determinístico**, fora da discricionariedade do
> modelo. A arquitetura é em camadas: as de baixo **orientam e uniformizam**; as de cima **tornam a
> violação impossível de acontecer/mergear**.

---

## As 6 camadas

| # | Camada | O que faz | Natureza | Onde vive |
|---|---|---|---|---|
| 1 | **Bootstrap de sessão** | injeta o bloco fixo + a pipeline no turno 0 de toda sessão | **força** | `hooks/session-start.sh` |
| 2 | **Guarda de ação** | barra push/commit direto em main/develop antes de acontecer | **força** | `hooks/pre-tool-guard.sh` |
| 3 | **Gate no servidor** | recusa o merge sem CI verde + disciplina de fluxo | **força** | `ai-first-guard.yml` + branch protection |
| 4 | **Fitness functions** | build quebra quando a arquitetura/invariante desvia — e cada regra **prova que dispara** | **força** | `scripts/ai-first-fitness.mjs` (+ `--verify` sobre `scripts/fitness-fixtures/`) + `scripts/check-workflows.mjs` (comportamento dos grafos, ADR-0019) |
| 4b | **Trava de política** | a régua não pode ser baixada em silêncio: superfícies seladas por digest + knobs de rigor que **só apertam** | **força** | `scripts/policy-lock.mjs` + `docs/governance/policy.lock.json` + `templates/governance/CODEOWNERS` (ADR-0020) |
| 5 | **Guia e uniformidade** | orientam o raciocínio, dão forma idêntica em todo repo | **guia** | `CLAUDE.md`, `agents/`, `*-principles.md`, templates |
| 6 | **Retroalimentação** | consolida e **poda** a memória; o método melhora com o uso | **loop** | `/distill`, `/daily-outcome`, ADRs, `evolution.md` |

As camadas 1–4b são o **"forçar"**; a 5 é o **"orientar/uniformizar"**; a 6 é o **"crescer saudável"**.
Nenhuma sozinha basta — juntas, aderência vira garantia.

> **A pergunta que a camada 4b responde (ADR-0020):** *quem guarda a régua?* As camadas 1–3 dizem onde o
> commit pode cair; a 4 diz o que o código pode fazer. Nenhuma impedia o movimento mais barato de um
> agente que escreve **e** mergeia: **baixar a própria régua** — esvaziar uma fitness function, trocar
> `tdd_mode: estrito` por `off`, editar o `ci.yml` que decide o verde. Gate que o avaliado reescreve não é
> gate. E a camada 4 tinha o seu próprio ponto cego: **nenhuma checagem provava que dispara** — regex
> furado, glob que não casa nada, guarda invertida passam em *silêncio verde*.

---

## 1 · Bootstrap determinístico da sessão (`SessionStart`)
Toda sessão que abre um repo do método roda `hooks/session-start.sh`, que injeta como **contexto** o
bloco fixo (CLAUDE.md + constituição + linha do context-map), os catálogos de princípios, a pipeline
SDD e o fluxo de git. Assim **nenhuma sessão começa cega** — o fundamento entra por construção. No-op
em repositório que não é do método.

## 2 · Guarda de ação (`PreToolUse` em Bash)
`hooks/pre-tool-guard.sh` intercepta comandos `git` **antes** de executarem e **bloqueia (exit 2)**:
push cujo destino é main/develop, qualquer commit/push/merge com HEAD em main/develop, e force-push a
branch compartilhada. A promoção `develop → main` é sempre por **PR/merge**, nunca push local — então o
guard não atrapalha o fluxo legítimo, só o proíbe de ser furado.

### Instalação dos hooks (dois caminhos)
- **Nativo do plugin:** `hooks/hooks.json` registra ambos via `${CLAUDE_PLUGIN_ROOT}` — ativos ao
  instalar o plugin.
- **Fallback version-independente (garantido):** o `/ai-first-init` copia os scripts para
  `.ai-first/hooks/` do repo-alvo e os registra no `.claude/settings.json` do projeto apontando para
  `$CLAUDE_PROJECT_DIR/.ai-first/hooks/…`. Use este caminho quando quiser o enforcement versionado
  junto do produto e auditável no PR.

```jsonc
// .claude/settings.json (do repo-alvo) — o que o /ai-first-init grava
{
  "hooks": {
    "SessionStart": [{ "hooks": [
      { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.ai-first/hooks/session-start.sh\"" }
    ]}],
    "PreToolUse": [{ "matcher": "Bash", "hooks": [
      { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.ai-first/hooks/pre-tool-guard.sh\"" }
    ]}]
  }
}
```

## 3 · Gate no servidor (o "forçar" que ninguém fura)
Hooks protegem a **sessão**; a branch protection protege o **repositório** — inclusive contra um humano
apressado ou uma sessão sem os hooks. Ligue no GitHub (Settings → Branches):

- **`develop` e `main` protegidas:** exigir PR, exigir **required status checks**:
  `ci` (typecheck/lint/test), `ai-first · guard / git-flow`, `ai-first · guard / fitness`, e os gates
  de **`security-reviewer`** e **`adversarial-reviewer`** (P-11/P-13).
- **`main`:** aceitar PR **apenas** com base `develop` (a promoção); o `git-flow` job já recusa o resto.
- Proibir push direto e force-push nas duas (espelha o guard local no servidor).

O template `ai-first-guard.yml` (copiado para `.github/workflows/`) implementa a disciplina de fluxo e
roda as fitness functions. **Marcar como required check é o passo que transforma "avisa" em "impede".**

## 4 · Fitness functions (invariante = teste que quebra o build) — **e provado que quebra**
O método prega *"fronteira sem teste erode"* — aplique à governança: cada invariante durável vira um
**teste executável** que falha no desvio. Materializadas em `scripts/ai-first-fitness.mjs`:

| ID | Invariante | Onde se aplica |
|---|---|---|
| F1 | trilha de ADR append-only (`Superseded by` resolve; status conhecido) | qualquer repo com `docs/adr/` |
| F2 | versão do plugin declarada, semver e coerente com o marketplace | repo do método/plugin |
| F3 | genoma que se declara **armado** não tem `[A DEFINIR]` sobrando | repo de produto armado |
| F4 | acesso a dados atrás da porta (P-5): nenhum driver/SQL fora de `repositories/` | produto com `src/repositories/` |
| F5 | grafos contratados materializados e sem drift template↔cópia (ADR-0010/0018) | plugin e produto armado |
| F6 | todo `plan.md` de feature declara o bloco `footprint` (ADR-0007) | qualquer repo com features |
| F7 | trava de política íntegra (§4b) | qualquer repo com o lock |

### A prova de mutação (ADR-0020) — a checagem que nunca falhou não é uma checagem
Cada regra declara a sua **fixture de mutação**: o **menor repositório que a viola**, em
`scripts/fitness-fixtures/<id>/`. O comando

```sh
node scripts/ai-first-fitness.mjs --verify        # (ou --verify --rule F3)
```

roda a regra contra cada mutação e **exige ≥1 violação**. Regra que passa em silêncio contra a própria
mutação está **inerte** e reprova. **Check sem fixture ⇒ verify falha** ("regra não provada"). No CI,
`--verify` roda **antes** do `--check`: primeiro se prova que a régua mede, depois se mede. É a **prova
do vermelho** do ADR-0015 aplicada ao gate — a mesma disciplina que o método já exige do código de
produto, agora exigida do seu próprio critério.

> **Quando o verify acusa, conserte a REGRA — nunca a fixture.** Ajustar a mutação para caber na regra
> furada é o anti-padrão que o diretório existe para impedir.

Regra nova nasce com a sua mutação: sem fixture, o CI reprova antes de qualquer outra coisa. É o que
impede a camada 4 de apodrecer com o tempo.

## 4b · Trava de política — só aperta (ADR-0020)
O freio contra o caminho mais barato até o verde. Duas metades inseparáveis, em
`scripts/policy-lock.mjs` + `docs/governance/policy.lock.json`:

1. **Superfícies seladas.** O lock guarda o **digest sha256** de cada superfície de governança — hooks,
   `ci.yml`, `ai-first-guard.yml`, os scripts de gate, os grafos contratados. Alterou sem reselo ⇒
   **falha**. O reselo (`--seal`) é sempre uma **linha de diff revisável**, nunca silencioso. Apagar uma
   superfície selada, ou remover uma fitness function do registro, é afrouxamento máximo — bloqueio.
2. **Só aperta.** Os knobs de **rigor** do genoma §8 (`autonomy_level`, `tdd_mode`, `fast_path`,
   `verification_mode`, `uncertainty_escalation`, `eval_gate`, `adversarial_panel_size`,
   `external_action_cap`) têm escala ordinal. **Apertar** passa com reselo; **afrouxar** é bloqueio e só
   sela com `--seal --allow-loosening="motivo"`, que carimba data + motivo em `loosenings[]`
   (append-only, auditável). Knob de **forma** (`bdd_style`, `orchestration_mode`, `slice_fanout`) e de
   **vazão** (`features_per_day`, `parallelism`) ficam fora de propósito: travar o que não é régua só
   geraria atrito.

```sh
node scripts/policy-lock.mjs                                   # check: derivou? afrouxou?
node scripts/policy-lock.mjs --seal                            # reconhece um APERTO / mudança neutra
node scripts/policy-lock.mjs --seal --allow-loosening="motivo"  # afrouxamento deliberado — deixa trilha
```

**A divisão de trabalho (o que é selado ≠ o que é protegido).** Por **digest** sela-se o que
**executa** o gate — hooks, workflows, scripts de checagem, grafos contratados: ali qualquer byte a
mais muda o que passa. Por **CODEOWNERS** protege-se o que **define** o gate — constituição, genoma,
`docs/governance/`: texto vive e é reescrito legitimamente, e travá-lo por digest só produziria
reselo cerimonial. Os knobs de rigor ficam nos dois lados: o valor é comparado pela trava, e o
arquivo (`docs/ai-first/project.md`) exige revisão humana nomeada.

**O limite, dito com todas as letras:** a trava torna o afrouxamento **explícito, declarado e
revisável** — não fisicamente impossível. O que o torna impossível de **mergear** é o servidor:

- `templates/governance/CODEOWNERS` → `.github/CODEOWNERS` + *"Require review from Code Owners"* na
  branch protection: todo PR que toca a régua para até um humano nomeado aprovar.
- job **`ai-first · guard / policy-lock`** como required check: roda a integridade da trava e **reprova
  o PR que toca governança sem declarar** (label `policy-change` ou linha `Policy-Change: <motivo>` no
  corpo do PR).

**Vale em qualquer `autonomy_level`, inclusive `autônomo`.** Mudança de régua é a única classe de
mudança que **sempre** volta ao humano: a autonomia é sobre construir o produto, não sobre reescrever o
próprio critério de aprovação.

## 5 · Guia e uniformidade (probabilístico, mas coeso)
- **Bloco fixo + catálogos de princípios** dão o mesmo raciocínio a toda sessão.
- **Templates** (spec/plan/tasks/ADR/PR/issue) dão forma **idêntica** em todo repo — coesão por
  construção, não por estilo individual.
- **Uma issue = uma feature = uma branch = um `Closes #NNN`** — a unidade de trabalho é uniforme.

## 6 · Retroalimentação sustentável (crescer sem inchar)
Crescimento **auditável e saudável** é a higiene de memória (ADR-0005):
- `/daily-outcome` → o `finops-steward` realimenta `docs/ai-first/routing-policy.md` (o roteamento
  melhora sozinho; override só **sobe** piso, nunca abaixa o de segurança/P-14).
- `/distill` → o `knowledge-curator` consolida o episódico recorrente em semântico (`knowledge.md`,
  catálogos de princípios) e **poda para `archive/`** — esquece movendo, nunca inchando.
- **Regra permanente:** bug caçado → teste de regressão + anti-padrão; decisão durável → ADR; lição
  re-derivada por ≥2 repos → **sobe para o método** (os `*-principles.md`).
- **O degrau final do loop (ADR-0020):** anti-padrão que reincide **vira check + fixture** na camada 4.
  Prosa em `knowledge.md` orienta; fitness function **impede**. É assim que o aprendizado deixa de
  depender de o modelo lembrar — e o `/distill` ganha um destino executável, não só um arquivo maior.
- `/daily-tech-scan` e `/daily-ops-scan` auditam drift para o loop não apodrecer.

### Auditabilidade — a trilha imutável
ADRs append-only (`Superseded by` nunca apaga), `evolution.md`/`rejections.md`/`routing-policy.md`
datados, PR ligado à spec, git history. Toda decisão tem *porquê* rastreável — o `git-flow` job exige o
`Closes #` que fecha o elo issue↔código.

---

## Distribuição versionada
O método é **versionado** (`.claude-plugin/plugin.json`) e consumido via `.claude/settings.json`
apontando ao marketplace. Atualizar o plugin propaga a todos os produtos **sem tocar código de
produto**; *pinar* uma versão dá reprodutibilidade; uma fitness function detecta defasagem. É o que
mantém **uniformidade entre repos e no tempo**.

## Checklist de adoção (o /ai-first-init executa)
- [ ] `hooks/` (session-start + pre-tool-guard) instalados e registrados no `.claude/settings.json`.
- [ ] `ai-first-guard.yml` em `.github/workflows/` (jobs `git-flow`, `fitness` e `policy-lock`).
- [ ] Branch protection de `develop`/`main` com os required checks acima **+ "Require review from Code
      Owners"** (é o que dá dentes ao CODEOWNERS).
- [ ] `ci.yml` com typecheck+lint+test; gates de segurança/adversarial ligados.
- [ ] `scripts/ai-first-fitness.mjs` + `scripts/fitness-fixtures/` com as invariantes do projeto — cada
      uma **com a sua mutação** (`--verify` verde).
- [ ] `scripts/policy-lock.mjs` + `docs/governance/policy.lock.json` selado (`--seal`) e
      `.github/CODEOWNERS` com o dono humano da régua.
- [ ] Crons de `/distill` e `/daily-outcome` agendados (retroalimentação).
