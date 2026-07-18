# 📦 Princípios de Documentação & Release (agnósticos)

Catálogo **destilado e desacoplado** das boas práticas de documentação e de entrega/release — mapeado
aos benchmarks canônicos (Diátaxis/Procida, docs-as-code, Semantic Versioning, Keep a Changelog,
Conventional Commits, DORA).

> **Para quem é:** os subagentes da **saída** do ciclo — `docs-writer` e `release-manager`. Análogo do
> `docs/engineering-principles.md`, aplicado à disciplina de comunicação e entrega.

---

## O núcleo — as cinco leis

1. **Cada documento tem UM propósito** (Diátaxis): tutorial ≠ how-to ≠ referência ≠ explicação — não
   misture. *(Diátaxis)*
2. **Docs vivem com o código** (docs-as-code), rastreáveis a ADR/PR; **não documente o que o código
   mostra** nem o que já morreu. *(docs-as-code)*
3. **A versão comunica risco** (SemVer); changelog e release notes falam a **língua da persona**, não a
   da engenharia. *(SemVer · Keep a Changelog)*
4. **Lote pequeno, promoção disciplinada, rollback pronto.** *(DORA)*
5. **Deploy ≠ release:** a flag desacopla a entrega do código da exposição ao usuário. *(progressive
   delivery)*

---

## 1 · Documentação — *Diátaxis + docs-as-code*

| Regra | Benchmark |
|---|---|
| Escolha o **modo** e não o misture: **tutorial** (aprender), **how-to** (resolver tarefa), **referência** (consultar), **explicação** (entender) | Diátaxis (Procida) |
| Escreva para a **tarefa do leitor**; divulgação progressiva (o essencial primeiro, o resto sob demanda) | Reader-task focus |
| **Não documente o que o código já mostra** (assinatura, tipo) — documente o **porquê** e o não-óbvio | Docs-as-code |
| **Atualidade:** doc que descreve o que morreu é pior que ausência — remova/atualize no mesmo PR | Single source of truth |
| **Rastreabilidade:** link ao ADR/PR/código; a doc é índice do "porquê", não cópia do "o quê" | Traceable docs |
| **Voz da casa:** densidade sem ruído, idioma e tom dos docs existentes | Consistent voice |

## 2 · Versionamento & changelog — *SemVer + Keep a Changelog*

| Regra | Benchmark |
|---|---|
| **MAJOR.MINOR.PATCH:** quebra de contrato = MAJOR; capacidade nova compatível = MINOR; correção = PATCH | Semantic Versioning |
| **Changelog para humanos**, agrupado por tipo (Added/Changed/Fixed/Removed), não o dump de commits | Keep a Changelog |
| Mensagem de commit/PR estruturada e rastreável (tipo + escopo + `Closes #`) | Conventional Commits |
| A release **fala a língua da PERSONA** ("o que muda para você"), não a da engenharia | Audience-first notes |

## 3 · Entrega & promoção — *DORA*

| Regra | Benchmark |
|---|---|
| **Lote pequeno:** feature→develop→main em fatias, não big-bang | Small batches |
| Mede as **4 chaves:** frequência de deploy, lead time, MTTR, taxa de falha de mudança | DORA metrics |
| **Rollback pronto** antes de promover; o que chega a produção tem kill-switch/revert | Rollback readiness |
| Promoção passa pelos **gates automáticos** (CI + revisão adversarial + segurança), mesmo no modo autônomo | Quality gate |
| **Deploy ≠ release:** entregue o código atrás de flag; exponha depois, no canário | Progressive delivery |

## 4 · Comunicação proporcional

| Regra | Benchmark |
|---|---|
| O **tamanho do anúncio** é proporcional ao impacto na persona — não celebre um patch como um marco | Proporcionalidade |
| Conformidade/segurança **confirmadas** antes do anúncio; nunca comunique o que não passou no gate | Compliance-first |
| Um só destino canônico do "o que mudou" (changelog); o resto **linka**, não duplica | DRY de comunicação |

## 5 · Anti-padrões de entrega

| Anti-padrão | Por quê |
|---|---|
| Misturar tutorial e referência no mesmo doc | O leitor que quer consultar se perde no que quer aprender |
| Changelog = `git log` cru | Ruído para o humano; não diz o que mudou **para ele** |
| Bump de versão que não reflete o risco real da mudança | SemVer mente; o consumidor não sabe se pode atualizar |
| Documentar comportamento já removido | Doc desatualizada engana mais que a ausência |
| Anunciar antes do gate de conformidade/segurança | Comunica o que pode não ir a produção |

---

## Como usar
- **`docs-writer`:** escolha o modo Diátaxis; documente o **porquê**, não o que o código mostra; remova o que morreu; rastreie ao ADR/PR.
- **`release-manager`:** SemVer honesto + changelog por audiência na língua da persona; rollback pronto; anúncio proporcional e pós-gate.
