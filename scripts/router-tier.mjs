#!/usr/bin/env node
// Triagem do ROTEADOR — a que modelo/esforço o próprio `sdd-orchestrator` roda (ADR-0021 §1).
// Zero dependências.
//
//   node scripts/router-tier.mjs --tier=medio --comportamento=altera --classeConhecida=true --quiet
//   node scripts/router-tier.mjs --json '{"tier":"alto","efeitoDeAltoValor":true}'
//
// O problema que resolve. O `sdd-orchestrator` era o ÚNICO subagente de modelo fixo — opus/alto, o
// prompt mais longo do roster, uma invocação POR FEATURE. Só que o grafo contratado já traz um default
// para CADA fase (`route('feature-spec', {sonnet,medium})`, `route('docs-writer', {haiku,low})`…) e a
// tabela de overrides vigentes (`docs/ai-first/routing-policy.md`) nasce vazia. Em feature 🟢
// repetitiva, o roteador gastava o modelo mais caro do método para reproduzir o default que já está no
// código — imposto puro, pago em toda rodada.
//
// O que NÃO muda (e é o ponto): o roteador continua opus/alto onde ele se paga — ambiguidade real,
// risco alto, efeito de alto valor, domínio ainda sem custo aprendido. A triagem não baixa a régua de
// NENHUM gate: `adversarial-reviewer` e `security-reviewer` têm piso no motor (P-14), fora do alcance
// do plano de delegação e fora do alcance deste arquivo.
//
// Direção do erro. Na dúvida, ESCALA. Sinal ausente/ilegível ⇒ opus/alto (o caro é o seguro aqui: um
// roteamento ruim contamina todas as etapas seguintes da feature).

export const ROUTER_ALTO = { model: 'opus', effort: 'alto' };
export const ROUTER_BASE = { model: 'sonnet', effort: 'médio' };

// Vocabulário de tier que a triagem sabe ler. Valor FORA daqui não é "não é 🔴": é sinal que não se
// entendeu — e sinal não entendido escala (o gatilho `tier-ilegivel` abaixo).
const TIER_BAIXO = ['baixo', '🟢', 'green', 'low'];
const TIER_MEDIO = ['medio', 'médio', '🟡', 'yellow', 'medium'];
const TIER_ALTO = ['alto', '🔴', 'red', 'high'];
const tierDe = (t) => (t == null ? 'medio' : String(t).trim().toLowerCase());

// Sinais que, sozinhos, justificam pagar o roteador caro. Cada um é uma pergunta que o default por
// fase do grafo NÃO sabe responder — é exatamente aí que um roteador caro compra alguma coisa.
const GATILHOS = [
  {
    id: 'tier-alto',
    quando: (s) => TIER_ALTO.includes(tierDe(s.tier)),
    porque: 'tier de risco 🔴 — o plano de delegação decide onde o piso sobe',
  },
  {
    id: 'tier-ilegivel',
    quando: (s) => ![...TIER_BAIXO, ...TIER_MEDIO, ...TIER_ALTO].includes(tierDe(s.tier)),
    porque: 'tier fora do vocabulário conhecido — sinal não entendido escala (não é o mesmo que "não é 🔴")',
  },
  {
    id: 'efeito-de-alto-valor',
    quando: (s) => s.efeitoDeAltoValor === true,
    porque: 'efeito de alto valor (dinheiro/PII/authz/dependência nova)',
  },
  {
    id: 'dominio-sem-custo-aprendido',
    // `comportamento` ausente vale 'cria' — é o default do próprio grafo e a direção segura do erro.
    quando: (s) => (s.comportamento ?? 'cria') === 'cria' && s.classeConhecida !== true,
    porque: 'comportamento novo em classe sem linha vigente na routing-policy — não há custo real aprendido para herdar',
  },
  {
    id: 'ambiguidade-declarada',
    quando: (s) => s.ambigua === true || s.confidence === 'baixa',
    porque: 'ambiguidade declarada na entrada (issue vaga / confiança baixa)',
  },
  {
    id: 'migracao',
    quando: (s) => s.migracao === true,
    porque: 'migração/caracterização (ADR-0002) — o roteamento por equivalência é o trabalho difícil',
  },
];

/**
 * @param {object} sinais { tier, comportamento, efeitoDeAltoValor, classeConhecida, ambigua,
 *                          confidence, migracao, routerEscalation }
 * @returns {{ model:string, effort:string, motivo:string, gatilhos:string[] }}
 */
export function routerTier(sinais = {}) {
  // `router_escalation: off` = comportamento legado (sempre opus/alto). O knob existe para que quem
  // não confia na triagem possa desligá-la sem editar o motor — e para que desligá-la seja uma linha
  // de diff visível, não um hábito silencioso.
  if (String(sinais.routerEscalation ?? 'on').toLowerCase() === 'off')
    return { ...ROUTER_ALTO, motivo: 'router_escalation: off — roteador fixo no piso legado', gatilhos: ['knob-off'] };

  const disparados = GATILHOS.filter((g) => {
    try { return g.quando(sinais); } catch { return true; }   // sinal ilegível ⇒ escala
  });
  if (disparados.length)
    return { ...ROUTER_ALTO, motivo: disparados.map((g) => g.porque).join(' · '), gatilhos: disparados.map((g) => g.id) };

  return {
    ...ROUTER_BASE,
    motivo: 'feature sem gatilho de escalada — os defaults por fase do grafo contratado já cobrem o roteamento',
    gatilhos: [],
  };
}

// ---- CLI ------------------------------------------------------------------------------------------
const ESTE = new URL(import.meta.url).pathname;
if (process.argv[1] && ESTE.endsWith(process.argv[1].split('/').pop())) {
  const argv = process.argv.slice(2);
  let sinais = {};
  const jsonIdx = argv.findIndex((a) => a === '--json');
  if (jsonIdx !== -1 && argv[jsonIdx + 1]) {
    try { sinais = JSON.parse(argv[jsonIdx + 1]); }
    catch (e) { console.error(`--json ilegível: ${e.message}`); process.exit(2); }
  }
  for (const a of argv) {
    const m = /^--([a-zA-Z]+)=(.*)$/.exec(a);
    if (!m) continue;
    const v = m[2];
    sinais[m[1]] = v === 'true' ? true : v === 'false' ? false : v;
  }
  const r = routerTier(sinais);
  if (argv.includes('--quiet')) console.log(`${r.model}/${r.effort}`);
  else console.log(JSON.stringify(r, null, 2));
}
