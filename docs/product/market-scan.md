# Digest de benchmarking de mercado — cache compartilhado do `product-owner`

**Este documento se ALTERA durante as execuções.** É o cache datado do benchmarking (alavanca §6 de
`docs/token-efficiency.md`): em vez de o `product-owner` re-varrer o mercado inteiro (`WebSearch`) a
**cada** issue/rodada, ele **lê o digest vigente aqui** e só busca o **delta** (o que envelheceu ou o
recorte novo). É **fato compartilhado, não raciocínio** — não fere o isolamento das sessões.

> **Compartilhado por TODOS os caminhos que acionam o `product-owner`:** o cron `/daily-backlog`, o
> manual `/backlog` e o `/kickoff`. Como o cache vive no agente (nas "Fontes de verdade"), o caminho
> manual e o automático leem/atualizam o **mesmo** digest — nenhum re-varre a frio o que o outro já viu.

> **Embarca vazio, enche com o uso.** Nasce em branco em todo projeto; não é preenchido na gênese. A
> primeira rodada do `product-owner` grava o digest; as seguintes o **leem e atualizam o delta**. Sem
> entradas = o PO faz o benchmarking completo (comportamento de sempre) e semeia o cache.

> **Quem escreve:** a skill que dirigiu o PO (`/daily-backlog`, `/backlog`, `/kickoff`) grava o digest
> que o `product-owner` emitiu — o subagente é só-leitura de docs (mesmo padrão de `evolution.md`).
> **Quem lê:** o `product-owner`, antes de propor.

> **Retenção (cache semantic datado — ver [`../ai-first/memory.md`](../ai-first/memory.md)):** cada
> seção já carrega um **TTL em dias**; ao vencer, o PO re-busca o delta. O `knowledge-curator` **poda**
> recortes vencidos e não reusados há mais de `memory_retention`, movendo-os para `archive/AAAA-MM.md`
> — um digest vencido servido como fresco é bug (datar é obrigatório).

---

## Digest vigente por categoria/tema

Uma seção por recorte de mercado que o PO já varreu. Cada uma **datada** — ao vencer o TTL (dias), o PO
re-busca aquele recorte e atualiza. Guarde **padrões/tendências** (o que virou "table stakes", o
diferencial emergente), **nunca** material proprietário de terceiro.

<!-- PO:UPSERT-AQUI (a skill atualiza a seção do tema ou acrescenta uma nova) -->

_(sem digest ainda — a primeira rodada do `product-owner` grava aqui)_

Formato de cada seção:
```
### <tema/categoria> — varrido em <data> (TTL <n> dias)
- **Table stakes:** <o que o mercado já considera padrão>
- **Diferencial emergente:** <o que está surgindo como vantagem>
- **Nossa lacuna:** <onde estamos atrás / oportunidade que cabe na nossa arquitetura>
- **Fontes:** <links úteis, sem copiar conteúdo proprietário>
```

---

## Invariantes deste documento
- **Só o `product-owner` propõe conteúdo** (via a skill que escreve); é insumo de decisão de produto, não
  de roteamento nem de código.
- **Toda seção é datada e tem TTL** — digest sem data apodrece; vencido, o PO re-busca o delta antes de
  usar. Digest vencido servido como fresco é bug.
- **Padrões, não cópias** — tendências e lacunas agregadas; nunca material proprietário de concorrente.
- **É cache, não fonte de verdade de produto** — a fonte é o mercado real + o sinal de resultado
  (`/daily-outcome`) + o ledger de rejeições. O digest só evita a re-varredura fria.
