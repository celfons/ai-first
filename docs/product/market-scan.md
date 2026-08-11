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

### Plataformas de agente de IA p/ WhatsApp — concorrência BR — varrido em 2026-08-11 (TTL 30 dias)
- **Table stakes:** agente generativo treinado por docs/site (RAG básico) 24/7; multicanal Meta (WhatsApp+IG+Messenger); inbox multiatendente com handoff; disparos com templates HSM; integrações Hotmart/RD/Make; trial 7–14 dias; transcrição de áudio; cobrança por créditos/mensagem + repasse Meta à parte.
- **Diferencial emergente:** comércio agêntico (fechar transação na conversa — tema do WhatsApp Business Summit BR 2026); voz falada (responder em áudio); "funcionário digital" com ROI vs folha CLT; atribuição venda↔anúncio (Tintim); distribuição via telco (Blip Go × Claro, ago/2026); white-label p/ agências como motor (Zaia +R$997/mês); CRM embutido na conversa. **Ameaça:** Meta Business Agent / WhatsApp Business AI nativo e gratuito (fev/2026) comoditiza o "responder 24/7" — quem só responde compete com grátis.
- **Nossa lacuna (na verdade, vantagens não comunicadas):** curadoria resposta a resposta (ninguém vende "o dono treina corrigindo o balão"); zero-senha/link mágico (todos exigem conta/painel); copiloto do dono dentro do próprio WhatsApp; compliance Meta como *feature de venda* (mercado trata como burocracia de blog); preço all-in previsível (mercado sofre de custo em camadas — assinatura+crédito+Meta+add-on, "MAC trap"); orquestração de agentes especializados até o link de pagamento Mercado Pago. Lacuna real nossa: ROI calculator interativo (comum lá fora, ausente no BR) e prova social/cases nomeados.
- **Preço (BR):** entrada R$69–199 · sweet spot PME R$249–600 · vertical/"resolvido" R$500–1.300+ · mid/enterprise R$1.800+. Success fee/% de venda inexistente (culturalmente tóxico — "zero comissão" é arma contra iFood).
- **Fontes:** clint.digital/blog · zaia.app/plans · gptmaker.ai · blip.ai/pricing + Telesíntese/Mobile Time (Claro×Blip) · socialhub.pro/blog · sleekflow.io/pt-br/blog · chatarmin.com (Wati/respond.io) · botaihub.com.br · exame.com (WhatsApp Business AI).

### GTM e canais de aquisição da categoria — varrido em 2026-08-11 (TTL 45 dias)
- **Table stakes:** trial self-serve 7 dias sem cartão; programa de afiliados com comissão recorrente (30–50% por 12m — ManyChat 25k parceiros; Zaia 10%/12m); SEO comparativo ("agente vs chatbot", "quanto custa") como captura.
- **Diferencial emergente:** "ensinar o cliente a virar agência" (Zaia Academy, GPT Maker) — o cliente vira canal; reseller maduro estilo respond.io (15–40% *vitalício* + devolução de leads por região); distribuição por telco com billing na fatura; verticais com demo assistida e ticket 2–4× (único exit da categoria no BR é vertical: Anota AI→iFood ~R$60mi).
- **Nossa lacuna/oportunidade:** programa de parceria bem desenhado (comissão vitalícia + lead give-back) aplicado a nicho sem player consolidado. Ranking de nichos (dor × ticket × saturação): 1º clínicas estética/odonto (nenhum dominante; nosso stack agenda+campanha+handoff mapeia 1:1), 2º imobiliárias (78% dos leads via WhatsApp, frame "SDR de leads"), 3º e-commerce recuperação (ROI mensurável), evitar delivery (Anota AI/iFood). Âncora de venda universal: custo CLT do atendente (R$2.600–6.800/mês total) — nosso custo ~R$0,30/atendimento permite precificar por valor.
- **Benchmarks (⚠️ genéricos):** churn PME <8%/mês aceitável; CAC payback <12m (ideal <6); trial→pago ~30% de referência; LTV/CAC ≥3×; comissões de 30–50%/12m implicam que líderes pagam ~4–6 meses de receita como CAC de canal.
- **Fontes:** zaia.app/afiliados · help.manychat.com (partner FAQ) · respond.io/reseller · sleekflow.io/partner · gptmaker.ai/blog (agência de IA) · dtnetwork.com.br (670+ revendas) · anota.ai · baita.ac / metrikia.com.br (benchmarks SaaS BR).

### Posicionamento e mensagem da categoria — varrido em 2026-08-11 (TTL 45 dias)
- **Table stakes (claims):** "24/7 em segundos" (claim nº1); "amplie a equipe, não os custos" (âncora CLT); "vende, não só atende"; "sem código, em minutos"; "handoff invisível". Provas: estatísticas de dor (50% compram do 1º que responde; 98% abertura no zap), micro-cases, prova social de volume. Nomenclatura vencedora: **"agente de IA"** (busca) + **"funcionário/vendedor de IA"** (compra); "chatbot" é o vilão retórico; "secretária IA" é categoria própria no vertical saúde.
- **Diferencial emergente:** "clone do seu melhor vendedor" (Umbler); demo = o próprio produto (simulação na LP; "fale com o agente no seu WhatsApp" existe mas é **subexplorado** nos líderes); garantia de ROI 30 dias (marcador de player pequeno — líderes usam trial + cancele quando quiser).
- **Nossa lacuna (= espaço aberto):** ninguém entre os líderes vende **confiança/guardas** como identidade ("não inventa preço, não duplica cobrança, não põe seu número em risco") — só players pequenos vendem a técnica (RAG/CoVe), não a garantia de negócio. As 3 objeções mais fortes e menos neutralizadas (ban do número, IA falar besteira/inventar preço — caso Air Canada, perder controle) mapeiam 1:1 nas nossas guardas reais (price gate, idempotência, compliance nativo, curadoria por balão). Regra: confiança **não** abre a carteira sozinha — claim principal = resultado; guardas = reason-to-believe/desempate.
- **Fontes:** br.hubspot.com (agentes vs chatbots) · zaia.app/lp/empresario · umbler.com/talk · atendente.ai · omni.chat · conjur.com.br / tecnoblog.net (Air Canada) · cubosuite/bradial/chatlabs (ban) · mercadopago.com.br/blog (IA+link) · cloudia.com.br / secretar.ai (secretária IA saúde).

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
