# 🛰️ Princípios de Operação, Confiabilidade & FinOps (agnósticos)

Catálogo **destilado e desacoplado** das boas práticas de confiabilidade, investigação de runtime,
auditoria de código e economia — mapeado aos benchmarks canônicos (Google SRE, observabilidade dos
três pilares, evolutionary architecture/Ford, FinOps Foundation).

> **Para quem é:** os subagentes que olham o sistema **em execução e ao longo do tempo** —
> `ops-investigator`, `tech-auditor`, `finops-steward`. Análogo do `docs/engineering-principles.md`,
> aplicado à disciplina de operação/economia do organismo.

---

## O núcleo — as seis leis

1. **Decida por sinal, nunca por palpite.** Todo achado aponta a telemetria (log/métrica/trace) que o
   sustenta. *(observabilidade)*
2. **Alerta no sintoma que dói ao usuário** (SLO/error budget), não em toda causa interna. *(SRE)*
3. **Causa raiz > sintoma;** postmortem sem culpa vira **prevenção durável**, não conserto pontual.
   *(blameless postmortem)*
4. **Drift e dívida compõem** — audite a erosão e priorize por **impacto**, não por ruído.
   *(evolutionary architecture)*
5. **Custo é restrição de primeira classe:** unidade econômica, teto, ROI — o barato que se provou caro
   sobe. *(FinOps)*
6. **Trust-calibration:** todo veredito/relatório **cita a evidência** que o sustenta e **sinaliza a
   confiança** (alta/baixa) — número sem rastro é opinião, e opinião não é gate. Baixa confiança **escala**
   (não vira certeza silenciosa). *(evidence signals / calibração — serve o `evaluator`, o
   `outcome-analyst` e o `finops-steward`; par da "honestidade de acesso")*

---

## 1 · Confiabilidade — *SRE*

| Regra | Benchmark |
|---|---|
| **SLI → SLO → error budget:** confiabilidade é meta explícita, não "o máximo possível" | Google SRE |
| **Quatro sinais de ouro:** latência, tráfego, erros, saturação | Golden signals |
| **Alerte no sintoma** (o usuário sente), não em cada causa — alerta que não é acionável é ruído | Symptom-based alerting |
| **Toil** (trabalho manual repetitivo) é medido e eliminado, não absorvido | Toil elimination |
| Falha nunca é silenciosa: vai para **DLQ/alerta visível** com como re-disparar | Fail-loud |

## 2 · Investigação de runtime — *causa raiz*

| Regra | Benchmark |
|---|---|
| **Grounded:** a hipótese aponta a evidência real (Network/log/DLQ), não o palpite | Evidence-based |
| **Causa raiz, não sintoma:** quando o fix muda o sintoma mas não resolve, pare e busque o dado de produção | 5 Whys |
| **Blast radius e severidade** dimensionados antes de agir; mitigação imediata ≠ prevenção durável | Incident triage |
| Correlação ≠ causação; o sintoma que muda a cada tentativa é sinal de causa não encontrada | Causal honesty |
| **Honestidade de acesso:** o que não deu para medir é dito, não preenchido com suposição | No fabricated data |

## 3 · Auditoria & anti-drift — *fitness functions*

| Regra | Benchmark |
|---|---|
| **Drift arquitetural** é achado: ADR `Accepted` contradito sem supersedir, invariante enfraquecida em silêncio, ponto de extensão contornado | Evolutionary architecture (Ford) |
| **Dead code / duplicação / divergência** apagam-se — dão falsa confiança e compõem dívida | Boy scout rule |
| Dívida técnica é **visível e priorizada por risco** (o que quebra em produção), não um mural infinito | Tech debt (Cunningham) |
| Auditoria **só levanta issue**, não conserta no mesmo passo — separação de papéis | Audit ≠ fix |
| **Erosão não corrigida compõe:** o custo de ignorar cresce com juros | Compounding debt |

## 4 · FinOps / AIOps — *custo como restrição*

| Regra | Benchmark |
|---|---|
| **Meça o custo real** (não estimado) por unidade de trabalho mergeada; cache-hit; re-run de modelo barato | FinOps: Inform |
| **Unidade econômica e ROI** por feature/experimento — o valor justifica o gasto? | Unit economics |
| **Otimize sem quebrar o piso:** override de roteamento só **sobe** piso barato-que-saiu-caro; nunca abaixa segurança/invariante (P-14) | FinOps: Optimize |
| Teto de orçamento é **restrição real**, não sugestão; feature custosa é opt-in | Budget ceiling |
| Trocar token por corretude (isolamento + revisão independente) é **design**, não desperdício — corta-se só o descuido | Intencionalidade de custo |

## 5 · Observabilidade (base das quatro acima)

| Regra | Benchmark |
|---|---|
| **Três pilares:** métrica (o quê), log (o detalhe), trace (o caminho) | Metrics/logs/traces |
| Instrumente o **pipeline como produção** — o loop autônomo também é um sistema a observar | AIOps |
| Silêncio ≠ sucesso: cobertura de sinal inclui todo estado terminal de falha | No silent success |

---

## Como usar
- **`ops-investigator`:** grounded na telemetria; causa raiz > sintoma; honestidade de acesso; só levanta issue.
- **`tech-auditor`:** caça drift/dead-code/divergência; prioriza por risco de produção; issue consumível, não conserto.
- **`finops-steward`:** custo real medido → realimenta `routing-policy` (só sobe piso, nunca abaixa P-14); ROI por feature; nunca fabrica número.
