#!/usr/bin/env node
// Exporta o método ai-first (roster + skills + contexto) para um pacote PORTÁVEL, utilizável
// FORA do Claude Code — em orquestradores como o Maestri (canvas de agentes) ou qualquer CLI de
// agente movido a GPT/outro LLM (Codex CLI, Aider, opencode…). Zero dependências.
//
//   node scripts/export-portable.mjs [dir-de-saida]      (default: dist/portable)
//
// O QUE GERA (dist/portable/):
//   AGENTS.md                     — contexto fixo raiz (o "CLAUDE.md" que todo papel carrega)
//   README.md                     — como importar no Maestri e como rodar com um CLI GPT
//   manifest.json                 — índice do que foi gerado + proveniência + nota de schema
//   roles/<agente>/AGENTS.md      — instruções do papel (frontmatter do Claude removido)
//   roles/<agente>/.maestri/role.json  — sidecar p/ o "Discover Roles" do Maestri
//   runbooks/<skill>.md           — o playbook da skill como runbook (a ordem vira a fiação PTY)
//
// NOTA DE SCHEMA: o formato de role.json do Maestri (campos, pasta .maestri) foi inferido da doc
// pública "Terminals & Agents". O AGENTS.md por papel é o caminho robusto (o Maestri lê AGENTS.md/
// CLAUDE.md do subdiretório do papel de qualquer forma); o role.json é a conveniência do import em
// lote. Se o Maestri mudar o schema, ajuste ROLE_JSON() abaixo — o resto do pacote não depende dele.

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, process.argv[2] || 'dist/portable');

// ---- Mapa de raia (fase) + cor de badge por papel -------------------------------------------------
const PHASE = {
  growth:  { color: '#7c6cf0', label: 'Propor (funil)' },
  arbiter: { color: '#cf922a', label: 'Arbitrar (prioridade)' },
  build:   { color: '#1f9fb0', label: 'Construir (SDD)' },
  gate:    { color: '#d85a34', label: 'Verificar (gate)' },
  ops:     { color: '#3f9c68', label: 'Promover / operar' },
  default: { color: '#2f9aa8', label: 'Método' },
};
const AGENT_PHASE = {
  'growth-strategist': 'growth', 'growth-analyst': 'growth', 'experiment-designer': 'growth',
  'product-owner': 'arbiter', 'outcome-analyst': 'arbiter',
  'sdd-orchestrator': 'build', 'feature-spec': 'build', 'architect': 'build',
  'task-decomposer': 'build', 'bdd-author': 'build', 'backend-engineer': 'build',
  'frontend-engineer': 'build', 'tester': 'build', 'ux-designer': 'build',
  'docs-writer': 'build', 'migration-analyst': 'build',
  'prompt-engineer': 'build', 'data-engineer': 'build',
  'adversarial-reviewer': 'gate', 'security-reviewer': 'gate', 'tech-auditor': 'gate',
  'ops-investigator': 'gate',
  'release-manager': 'ops', 'finops-steward': 'ops', 'knowledge-curator': 'ops',
  'sre-engineer': 'ops',
};
// Papéis que exigem o modelo mais capaz (piso opus/alto no Claude → "seu LLM mais forte" fora dele).
const STRONG = new Set(['adversarial-reviewer', 'security-reviewer', 'sdd-orchestrator']);

// Ordem canônica dos crons/skills (a fiação sugerida no canvas do Maestri).
const WIRING = [
  'daily-growth  →  daily-backlog  →  daily-build',
  'dentro do daily-build: sdd-orchestrator → feature-spec → architect → task-decomposer → bdd-author'
    + ' → (backend-engineer ∥ frontend-engineer) → tester → adversarial-reviewer → security-reviewer → docs-writer',
];

// ---- Utilidades -----------------------------------------------------------------------------------
function splitFrontmatter(txt) {
  if (!txt.startsWith('---')) return { fm: {}, body: txt.trim() };
  const end = txt.indexOf('\n---', 3);
  if (end === -1) return { fm: {}, body: txt.trim() };
  const block = txt.slice(3, end);
  const body = txt.slice(txt.indexOf('\n', end + 1) + 1).trim();
  const fm = {};
  let key = null;
  for (const line of block.split('\n')) {
    const m = /^([A-Za-z0-9_-]+):(.*)$/.exec(line);
    if (m) { key = m[1]; fm[key] = m[2].trim(); }
    else if (key && line.trim()) fm[key] += ' ' + line.trim(); // dobra de valor multi-linha (>-)
  }
  // limpa o marcador de bloco YAML ">-" que sobra no início
  for (const k of Object.keys(fm)) fm[k] = fm[k].replace(/^>-?\s*/, '').trim();
  return { fm, body };
}

// Traduz a lista `tools:` do Claude Code em capacidades que o nó precisa ter no runtime alvo.
function capabilities(toolsStr) {
  const t = (toolsStr || '').toLowerCase();
  const caps = [];
  if (/read|grep|glob/.test(t)) caps.push('ler o repositório (arquivos + busca)');
  if (/write|edit/.test(t)) caps.push('editar arquivos do repositório');
  if (/bash/.test(t)) caps.push('rodar comandos de shell (git, testes)');
  if (/websearch/.test(t)) caps.push('buscar na web (benchmarking)');
  if (/github/.test(t)) caps.push('GitHub: issues + pull requests (ler/gravar)');
  return caps.length ? caps : ['ler o repositório'];
}

function ROLE_JSON({ name, description, prompt, color }) {
  // Schema best-effort do Maestri (validar contra a doc "Terminals & Agents" ao importar).
  return JSON.stringify({
    name,
    description,
    badgeColor: color,
    prompt,
  }, null, 2) + '\n';
}

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

// ---- Início ---------------------------------------------------------------------------------------
if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const plugin = JSON.parse(readFileSync(join(ROOT, '.claude-plugin/plugin.json'), 'utf8'));
const version = plugin.version || '0.0.0';

// ---- 1. Contexto fixo raiz (AGENTS.md) ------------------------------------------------------------
const rootAgents = `# ai-first — contexto fixo (AGENTS.md)

> Pacote portável do método **ai-first v${version}**, exportado para runtime fora do Claude Code.
> Cada papel em \`roles/*/\` carrega ESTE contexto + o seu próprio \`AGENTS.md\`.
> Rode o CLI de agente (GPT/outro) a partir da **raiz do repositório** para os caminhos abaixo resolverem.

## Carregue como contexto fixo (a "cola" que o Claude carregava via CLAUDE.md)
Leia, nesta ordem, antes de agir:
- \`CLAUDE.md\` — mapa de módulos, invariantes, pontos de extensão.
- \`docs/sdd/constitution.md\` — princípios inegociáveis **P-1…P-15** (+ Parte B do projeto).
- \`docs/ai-first/project.md\` — o **genoma** (§8: cadência, \`parallelism\`, \`wip_limit\`, \`ready_backlog_cap\`,
  \`proposal_ttl\`, autonomia, orçamento).
- \`docs/adr/README.md\` — decisões vivas (não contradiga). Em especial **ADR-0007** (fila única +
  WIP + contrapressão) e **ADR-0003** (build multi-feature/worktree).
- \`docs/context-map.md\`, \`docs/knowledge.md\` — mapa de contexto + padrões/anti-padrões.

## Invariantes que nenhum papel quebra
Idempotência antes de todo efeito (P-3) · IA nunca confiada: timeout + saída validada + fallback (P-4) ·
acesso a dados só atrás da porta / \`repositories/\` (P-5) · segurança fail-closed, segredo/PII (P-6/P-7) ·
observável (P-8) · config/flags explícitas (P-9).

## Fluxo de git (imposto por CI, não por hook aqui)
\`feature → develop → main\`. Branch \`claude/<slug>\` (ou \`agent/<slug>\`) sai de \`develop\`; PR contra \`develop\`;
\`main\` só recebe promoção por tier de risco. **Fora do Claude, o enforcement é branch protection +
\`.github/workflows/ai-first-guard.yml\` + os gates \`adversarial-reviewer\`/\`security-reviewer\` como nós.**

## Modelo
Aponte o CLI de cada nó para o seu LLM (ex.: GPT). Papéis de **invariante/segurança** e o
**adversarial-reviewer** (marcados \`modelo: forte\` no papel) merecem o modelo mais capaz — nunca o barato.

## Ordem de fiação (no canvas do Maestri, conecte os nós assim)
${WIRING.map((w) => `- ${w}`).join('\n')}
`;
write(join(OUT, 'AGENTS.md'), rootAgents);

// ---- 2. Roles (a partir de agents/*.md) -----------------------------------------------------------
const roles = [];
for (const f of readdirSync(join(ROOT, 'agents')).sort()) {
  if (!f.endsWith('.md')) continue;
  const name = basename(f, '.md');
  const { fm, body } = splitFrontmatter(readFileSync(join(ROOT, 'agents', f), 'utf8'));
  if (!fm.name) continue; // ignora arquivos sem frontmatter (não-agentes)
  const phase = AGENT_PHASE[name] || 'default';
  const color = PHASE[phase].color;
  const strong = STRONG.has(name);
  const caps = capabilities(fm.tools);

  const roleAgents = `# Role: ${name}

> Papel do método **ai-first** (raia: ${PHASE[phase].label}) exportado para runtime.
> Contexto compartilhado: **carregue \`../../AGENTS.md\` primeiro** (constituição, genoma, invariantes).

- **Modelo:** ${strong ? '**forte** — este papel é gate/roteador; use seu LLM mais capaz, nunca o barato.' : 'padrão — aponte o CLI para o seu LLM (ex.: GPT).'}
- **Capacidades necessárias no nó:** ${caps.join(' · ')}.

---

${body}
`;
  write(join(OUT, 'roles', name, 'AGENTS.md'), roleAgents);
  write(join(OUT, 'roles', name, '.maestri', 'role.json'),
    ROLE_JSON({ name, description: fm.description || '', prompt: roleAgents, color }));
  roles.push({ name, phase, badgeColor: color, strong });
}

// ---- 3. Runbooks (a partir de skills/*/SKILL.md) --------------------------------------------------
const skills = [];
for (const d of readdirSync(join(ROOT, 'skills')).sort()) {
  const skillFile = join(ROOT, 'skills', d, 'SKILL.md');
  if (!existsSync(skillFile) || !statSync(join(ROOT, 'skills', d)).isDirectory()) continue;
  const { fm, body } = splitFrontmatter(readFileSync(skillFile, 'utf8'));
  const runbook = `# Runbook: /${d}

> Skill do ai-first como **runbook portável**. No Claude Code era um slash-command; fora dele, é a
> **receita de fiação**: cada etapa abaixo é um nó no canvas; conecte-os na ordem descrita (pipes PTY),
> ou rode-os em sequência num script de shell chamando o CLI de agente do seu LLM.

_${fm.description || ''}_

---

${body}
`;
  write(join(OUT, 'runbooks', `${d}.md`), runbook);
  skills.push(d);
}

// ---- 4. README + manifest -------------------------------------------------------------------------
const readme = `# ai-first — pacote portável (v${version})

Este pacote leva o **método ai-first** para fora do Claude Code: para o **Maestri** (canvas de agentes)
ou qualquer **CLI de agente** movido a GPT/outro LLM (Codex CLI, Aider, opencode, Cline…).

## Conteúdo
- \`AGENTS.md\` — contexto fixo raiz (carregue-o em todo papel).
- \`roles/<agente>/\` — um papel do roster: \`AGENTS.md\` (instruções) + \`.maestri/role.json\` (import).
- \`runbooks/<skill>.md\` — os playbooks dos crons como receita de fiação.
- \`manifest.json\` — índice + proveniência.

## Importar no Maestri
1. Mantenha \`dist/portable/\` dentro do repositório do projeto (os papéis referenciam \`docs/…\`).
2. No Maestri, abra um terminal no subdiretório de um papel (ex.: \`roles/architect/\`) — ele lê o
   \`AGENTS.md\` dali como as instruções daquele agente.
3. Ou use **"Discover Roles"**: aponte para \`dist/portable/roles\`; o Maestri varre os \`.maestri/role.json\`
   e importa o roster em lote (nome + cor + prompt).
4. **Fie os nós** na ordem de \`AGENTS.md\` (seção "Ordem de fiação") ligando as saídas às entradas (PTY).

## Rodar com um CLI GPT (exemplos)
Da raiz do repo, com o CLI apontado para o seu LLM:
\`\`\`sh
# Codex CLI / opencode / Aider leem AGENTS.md automaticamente:
codex --cd . "Assuma o papel em dist/portable/roles/architect/AGENTS.md e execute o runbook dist/portable/runbooks/daily-build.md para a issue #NNN"
\`\`\`

## O que NÃO vem no pacote (recrie no destino)
- **Enforcement:** os hooks do Claude Code viram **branch protection + \`.github/workflows/ai-first-guard.yml\`** (já portável).
- **Auto-invocação** de skill/subagente e o **cache de prompt** — no Maestri viram fiação de canvas / scripts.

## Nota de schema
O formato de \`role.json\` é best-effort (inferido da doc "Terminals & Agents" do Maestri). Se o import
não reconhecer, ajuste \`ROLE_JSON()\` em \`scripts/export-portable.mjs\` — o \`AGENTS.md\` por papel funciona
independente do role.json.
`;
write(join(OUT, 'README.md'), readme);

write(join(OUT, 'manifest.json'), JSON.stringify({
  generator: 'ai-first/export-portable',
  pluginVersion: version,
  counts: { roles: roles.length, runbooks: skills.length },
  wiring: WIRING,
  roles,
  runbooks: skills,
  schemaNote: 'role.json best-effort (Maestri "Terminals & Agents"); AGENTS.md é o caminho robusto.',
}, null, 2) + '\n');

console.log(`✓ Pacote portável gerado em ${process.argv[2] || 'dist/portable'}/`);
console.log(`  · ${roles.length} papéis (roles/) + ${skills.length} runbooks + AGENTS.md + README + manifest`);
console.log(`  · importe no Maestri via "Discover Roles" (roles/) ou rode com um CLI GPT (ver README).`);
