# Centro de Treinamento — app de avaliação, treino e financeiro

App web mobile-first (PWA na Fase 6) para um centro de desenvolvimento motor de jovens de 6 a 18 anos.
Stack: Next.js 15 (App Router) + TypeScript + Tailwind 4 + Supabase (Postgres, Auth, Storage, RLS).

## Status das fases

| Fase | Situação |
|---|---|
| 1. Base — auth, perfis, RLS, cadastro, consentimentos LGPD | ✅ entregue |
| 2. Avaliação — antropometria, maturação, testes, referências, gráficos, PDF | ✅ entregue |
| 3. Treino | ⏳ |
| 4. Monitoramento | ⏳ |
| 5. Financeiro | ⏳ (decisões registradas em `docs/decisoes.md`) |
| 6. Acabamento / PWA | ⏳ |

## Como rodar

1. Crie um projeto no [Supabase](https://supabase.com).
2. Aplique as migrações em ordem (`supabase/migrations/*.sql`), pelo SQL Editor ou com `npx supabase db push`.
3. **Auth → Providers → Email:** desligue *Allow new users to sign up* (as contas nascem só por convite).
4. **Auth → URL Configuration:** *Site URL* = URL do app (ex.: `http://localhost:3000`).
5. **Auth → Email Templates** — troque o link dos modelos para o fluxo SSR:
   - *Invite user:* `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=invite`
   - *Magic Link:* `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=magiclink`
   - *Reset Password:* `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery`
6. Crie o primeiro usuário (Auth → Users → *Add user*) e rode `supabase/criar-admin.sql` com o e-mail dele.
7. **Configurações → Maturação:** cadastre a idade média do PHV de referência (com a citação) para ligar a idade biológica.
   **Referências:** cadastre as tabelas normativas a partir dos artigos (modelo CSV na própria tela).
8. `cp .env.example .env.local` e preencha (gere `DADOS_SENSIVEIS_CHAVE` com o comando que está no arquivo).
9. `npm install && npm run dev`.

## Testes

```bash
npm test          # unitários: cifra, idade/fuso, validação, IMC-OMS, maturação, percentis, CSV, PDF
npm run test:db   # sobe um Postgres temporário, aplica as migrações e testa regras + RLS
npm run typecheck
npm run build
```

`test:db` precisa dos binários do PostgreSQL 15+ (usa `supabase/tests/00_shim_supabase.sql` para simular
`auth.uid()`, os papéis `anon/authenticated/service_role` e o schema `storage`).

### Roteiro de teste manual (Fase 1)

1. Entre como treinador → **Alunos → + Novo aluno** → cadastre um menor com e-mail de responsável.
   O aluno aparece como *Aguardando consentimento*.
2. Abra o convite no e-mail do responsável → defina a senha → em **Meus filhos**, clique em *Ler e autorizar*.
   Aceite o termo de dados e escolha sim/não para imagem.
3. Volte ao treinador: a ficha mostra os consentimentos com versão e data, o aluno está *Ativo* e o envio de foto
   só aparece se a imagem foi autorizada.
4. Na ficha, *Ver dados de saúde* → o acesso é gravado em `logs_acesso`.
5. Como responsável, em **Consentimentos e privacidade**: revogue imagem (a foto some), baixe o JSON, peça exclusão.
6. Como treinador, em **Solicitações LGPD**, conclua ou recuse o pedido.

### Roteiro de teste manual (Fase 2)

1. **Testes:** ative/desative testes da bateria e crie um personalizado (numérico ou por critérios).
2. **Referências → + Nova tabela:** baixe o modelo, preencha com valores de um artigo e importe. Linhas com percentis
   fora de ordem ou faixas etárias sobrepostas são recusadas com a linha do erro.
3. Na ficha de um aluno **com consentimento**, aba *Avaliações* → *Nova avaliação*: preencha massa, estatura, altura
   sentado e alguns testes. Sem consentimento, o botão não aparece e o banco recusa o registro.
4. Na avaliação: IMC com escore-z da OMS, as duas equações de maturação, fase (alerta em circa-PHV), percentis com
   a fonte embaixo, radar e linha do tempo (a partir da 2ª avaliação). Testes sem tabela mostram
   "sem referência cadastrada".
5. *Publicar* → o responsável passa a ver em **Meus filhos**; *Enviar ao responsável* manda o PDF por e-mail
   (requer `RESEND_API_KEY`). O aluno vê só a própria evolução, sem percentis.

## Ciência embarcada (Fase 2)

| Cálculo | Origem | Validação |
|---|---|---|
| IMC por idade (z) | LMS oficial OMS 2007, pacote `WorldHealthOrganization/anthroplus` | reproduz 350 z-scores calculados pela OMS (inclui \|z\| > 3) |
| Maturity offset | Mirwald 2002 e Moore 2015 | exemplos numéricos calculados à mão; **conferir coeficientes no PDF** |
| VO2máx (vai-e-vem) | Léger 1988 | exemplo numérico; **conferir no artigo** |
| Khamis-Roche | coeficientes cadastrados pelo treinador | mecânica testada com coeficientes fictícios |
| Percentis / zonas | só tabelas cadastradas, com citação | interpolação linear; detecta se o P95 do teste de tempo é o melhor ou o pior |

## Arquitetura de segurança (Fase 1)

- **Papéis** (`admin`, `aluno`, `responsavel`) ficam em `perfis.papel`, definido a partir de `app_metadata` — que só o
  servidor grava. O usuário não consegue se promover (testado).
- **RLS em todas as tabelas.** Responsável vê só os filhos vinculados; aluno vê só a si mesmo; admin vê tudo.
- **Menor de 18 sem responsável é bloqueado no banco** (gatilho de restrição diferido), inclusive ao remover o último vínculo.
- **Consentimentos são append-only.** Revogar = nova linha. Cada registro guarda termo/versão (com hash SHA-256 do texto),
  data/hora, IP e user-agent. Quem grava é o servidor, que captura o IP; o cliente não insere direto.
- **Consentimento de imagem é separado e opcional.** A foto só pode ser enviada com ele; revogar apaga a foto.
- **O aluno fica "aguardando consentimento"** até o responsável aceitar o termo de dados vigente. Publicar nova versão de
  termo faz o pedido de aceite reaparecer.
- **Dados de saúde** (lesões, observações) ficam em tabela separada, só admin, cifrados com AES-256-GCM no servidor
  (`src/lib/cripto.ts`). Cada leitura, escrita ou exportação vai para `logs_acesso` (imutável).
- **Direitos do titular:** download de todos os dados em JSON e pedido de exclusão, tratado pelo treinador em
  *Solicitações LGPD*.
- `SUPABASE_SERVICE_ROLE_KEY` só é usada em código `server-only`, sempre depois de checar a permissão com a sessão.

## Estrutura

```
supabase/migrations/   schema, RLS, termos v1.0 (MINUTA)
supabase/tests/        testes de banco
src/lib/               supabase, auth, cripto, idade (fuso SP), validação, convites, consentimento
src/app/treinador/     painel, alunos (lista/novo/ficha), solicitações LGPD
src/app/responsavel/   filhos, consentimentos e privacidade
src/app/aluno/         área do aluno (treinos na Fase 3)
src/app/consentimento/ fluxo de consentimento (responsável ou titular maior de idade)
src/lib/ciencia/       IMC-OMS, maturação, VO2máx, percentis, importação CSV (funções puras, testadas)
src/lib/avaliacao.ts   monta o resumo de uma avaliação (usado na tela, na área da família e no PDF)
src/lib/pdf/           relatório em PDF para os pais
docs/decisoes.md       decisões de negócio e de ciência
```
