<!--
  Preencha as seções que fizerem sentido para este tipo de issue e apague o resto —
  bug, feature, achado de arquitetura e épico usam subconjuntos diferentes deste template.

  Título: prefixe quando ajudar a triagem — [Bug] · [Produto] · [Ops] · [Gate] · [Épico/Roadmap].

  Labels (o fluxo autônomo depende delas):
   - Feature de negócio (entra no /daily-build): `po-suggested` + exatamente uma `size:trivial|media|grande`
     (+ `needs-human-triage` junto de `size:grande`).
   - Achado técnico/ops (FORA do fluxo autônomo): `bug`/`tech-debt`/`ops` + SEMPRE `needs-human-triage`,
     NUNCA `po-suggested`/`size:*`.
   - Roteamento (aplicado pelo `sdd-orchestrator`): `model:<haiku|sonnet|opus|fable>` +
     `effort:<baixo|medio|alto|extra>` — o tier de custo-benefício que a feature merece.
-->

## 📌 Contexto

<!-- O que já existe hoje e por quê isso importa agora. Cite arquitetura/decisões relevantes
     (docs/sdd/*, docs/adr/*) e issues/PRs relacionados. -->

## ❗ Problema / 🎯 Objetivo

<!-- Bug/achado: o que está errado, com evidência (observado vs. esperado).
     Feature/produto: o que o dono/cliente precisa e o valor entregue. -->

## 🧭 Direções possíveis / Correção proposta

<!-- Uma ou mais alternativas, com preferência justificada se houver — não é obrigatório prescrever a
     implementação. Para feature: "Escopo" (o que entra) + "Não-objetivos" (o que fica fora). -->

## 📊 Por que agora / benchmarking (features de produto)

<!-- Racional de mercado: que padrão/tendência da categoria isto persegue e a lacuna que fecha. -->

## 📂 Arquivos / Referências no código

<!-- `src/caminho/arquivo:linha` — o que tem lá e por que é relevante. -->

## 🏛️ Gate constitucional (se aplicável)

<!-- Toca algum princípio de docs/sdd/constitution.md? (ex.: novo efeito → P-3; dado pessoal novo →
     P-7). Cite o P-# e, se já existir, o RF-### de docs/sdd/specification.md. -->

## ✅ Critérios de aceite

- [ ] Dado [estado], quando [ação], então [resultado observável].

## 🧪 Testes

<!-- Cenários que a suíte deve cobrir — unit, integration, runtime real, ou eval se mudar IA. -->

## ⚠️ Severidade / Prioridade

<!-- Só para bugs/achados: impacto (dado duplicado? cliente sem resposta?) e urgência. -->

## 🔗 Relacionado

<!-- Closes #NNN · Relacionado: #NNN, #MMM -->
