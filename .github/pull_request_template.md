## 📝 Descrição

<!-- O quê e por quê (não só o "o quê" — o diff já mostra isso). -->

## 🔗 Links Úteis

* **Issue:** Closes #
* **PRs relacionados/incluídos:**
* **Spec/docs:** `docs/sdd/features/NNN-slug/`

## 🛠️ Tipo de Alteração

- [ ] 🚀 Nova funcionalidade (feature)
- [ ] 🐛 Correção de bug (bugfix)
- [ ] 🧹 Refatoração / Performance (refactor)
- [ ] 🧪 Adição ou correção de testes (test)
- [ ] 📚 Documentação (docs)
- [ ] ⚙️ Infra / Dependências (chore)

## 📋 Checklist do Desenvolvedor

- [ ] `typecheck` + `lint` + `test` limpos localmente.
- [ ] Adicionei/atualizei testes para toda mudança de comportamento (mudança só de doc dispensa).
- [ ] Se mudei comportamento de IA/agente, adicionei/ajustei um eval.
- [ ] Todo efeito colateral novo reserva idempotência **antes** de executar (e faz rollback na falha).
- [ ] Acesso a dados novo passa pela porta de dados (nada de driver/SQL fora da camada).
- [ ] Nenhum segredo em config versionada, log ou neste PR — apenas cifrado em repouso.
- [ ] Atualizei a doc normativa afetada (`docs/sdd/specification.md`, docs de arquitetura/dados) se o
      comportamento descrito nela mudou.

## 🏛️ Gate constitucional (se aplicável)

<!-- Só preencha se este PR introduz/altera comportamento normativo. Ver docs/sdd/constitution.md —
     cite o(s) princípio(s) tocados e o(s) RF-### de docs/sdd/specification.md.
     Ex.: "Novo efeito colateral → P-3 (idempotência), RF-XXX-05". -->

- **Princípios/RFs impactados:**
- [ ] N/A — não toca comportamento normativo

## ⚙️ Mudanças de Infra / Config

- [ ] Nenhuma
- [ ] **Variáveis de Ambiente / Secrets** (adicionadas/alteradas)
- [ ] **Migration / esquema de dados** (nova — com a chave de escopo e índice separado)
- [ ] **Recursos de infra** (fila, cache, storage — novo ou alterado)

## 🧪 Como Testar?

1. Instale dependências
2. Rode o app / os testes relevantes
3. Cenário manual (se aplicável): passos + resultado observável esperado.
