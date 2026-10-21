# Centro de Treinamento — app de avaliação, treino e financeiro

App web mobile-first (PWA na Fase 6) para um centro de desenvolvimento motor de jovens de 6 a 18 anos.
Stack: Next.js 15 (App Router) + TypeScript + Tailwind 4 + Supabase (Postgres, Auth, Storage, RLS).

## Status das fases

| Fase | Situação |
|---|---|
| 1. Base — auth, perfis, RLS, cadastro, consentimentos LGPD | ✅ entregue |
| 2. Avaliação | ⏳ |
| 3. Treino | ⏳ |
| 4. Monitoramento | ⏳ |
| 5. Financeiro | ⏳ (decisões de negócio pendentes) |
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
7. `cp .env.example .env.local` e preencha (gere `DADOS_SENSIVEIS_CHAVE` com o comando que está no arquivo).
8. `npm install && npm run dev`.

## Testes

```bash
npm test          # unitários (cifra, idade/fuso, validação do cadastro)
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
```
