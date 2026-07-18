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
| 4 | **Fitness functions** | build quebra quando a arquitetura/invariante desvia | **força** | `scripts/ai-first-fitness.mjs` (por repo) |
| 5 | **Guia e uniformidade** | orientam o raciocínio, dão forma idêntica em todo repo | **guia** | `CLAUDE.md`, `agents/`, `*-principles.md`, templates |
| 6 | **Retroalimentação** | consolida e **poda** a memória; o método melhora com o uso | **loop** | `/distill`, `/daily-outcome`, ADRs, `evolution.md` |

As camadas 1–4 são o **"forçar"**; a 5 é o **"orientar/uniformizar"**; a 6 é o **"crescer saudável"**.
Nenhuma sozinha basta — juntas, aderência vira garantia.

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

## 4 · Fitness functions (invariante = teste que quebra o build)
O método prega *"fronteira sem teste erode"* — aplique à governança: cada invariante durável vira um
**teste executável** que falha no desvio. Exemplos reaplicáveis (materializados por repo em
`scripts/ai-first-fitness.mjs` e/ou na suíte):
- acesso a dados só na camada de repositório (nenhum SQL/driver fora dela);
- toda rota nova registrada nas rotas/edge + teste de sincronia estrutural;
- nenhum ADR `Accepted` contradito sem `Superseded by`;
- versão do plugin declarada e não-defasada.
> **Fatia seguinte do kit:** a suíte de fitness mínima. Enquanto não existe, as invariantes são cobertas
> pela suíte de testes do repo (`ci.yml`) — o job `fitness` degrada para isso e avisa.

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
- [ ] `ai-first-guard.yml` em `.github/workflows/`.
- [ ] Branch protection de `develop`/`main` com os required checks acima.
- [ ] `ci.yml` com typecheck+lint+test; gates de segurança/adversarial ligados.
- [ ] (Fatia seguinte) `scripts/ai-first-fitness.mjs` com as invariantes do projeto.
- [ ] Crons de `/distill` e `/daily-outcome` agendados (retroalimentação).
