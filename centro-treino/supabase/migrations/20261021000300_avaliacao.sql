-- =====================================================================
-- FASE 2 — AVALIAÇÃO: antropometria, maturação, bateria de testes,
-- tabelas de referência e parâmetros científicos.
--
-- Regra crítica: nenhum valor normativo é semeado aqui. Tabelas de
-- referência e coeficientes vêm do treinador, sempre com citação.
-- =====================================================================

create extension if not exists btree_gist;

create type public.criterio_tentativa as enum ('melhor', 'media');
create type public.tipo_teste as enum ('numerico', 'criterios');
create type public.tipo_tabela as enum ('percentil', 'zona');
create type public.nivel_confianca as enum ('meta_analise', 'populacional', 'local');
create type public.lado_teste as enum ('unico', 'D', 'E');

-- ---------------------------------------------------------------------
-- Parâmetros científicos e de configuração (chave → valor + citação)
-- ---------------------------------------------------------------------
create table public.parametros (
  chave         text primary key,
  valor         jsonb not null,
  citacao       text,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references public.perfis (id) on delete set null
);

insert into public.parametros (chave, valor, citacao) values
  -- Equação usada nos relatórios; as duas são sempre exibidas na ficha
  ('equacao_maturacao', '"moore_2015"', null),
  -- Convenção usual; o treinador ajusta conforme a fonte adotada
  ('limiares_fase', '{"inicioCirca": -1, "fimCirca": 1}', null),
  -- Idade média do PHV de referência por sexo (para idade biológica). Vazio até o treinador cadastrar com a fonte
  ('aphv_referencia', '{"M": null, "F": null}', null),
  -- Citação da tabela de coeficientes de Khamis-Roche cadastrada
  ('khamis_roche', '{}', null);

-- Coeficientes de Khamis-Roche (cadastrados a partir do artigo original; unidades: pol e lb)
create table public.khamis_roche_coeficientes (
  sexo               public.sexo_biologico not null,
  idade              numeric(4,1) not null,
  intercepto         double precision not null,
  coef_estatura      double precision not null,
  coef_massa         double precision not null,
  coef_estatura_pais double precision not null,
  primary key (sexo, idade)
);

-- Estatura dos pais biológicos (opcional, para Khamis-Roche)
create table public.alunos_familia (
  aluno_id         uuid primary key references public.alunos (id) on delete cascade,
  estatura_mae_cm  numeric(5,1) check (estatura_mae_cm between 120 and 220),
  estatura_pai_cm  numeric(5,1) check (estatura_pai_cm between 120 and 230),
  autorrelatada    boolean not null default true,
  atualizado_em    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Catálogo de testes (pré-cadastrados + personalizados)
-- ---------------------------------------------------------------------
create table public.testes (
  id             uuid primary key default gen_random_uuid(),
  codigo         text unique,
  nome           text not null,
  categoria      text not null default 'outro',
  unidade        text not null,
  tipo           public.tipo_teste not null default 'numerico',
  maior_melhor   boolean not null default true,
  tentativas     int not null default 1 check (tentativas between 1 and 10),
  criterio       public.criterio_tentativa not null default 'melhor',
  por_lado       boolean not null default false,
  -- Para tipo 'criterios': [{"nome": "Agachamento", "max": 3}, ...]
  criterios      jsonb,
  protocolo      text,
  padrao         boolean not null default false,  -- veio pré-cadastrado
  ativo          boolean not null default true,   -- faz parte da bateria em uso
  ordem          int not null default 100,
  tabela_padrao_id uuid,
  criado_em      timestamptz not null default now(),
  check (tipo = 'numerico' or jsonb_typeof(criterios) = 'array')
);

-- ---------------------------------------------------------------------
-- Tabelas de referência (normas) com citação obrigatória
-- ---------------------------------------------------------------------
create table public.tabelas_referencia (
  id              uuid primary key default gen_random_uuid(),
  teste_id        uuid not null references public.testes (id) on delete cascade,
  nome            text not null,
  populacao       text not null,
  tipo            public.tipo_tabela not null,
  citacao         text not null check (length(trim(citacao)) >= 10),
  doi_url         text,
  ano             int check (ano between 1900 and 2100),
  nivel_confianca public.nivel_confianca not null,
  observacoes     text,
  criado_por      uuid references public.perfis (id) on delete set null,
  criado_em       timestamptz not null default now()
);

alter table public.testes
  add constraint testes_tabela_padrao_fk foreign key (tabela_padrao_id)
  references public.tabelas_referencia (id) on delete set null;

create table public.faixas_referencia (
  id         uuid primary key default gen_random_uuid(),
  tabela_id  uuid not null references public.tabelas_referencia (id) on delete cascade,
  sexo       public.sexo_biologico not null,
  idade_min  numeric(5,2) not null,
  idade_max  numeric(5,2) not null,
  -- percentil: {"P5": 10.2, "P50": 15.0, ...}; zona: {"zonas": [{"rotulo","min","max"}]}
  valores    jsonb not null,
  check (idade_max > idade_min),
  -- Faixas etárias não podem se sobrepor dentro da mesma tabela e sexo
  exclude using gist (
    tabela_id with =, sexo with =, numrange(idade_min, idade_max, '[)') with &&
  )
);

-- A tabela padrão de um teste precisa ser do próprio teste
create or replace function public.verificar_tabela_padrao()
returns trigger language plpgsql as $$
begin
  if new.tabela_padrao_id is not null and not exists (
    select 1 from public.tabelas_referencia where id = new.tabela_padrao_id and teste_id = new.id
  ) then
    raise exception 'A tabela padrão deve pertencer ao mesmo teste' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger trg_testes_tabela_padrao before insert or update of tabela_padrao_id on public.testes
  for each row execute function public.verificar_tabela_padrao();

-- ---------------------------------------------------------------------
-- Avaliações e resultados
-- ---------------------------------------------------------------------
create table public.avaliacoes (
  id                 uuid primary key default gen_random_uuid(),
  aluno_id           uuid not null references public.alunos (id) on delete cascade,
  data               date not null,
  avaliador_id       uuid references public.perfis (id) on delete set null,
  massa_kg           numeric(5,2) check (massa_kg between 10 and 200),
  estatura_cm        numeric(5,1) check (estatura_cm between 80 and 230),
  altura_sentado_cm  numeric(5,1) check (altura_sentado_cm between 40 and 130),
  envergadura_cm     numeric(5,1) check (envergadura_cm between 80 and 250),
  observacoes        text,
  -- Quando preenchido, o responsável (e o aluno) passam a ver a avaliação
  publicada_em       timestamptz,
  criado_em          timestamptz not null default now(),
  check (altura_sentado_cm is null or estatura_cm is null or altura_sentado_cm < estatura_cm)
);
create index avaliacoes_aluno_idx on public.avaliacoes (aluno_id, data desc);

create table public.resultados_testes (
  id            uuid primary key default gen_random_uuid(),
  avaliacao_id  uuid not null references public.avaliacoes (id) on delete cascade,
  teste_id      uuid not null references public.testes (id) on delete restrict,
  lado          public.lado_teste not null default 'unico',
  tentativas    numeric[] not null default '{}',
  valor         numeric not null,  -- valor que conta (melhor/média, ou soma dos critérios)
  criterios     jsonb,             -- pontuação por critério, quando tipo = 'criterios'
  unique (avaliacao_id, teste_id, lado)
);
create index resultados_teste_idx on public.resultados_testes (teste_id);

-- Envio de relatórios (auditoria)
create table public.relatorios_enviados (
  id            bigint generated always as identity primary key,
  avaliacao_id  uuid not null references public.avaliacoes (id) on delete cascade,
  enviado_para  text not null,
  enviado_por   uuid references public.perfis (id) on delete set null,
  enviado_em    timestamptz not null default now()
);

create trigger trg_familia_atualizado before update on public.alunos_familia
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Média da turma ANONIMIZADA: último resultado de cada aluno ativo do
-- mesmo sexo e idade (anos completos). Só retorna com n ≥ 3, para que
-- não seja possível deduzir o resultado de um colega.
-- ---------------------------------------------------------------------
create or replace function public.media_turma(
  p_teste_id uuid, p_sexo public.sexo_biologico, p_idade int, p_lado public.lado_teste default 'unico'
)
returns table (media numeric, n int)
language sql
stable
security definer
set search_path = public
as $$
  with ultimos as (
    select distinct on (a.aluno_id) r.valor
    from public.resultados_testes r
    join public.avaliacoes a on a.id = r.avaliacao_id
    join public.alunos al on al.id = a.aluno_id
    where r.teste_id = p_teste_id
      and r.lado = p_lado
      and al.sexo_biologico = p_sexo
      and al.status = 'ativo'
      and extract(year from age(a.data, al.data_nascimento))::int = p_idade
    order by a.aluno_id, a.data desc
  )
  select round(avg(valor), 2), count(*)::int from ultimos
  having count(*) >= 3;
$$;
revoke execute on function public.media_turma from public, anon;
grant execute on function public.media_turma to authenticated;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.parametros                enable row level security;
alter table public.khamis_roche_coeficientes enable row level security;
alter table public.alunos_familia            enable row level security;
alter table public.testes                    enable row level security;
alter table public.tabelas_referencia        enable row level security;
alter table public.faixas_referencia         enable row level security;
alter table public.avaliacoes                enable row level security;
alter table public.resultados_testes         enable row level security;
alter table public.relatorios_enviados       enable row level security;

-- Referências científicas: leitura por qualquer logado (relatórios citam a fonte); escrita admin
create policy parametros_leitura on public.parametros for select to authenticated using (true);
create policy parametros_admin on public.parametros for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());
create policy kr_leitura on public.khamis_roche_coeficientes for select to authenticated using (true);
create policy kr_admin on public.khamis_roche_coeficientes for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());
create policy testes_leitura on public.testes for select to authenticated using (true);
create policy testes_admin on public.testes for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());
create policy tabelas_leitura on public.tabelas_referencia for select to authenticated using (true);
create policy tabelas_admin on public.tabelas_referencia for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());
create policy faixas_leitura on public.faixas_referencia for select to authenticated using (true);
create policy faixas_admin on public.faixas_referencia for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- Família: treinador gerencia; responsável lê
create policy familia_admin on public.alunos_familia for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());
create policy familia_responsavel on public.alunos_familia for select to authenticated
  using (public.eh_responsavel_de(aluno_id));

-- Avaliações: treinador só registra com consentimento de dados VÁLIDO
create policy avaliacoes_admin_le on public.avaliacoes for select to authenticated
  using (public.eh_admin());
create policy avaliacoes_admin_escreve on public.avaliacoes for insert to authenticated
  with check (public.eh_admin() and public.tem_consentimento(aluno_id, 'dados_menor'));
create policy avaliacoes_admin_altera on public.avaliacoes for update to authenticated
  using (public.eh_admin())
  with check (public.eh_admin() and public.tem_consentimento(aluno_id, 'dados_menor'));
create policy avaliacoes_admin_apaga on public.avaliacoes for delete to authenticated
  using (public.eh_admin());
-- Família vê só as publicadas
create policy avaliacoes_familia on public.avaliacoes for select to authenticated
  using (
    publicada_em is not null
    and (public.eh_responsavel_de(aluno_id) or public.eh_o_proprio_aluno(aluno_id))
  );

create or replace function public.pode_ver_avaliacao(p_avaliacao_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.avaliacoes a
    where a.id = p_avaliacao_id
      and (
        public.eh_admin()
        or (a.publicada_em is not null
            and (public.eh_responsavel_de(a.aluno_id) or public.eh_o_proprio_aluno(a.aluno_id)))
      )
  );
$$;

create policy resultados_admin on public.resultados_testes for all to authenticated
  using (public.eh_admin())
  with check (
    public.eh_admin() and exists (
      select 1 from public.avaliacoes a
      where a.id = avaliacao_id and public.tem_consentimento(a.aluno_id, 'dados_menor')
    )
  );
create policy resultados_familia on public.resultados_testes for select to authenticated
  using (public.pode_ver_avaliacao(avaliacao_id));

create policy relatorios_admin on public.relatorios_enviados for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- ---------------------------------------------------------------------
-- Bateria pré-cadastrada (protocolos e unidades; SEM valores normativos)
-- O treinador revisa protocolo, número de tentativas e ativa/desativa.
-- ---------------------------------------------------------------------
insert into public.testes (codigo, nome, categoria, unidade, maior_melhor, tentativas, criterio, por_lado, padrao, ordem, protocolo) values
 ('preensao_manual', 'Preensão manual', 'força', 'kgf', true, 2, 'melhor', true, true, 10,
  'Dinamômetro ajustado ao tamanho da mão. Em pé, braço estendido ao lado do corpo. Contração máxima de ~3 s. Registrar cada mão.'),
 ('cmj', 'Salto vertical com contramovimento (CMJ)', 'potência', 'cm', true, 3, 'melhor', false, true, 20,
  'Mãos na cintura, agachamento rápido seguido de salto máximo. Plataforma de contato ou aplicativo validado.'),
 ('salto_horizontal', 'Salto horizontal', 'potência', 'cm', true, 2, 'melhor', false, true, 30,
  'Pés paralelos atrás da linha, salto à frente com os dois pés. Medir até o calcanhar mais próximo da linha.'),
 ('sprint_10m', 'Sprint 10 m', 'velocidade', 's', false, 2, 'melhor', false, true, 40,
  'Saída parada, 30 cm atrás da linha. Fotocélulas, se possível.'),
 ('sprint_20m', 'Sprint 20 m', 'velocidade', 's', false, 2, 'melhor', false, true, 50,
  'Saída parada, 30 cm atrás da linha. Fotocélulas, se possível.'),
 ('agilidade_4x10', 'Agilidade 4×10 m', 'agilidade', 's', false, 2, 'melhor', false, true, 60,
  'Corrida de ida e volta 4 × 10 m conforme o protocolo da bateria adotada.'),
 ('agilidade_505', 'Agilidade 505', 'agilidade', 's', false, 2, 'melhor', true, true, 70,
  'Mudança de direção de 180° na marca de 15 m; tempo nos 5 m antes e depois da virada. Registrar virada pela direita e pela esquerda.'),
 ('vai_vem_20m', 'Corrida de vai-e-vem de 20 m', 'resistência', 'estágio', true, 1, 'melhor', false, true, 80,
  'Protocolo de Léger et al. (1988): início a 8,5 km/h, +0,5 km/h por estágio de 1 min. Registrar o último estágio alcançado (meio estágio = 0,5).'),
 ('sentar_alcancar', 'Sentar e alcançar', 'flexibilidade', 'cm', true, 2, 'melhor', false, true, 90,
  'Banco de Wells. Informar no protocolo se o zero do banco está nos pés ou deslocado.'),
 ('abdominal_1min', 'Abdominal em 1 minuto', 'resistência muscular', 'repetições', true, 1, 'melhor', false, true, 100,
  'Joelhos flexionados, pés apoiados e fixados. Contar repetições completas em 60 s.'),
 ('flexao_braco', 'Flexão de braço', 'resistência muscular', 'repetições', true, 1, 'melhor', false, true, 110,
  'Definir o protocolo (cadência ou máximo de repetições) e mantê-lo entre avaliações.');

insert into public.testes (codigo, nome, categoria, unidade, tipo, maior_melhor, tentativas, criterio, por_lado, padrao, ordem, criterios, protocolo) values
 ('qualidade_movimento', 'Qualidade de movimento', 'competência motora', 'pontos', 'criterios', true, 1, 'melhor', false, true, 120,
  '[{"nome":"Agachamento","max":3},{"nome":"Hop unipodal direito","max":3},{"nome":"Hop unipodal esquerdo","max":3},{"nome":"Estabilidade","max":3}]',
  'Critérios e escala de pontuação editáveis pelo treinador conforme o instrumento adotado. A soma é o resultado.');
