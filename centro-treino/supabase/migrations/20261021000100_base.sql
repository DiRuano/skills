-- =====================================================================
-- FASE 1 — BASE: perfis, alunos, responsáveis, consentimentos LGPD,
-- dados sensíveis, logs de acesso e solicitações de exclusão.
--
-- Princípios:
--  * Toda tabela tem RLS ligada. Sem política = sem acesso.
--  * O papel (admin/aluno/responsavel) vem de app_metadata, que só o
--    servidor (service_role) consegue gravar. O usuário não se promove.
--  * Consentimentos são "append-only": revogar = inserir nova linha.
--  * Dados de saúde ficam em tabela separada, só para o treinador, e
--    chegam aqui já cifrados pelo servidor (AES-256-GCM).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.papel_usuario as enum ('admin', 'aluno', 'responsavel');
create type public.sexo_biologico as enum ('M', 'F');
create type public.lado_dominante as enum ('direito', 'esquerdo', 'ambidestro');
create type public.status_aluno as enum ('aguardando_consentimento', 'ativo', 'inativo');
create type public.tipo_termo as enum ('dados_menor', 'imagem', 'termos_uso', 'privacidade');
create type public.status_solicitacao as enum ('pendente', 'em_andamento', 'concluida', 'recusada');

-- ---------------------------------------------------------------------
-- Perfis (1:1 com auth.users)
-- ---------------------------------------------------------------------
create table public.perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  papel       public.papel_usuario not null default 'responsavel',
  nome        text not null default '',
  email       text not null,
  telefone    text,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Cria o perfil automaticamente quando um usuário é criado no Auth.
-- O papel é lido de raw_APP_meta_data (gravável só pelo servidor),
-- nunca de raw_user_meta_data (que o próprio usuário controla no signUp).
create or replace function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_papel public.papel_usuario;
begin
  v_papel := coalesce(
    nullif(new.raw_app_meta_data ->> 'papel', '')::public.papel_usuario,
    'responsavel'
  );
  insert into public.perfis (id, papel, nome, email)
  values (
    new.id,
    v_papel,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

create trigger trg_auth_usuario_criado
  after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

-- ---------------------------------------------------------------------
-- Funções auxiliares de autorização (usadas nas políticas RLS).
-- security definer para não cair em recursão de RLS ao ler perfis.
-- ---------------------------------------------------------------------
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and papel = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- Alunos
-- ---------------------------------------------------------------------
create table public.alunos (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null check (length(trim(nome)) >= 2),
  data_nascimento  date not null check (data_nascimento > date '1990-01-01'),
  sexo_biologico   public.sexo_biologico not null,
  modalidade       text,
  lado_dominante   public.lado_dominante,
  foto_path        text,
  -- Conta de login do próprio aluno (opcional; criada depois do consentimento)
  usuario_id       uuid unique references public.perfis (id) on delete set null,
  status           public.status_aluno not null default 'aguardando_consentimento',
  criado_por       uuid references public.perfis (id) on delete set null,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

create index alunos_nome_idx on public.alunos (lower(nome));
create index alunos_status_idx on public.alunos (status);

-- Vínculo responsável ↔ aluno (um responsável pode ter vários filhos,
-- um aluno pode ter mais de um responsável).
create table public.responsaveis_alunos (
  responsavel_id uuid not null references public.perfis (id) on delete cascade,
  aluno_id       uuid not null references public.alunos (id) on delete cascade,
  parentesco     text not null default 'responsável legal',
  principal      boolean not null default false,
  criado_em      timestamptz not null default now(),
  primary key (responsavel_id, aluno_id)
);

create index responsaveis_alunos_aluno_idx on public.responsaveis_alunos (aluno_id);

-- Idade em anos completos no fuso America/Sao_Paulo
create or replace function public.idade_anos(p_nascimento date)
returns int
language sql
stable
as $$
  select extract(year from age((now() at time zone 'America/Sao_Paulo')::date, p_nascimento))::int;
$$;

create or replace function public.eh_responsavel_de(p_aluno_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.responsaveis_alunos
    where aluno_id = p_aluno_id and responsavel_id = auth.uid()
  );
$$;

create or replace function public.eh_o_proprio_aluno(p_aluno_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.alunos
    where id = p_aluno_id and usuario_id = auth.uid()
  );
$$;

-- REGRA: todo aluno menor de 18 anos precisa de responsável vinculado.
-- Gatilho de restrição DIFERIDO: verifica no fim da transação, o que
-- permite inserir o aluno e o vínculo na mesma transação.
create or replace function public.verificar_responsavel_menor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aluno_id uuid;
  v_nasc date;
begin
  -- (campos lidos via jsonb: o plpgsql valida a estrutura do registro
  --  mesmo no ramo não executado de um CASE)
  if tg_table_name = 'alunos' then
    v_aluno_id := new.id;
  else
    v_aluno_id := (to_jsonb(old) ->> 'aluno_id')::uuid;
  end if;

  select data_nascimento into v_nasc from public.alunos where id = v_aluno_id;
  if not found then
    return null; -- aluno excluído junto; nada a verificar
  end if;

  if public.idade_anos(v_nasc) < 18 and not exists (
    select 1 from public.responsaveis_alunos where aluno_id = v_aluno_id
  ) then
    raise exception 'Aluno menor de 18 anos precisa de ao menos um responsável vinculado'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger trg_alunos_exige_responsavel
  after insert or update of data_nascimento on public.alunos
  deferrable initially deferred
  for each row execute function public.verificar_responsavel_menor();

create constraint trigger trg_vinculo_removido_exige_responsavel
  after delete on public.responsaveis_alunos
  deferrable initially deferred
  for each row execute function public.verificar_responsavel_menor();

-- ---------------------------------------------------------------------
-- Dados sensíveis de saúde (LGPD art. 11) — SÓ o treinador lê.
-- Os campos *_cifrado chegam cifrados pelo servidor (AES-256-GCM).
-- ---------------------------------------------------------------------
create table public.alunos_saude (
  aluno_id                 uuid primary key references public.alunos (id) on delete cascade,
  historico_lesoes_cifrado text,
  observacoes_cifrado      text,
  atualizado_por           uuid references public.perfis (id) on delete set null,
  atualizado_em            timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Termos versionados e consentimentos (LGPD art. 14, §1º)
-- ---------------------------------------------------------------------
create table public.termos (
  id            uuid primary key default gen_random_uuid(),
  tipo          public.tipo_termo not null,
  versao        text not null,
  titulo        text not null,
  conteudo      text not null,
  -- Hash do conteúdo: prova de qual texto exato foi aceito
  hash_conteudo text generated always as (encode(digest(conteudo, 'sha256'), 'hex')) stored,
  vigente       boolean not null default false,
  publicado_em  timestamptz not null default now(),
  unique (tipo, versao)
);

-- Só uma versão vigente por tipo
create unique index termos_um_vigente_por_tipo on public.termos (tipo) where vigente;

create table public.consentimentos (
  id              uuid primary key default gen_random_uuid(),
  aluno_id        uuid not null references public.alunos (id) on delete cascade,
  -- Quem deu/revogou: o responsável (aluno menor) ou o próprio titular (maior)
  concedido_por   uuid not null references public.perfis (id) on delete restrict,
  qualidade       text not null check (qualidade in ('responsavel', 'titular')),
  termo_id        uuid not null references public.termos (id) on delete restrict,
  concedido       boolean not null,         -- false = revogação
  ip              inet,
  user_agent      text,
  registrado_em   timestamptz not null default now()
);

create index consentimentos_aluno_idx on public.consentimentos (aluno_id, registrado_em desc);

-- Imutável: nem o admin altera ou apaga registro de consentimento.
create or replace function public.bloquear_alteracao()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Registros de % são imutáveis (append-only)', tg_table_name;
end;
$$;

create trigger trg_consentimentos_imutaveis
  before update on public.consentimentos
  for each row execute function public.bloquear_alteracao();

-- Situação atual de cada tipo de consentimento por aluno:
-- última decisão registrada + se foi sobre a versão vigente do termo.
create or replace view public.consentimentos_atuais
with (security_invoker = true)
as
select distinct on (c.aluno_id, t.tipo)
  c.aluno_id,
  t.tipo,
  c.concedido,
  t.versao,
  t.vigente as versao_vigente,
  (c.concedido and t.vigente) as valido,
  c.concedido_por,
  c.registrado_em
from public.consentimentos c
join public.termos t on t.id = c.termo_id
order by c.aluno_id, t.tipo, c.registrado_em desc;

create or replace function public.tem_consentimento(p_aluno_id uuid, p_tipo public.tipo_termo)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select c.concedido and t.vigente
    from public.consentimentos c
    join public.termos t on t.id = c.termo_id
    where c.aluno_id = p_aluno_id and t.tipo = p_tipo
    order by c.registrado_em desc
    limit 1
  ), false);
$$;

-- Ativa/desativa o aluno conforme o consentimento de tratamento de dados.
create or replace function public.atualizar_status_por_consentimento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.termos where id = new.termo_id and tipo = 'dados_menor') then
    update public.alunos
       set status = case when new.concedido then 'ativo'::public.status_aluno
                         else 'aguardando_consentimento'::public.status_aluno end,
           atualizado_em = now()
     where id = new.aluno_id and status <> 'inativo';
  end if;
  return new;
end;
$$;

create trigger trg_consentimento_status
  after insert on public.consentimentos
  for each row execute function public.atualizar_status_por_consentimento();

-- ---------------------------------------------------------------------
-- Solicitações do titular (exclusão de dados — LGPD art. 18)
-- ---------------------------------------------------------------------
create table public.solicitacoes_exclusao (
  id             uuid primary key default gen_random_uuid(),
  aluno_id       uuid references public.alunos (id) on delete set null,
  aluno_nome     text not null,           -- preservado para auditoria após exclusão
  solicitante_id uuid not null references public.perfis (id) on delete restrict,
  motivo         text,
  status         public.status_solicitacao not null default 'pendente',
  resposta       text,
  criado_em      timestamptz not null default now(),
  concluido_em   timestamptz
);

-- ---------------------------------------------------------------------
-- Logs de acesso a dados sensíveis (somente inserção)
-- ---------------------------------------------------------------------
create table public.logs_acesso (
  id          bigint generated always as identity primary key,
  usuario_id  uuid references public.perfis (id) on delete set null,
  aluno_id    uuid references public.alunos (id) on delete set null,
  recurso     text not null,   -- ex.: 'alunos_saude', 'exportacao_dados'
  acao        text not null,   -- ex.: 'leitura', 'escrita', 'exportacao'
  ip          inet,
  detalhes    jsonb,
  criado_em   timestamptz not null default now()
);

create index logs_acesso_aluno_idx on public.logs_acesso (aluno_id, criado_em desc);

create trigger trg_logs_imutaveis
  before update or delete on public.logs_acesso
  for each row execute function public.bloquear_alteracao();

-- ---------------------------------------------------------------------
-- atualizado_em automático
-- ---------------------------------------------------------------------
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger trg_perfis_atualizado before update on public.perfis
  for each row execute function public.tocar_atualizado_em();
create trigger trg_alunos_atualizado before update on public.alunos
  for each row execute function public.tocar_atualizado_em();
create trigger trg_saude_atualizado before update on public.alunos_saude
  for each row execute function public.tocar_atualizado_em();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.perfis                enable row level security;
alter table public.alunos                enable row level security;
alter table public.responsaveis_alunos   enable row level security;
alter table public.alunos_saude          enable row level security;
alter table public.termos                enable row level security;
alter table public.consentimentos        enable row level security;
alter table public.solicitacoes_exclusao enable row level security;
alter table public.logs_acesso           enable row level security;

-- Perfis: cada um vê o seu; admin vê todos. Responsável vê o perfil do
-- filho que tem login (para saber se a conta existe).
create policy perfis_select on public.perfis for select to authenticated
  using (
    id = auth.uid()
    or public.eh_admin()
    or exists (select 1 from public.alunos a
               where a.usuario_id = perfis.id and public.eh_responsavel_de(a.id))
  );
create policy perfis_update_proprio on public.perfis for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy perfis_admin_update on public.perfis for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- O usuário comum só pode mudar nome e telefone — nunca o papel/e-mail.
revoke update on public.perfis from authenticated;
grant update (nome, telefone) on public.perfis to authenticated;

-- Alunos
create policy alunos_admin_tudo on public.alunos for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());
create policy alunos_responsavel_le on public.alunos for select to authenticated
  using (public.eh_responsavel_de(id));
create policy alunos_proprio_le on public.alunos for select to authenticated
  using (usuario_id = auth.uid());

-- Vínculos
create policy vinculos_admin_tudo on public.responsaveis_alunos for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());
create policy vinculos_responsavel_le on public.responsaveis_alunos for select to authenticated
  using (responsavel_id = auth.uid());

-- Saúde: exclusivo do treinador/admin
create policy saude_admin_tudo on public.alunos_saude for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- Termos: leitura pública (as páginas de política são públicas); escrita admin
create policy termos_leitura on public.termos for select to anon, authenticated
  using (true);
create policy termos_admin_escrita on public.termos for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- Consentimentos: leitura por admin, responsável do aluno e titular.
-- Inserção SOMENTE pelo servidor (service_role), que captura IP e
-- user-agent de forma confiável. Nenhuma política de insert para clientes.
create policy consentimentos_leitura on public.consentimentos for select to authenticated
  using (
    public.eh_admin()
    or public.eh_responsavel_de(aluno_id)
    or public.eh_o_proprio_aluno(aluno_id)
  );

-- Solicitações de exclusão
create policy solicitacoes_admin_tudo on public.solicitacoes_exclusao for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());
create policy solicitacoes_responsavel_le on public.solicitacoes_exclusao for select to authenticated
  using (solicitante_id = auth.uid());
create policy solicitacoes_responsavel_cria on public.solicitacoes_exclusao for insert to authenticated
  with check (
    solicitante_id = auth.uid()
    and status = 'pendente'
    and (public.eh_responsavel_de(aluno_id) or public.eh_o_proprio_aluno(aluno_id))
  );

-- Logs: só admin lê; gravação pelo servidor ou pela função abaixo
create policy logs_admin_le on public.logs_acesso for select to authenticated
  using (public.eh_admin());

-- Registra acesso a dado sensível em nome do usuário logado.
create or replace function public.registrar_acesso(
  p_aluno_id uuid, p_recurso text, p_acao text, p_detalhes jsonb default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.logs_acesso (usuario_id, aluno_id, recurso, acao, detalhes)
  values (auth.uid(), p_aluno_id, p_recurso, p_acao, p_detalhes);
$$;

revoke execute on function public.registrar_acesso(uuid, text, text, jsonb) from public, anon;
grant execute on function public.registrar_acesso(uuid, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: cria aluno + vínculo com responsável + dados de saúde numa única
-- transação (o gatilho diferido exige isso para menores).
-- security INVOKER: roda com a RLS do usuário; só admin consegue inserir.
-- Os textos de saúde já chegam cifrados pelo servidor.
-- ---------------------------------------------------------------------
create or replace function public.criar_aluno(
  p_nome text,
  p_data_nascimento date,
  p_sexo public.sexo_biologico,
  p_modalidade text,
  p_lado public.lado_dominante,
  p_responsavel_id uuid,
  p_parentesco text,
  p_usuario_id uuid,
  p_lesoes_cifrado text,
  p_observacoes_cifrado text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.eh_admin() then
    raise exception 'Apenas o treinador pode cadastrar alunos' using errcode = 'insufficient_privilege';
  end if;

  insert into public.alunos (nome, data_nascimento, sexo_biologico, modalidade, lado_dominante, usuario_id, criado_por)
  values (p_nome, p_data_nascimento, p_sexo, p_modalidade, p_lado, p_usuario_id, auth.uid())
  returning id into v_id;

  if p_responsavel_id is not null then
    insert into public.responsaveis_alunos (responsavel_id, aluno_id, parentesco, principal)
    values (p_responsavel_id, v_id, coalesce(nullif(p_parentesco, ''), 'responsável legal'), true);
  end if;

  if p_lesoes_cifrado is not null or p_observacoes_cifrado is not null then
    insert into public.alunos_saude (aluno_id, historico_lesoes_cifrado, observacoes_cifrado, atualizado_por)
    values (v_id, p_lesoes_cifrado, p_observacoes_cifrado, auth.uid());
  end if;

  return v_id;
end;
$$;

revoke execute on function public.criar_aluno from public, anon;
grant execute on function public.criar_aluno to authenticated;
