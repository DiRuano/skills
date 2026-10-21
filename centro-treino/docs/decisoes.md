# Decisões de negócio e de ciência

Registro das decisões tomadas pelo centro. Toda regra configurável do app parte destes valores.

## Financeiro (Fase 5) — decidido em 21/10/2026

| Tema | Decisão |
|---|---|
| Gateway | **Mercado Pago** (atrás da interface `PaymentProvider`) |
| Parcelamento | Segue a duração do plano: **mensal = só à vista (integral)**, trimestral até 3x, **semestral até 6x**, **anual até 12x**. Juros **por conta do cliente**. Implementado em `src/lib/financeiro/regras.ts` |
| Bloqueio por atraso | Acesso ao **treino** bloqueado enquanto houver cobrança vencida; libera **automaticamente ao confirmar o pagamento**. Tolerância configurável, padrão **0 dias** (bloqueia no dia seguinte ao vencimento). Avaliações e relatórios antigos continuam visíveis ao responsável |
| Lembrete | **5 dias antes** do vencimento (e-mail + push) |
| Desconto para irmãos | **10%** para o 2º filho em diante. O 1º, pela ordem de início da assinatura, paga cheio |
| Troca de plano | **Cobrança imediata da diferença** proporcional aos dias restantes; downgrade vale a partir do próximo ciclo |
| Boleto | **Não** oferecer |

## Avaliação (Fase 2)

| Tema | Decisão / origem |
|---|---|
| IMC por idade | Parâmetros LMS oficiais da OMS 2007 (5–19 anos), copiados do pacote oficial `WorldHealthOrganization/anthroplus` (`data-raw/growthstandards/bfawho2007.txt`). Z-score com o método restrito da OMS para \|z\| > 3 e interpolação linear de L, M, S entre meses, como no pacote |
| Maturity offset | Mirwald et al. (2002) e Moore et al. (2015), coeficientes em `src/lib/ciencia/maturacao.ts`. **Conferir com os PDFs originais** |
| Khamis-Roche (1994) | Coeficientes **não embarcados**: o treinador cadastra a tabela do artigo em *Configurações*. Sem ela, o app mostra "sem coeficientes cadastrados" |
| Classificação maturacional | Limiares configuráveis (padrão: pré-PHV < −1,0 ano; circa-PHV de −1,0 a +1,0; pós-PHV > +1,0) |
| Idade biológica | Maturity offset + idade média do PHV de referência, que o treinador cadastra **com a citação**. Sem esse parâmetro, a comparação por idade biológica não aparece |
| Valores normativos | Só os que o treinador cadastra, sempre com a citação. Nada vem de memória |

## Identidade visual — 21/10/2026

| Item | Valor |
|---|---|
| Verde da marca | `#99cc40` (botões principais; como texto no tema claro usa `#4a7a12`, pois o verde puro tem contraste 1,9:1 sobre branco) |
| Azul da marca | `#054872` (base do tema escuro, títulos e barras do PDF) |
| Logo | `public/marca/` — versão original (tema claro e PDF) e versão com o azul em branco (tema escuro); ícone isolado para favicon/PWA |
| Gráficos | azul e verde ajustados por tema, validados para daltonismo e contraste |
