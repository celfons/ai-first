# Fixtures de mutação — a prova de que cada fitness function DISPARA (ADR-0020)

Cada diretório aqui é **o menor repositório que viola** uma das checagens de
`scripts/ai-first-fitness.mjs`. `node scripts/ai-first-fitness.mjs --verify` roda a checagem contra a
sua mutação e **exige ≥1 violação**. Se ela passar em silêncio, a regra está **inerte** (glob que não
casa nada, regex furado, guarda de aplicabilidade invertida) e o verify reprova — antes que o gate
vire teatro.

É a mesma disciplina que o método exige do código de produto (a **prova do vermelho** do ADR-0015),
aplicada ao **gate**: uma checagem que nunca foi vista falhando não é uma checagem.

## Regras destas fixtures

- **Mínima.** Só os arquivos necessários para a regra disparar — nada de repo de exemplo.
- **Uma mutação, um sinal.** Cada fixture viola **um** mecanismo. `F7` tem duas (`F7-digest` prova a
  selagem por digest; `F7-knob` prova o "só aperta") porque são dois mecanismos distintos na mesma regra.
- **Toda regra nova nasce com a sua.** Check sem fixture ⇒ `--verify` falha por "regra não provada".
- **Quando o verify acusa, conserte a REGRA — não a fixture.** Ajustar a mutação para caber na regra
  furada é exatamente o anti-padrão que este diretório existe para impedir.

| Fixture | Regra | O que a mutação faz |
|---|---|---|
| `F1/` | Trilha de ADR append-only | ADR com `Superseded by 0042` sem `0042-*.md` |
| `F2/` | Versão do plugin coerente | `plugin.json.version` não-semver |
| `F3/` | Genoma armado consistente | genoma marcado "armado" com `[A DEFINIR]` sobrando |
| `F4/` | Dado atrás da porta (P-5) | `src/services/` importando driver de banco |
| `F5/` | Grafos contratados | repo de plugin sem `templates/workflows/` |
| `F6/` | Footprint declarado | `plan.md` de feature sem bloco ` ```footprint ` |
| `F7-digest/` | Trava de política | superfície de governança alterada sem reselo |
| `F7-knob/` | Trava de política | knob de rigor AFROUXADO (`conservador` → `autônomo`) |
