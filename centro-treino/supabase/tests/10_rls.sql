-- Testes de regras de negócio e RLS da Fase 1.
-- Cada bloco falha com exceção se a regra for violada.

-- ---------- Preparação (como superusuário) ----------
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a', 'treinador@teste', '{"papel":"admin"}', '{"nome":"Treinador"}'),
 ('00000000-0000-0000-0000-0000000000b1', 'mae1@teste',      '{}',                '{"nome":"Mãe 1"}'),
 ('00000000-0000-0000-0000-0000000000b2', 'pai2@teste',      '{}',                '{"nome":"Pai 2"}'),
 -- Tenta se promover via user_metadata: deve virar 'responsavel'
 ('00000000-0000-0000-0000-0000000000e1', 'esperto@teste',   '{}',                '{"nome":"X","papel":"admin"}'),
 ('00000000-0000-0000-0000-0000000000c1', 'aluno1@teste',    '{"papel":"aluno"}', '{"nome":"Aluno 1"}');

do $$ begin
  assert (select papel from perfis where email = 'treinador@teste') = 'admin', 'admin via app_metadata';
  assert (select papel from perfis where email = 'esperto@teste') = 'responsavel', 'user_metadata não pode definir papel';
  assert (select papel from perfis where email = 'aluno1@teste') = 'aluno', 'aluno via app_metadata';
end $$;

-- Menor sem responsável: deve falhar no commit
do $$ begin
  begin
    insert into alunos (id, nome, data_nascimento, sexo_biologico)
    values (gen_random_uuid(), 'Sem Responsável', (now() - interval '12 years')::date, 'M');
    set constraints all immediate;
    raise exception 'FALHOU: menor sem responsável foi aceito';
  exception when check_violation then null;
  end;
end $$;

-- Maior de 18 sem responsável: permitido
insert into alunos (nome, data_nascimento, sexo_biologico)
values ('Adulto Independente', (now() - interval '19 years')::date, 'F');

-- Aluno 1 (filho da Mãe 1) e Aluno 2 (filho do Pai 2), na mesma transação
begin;
insert into alunos (id, nome, data_nascimento, sexo_biologico, usuario_id) values
 ('11111111-1111-1111-1111-111111111111', 'Aluno Um',  (now() - interval '13 years')::date, 'M',
  '00000000-0000-0000-0000-0000000000c1'),
 ('22222222-2222-2222-2222-222222222222', 'Aluna Dois', (now() - interval '10 years')::date, 'F', null);
insert into responsaveis_alunos (responsavel_id, aluno_id, principal) values
 ('00000000-0000-0000-0000-0000000000b1', '11111111-1111-1111-1111-111111111111', true),
 ('00000000-0000-0000-0000-0000000000b2', '22222222-2222-2222-2222-222222222222', true);
insert into alunos_saude (aluno_id, historico_lesoes_cifrado) values
 ('11111111-1111-1111-1111-111111111111', 'v1:cifrado'),
 ('22222222-2222-2222-2222-222222222222', 'v1:cifrado');
commit;

-- Remover o único responsável de um menor: deve falhar
do $$ begin
  begin
    delete from responsaveis_alunos where aluno_id = '22222222-2222-2222-2222-222222222222';
    set constraints all immediate;
    raise exception 'FALHOU: removeu único responsável de menor';
  exception when check_violation then null;
  end;
end $$;

-- Consentimento: começa aguardando; ao conceder vira ativo; ao revogar volta
do $$
declare v_termo uuid;
begin
  assert (select status from alunos where id = '11111111-1111-1111-1111-111111111111') = 'aguardando_consentimento';
  select id into v_termo from termos where tipo = 'dados_menor' and vigente;
  insert into consentimentos (aluno_id, concedido_por, qualidade, termo_id, concedido, ip)
  values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000b1',
          'responsavel', v_termo, true, '200.1.2.3');
  assert (select status from alunos where id = '11111111-1111-1111-1111-111111111111') = 'ativo', 'ativa ao consentir';
  assert tem_consentimento('11111111-1111-1111-1111-111111111111', 'dados_menor');
  assert not tem_consentimento('11111111-1111-1111-1111-111111111111', 'imagem'), 'imagem é separado';
end $$;

-- Consentimento é imutável
do $$ begin
  begin
    update consentimentos set concedido = false;
    raise exception 'FALHOU: consentimento foi alterado';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
end $$;

-- ---------- Como RESPONSÁVEL 1 ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
do $$ begin
  assert (select count(*) from alunos) = 1, 'responsável vê só o próprio filho';
  assert (select nome from alunos) = 'Aluno Um';
  assert (select count(*) from alunos_saude) = 0, 'responsável NÃO lê saúde diretamente';
  assert (select count(*) from perfis) = 2, 'vê o próprio perfil e o do filho com login';
  assert (select count(*) from consentimentos) = 1, 'vê consentimentos do filho';
  assert (select count(*) from logs_acesso) = 0;
  assert (select count(*) from termos) = 4, 'termos são legíveis';
end $$;

-- Não pode se promover a admin
do $$ begin
  begin
    update perfis set papel = 'admin' where id = auth.uid();
    raise exception 'FALHOU: responsável alterou o próprio papel';
  exception when insufficient_privilege then null;
  end;
end $$;
-- Pode alterar o próprio nome
update perfis set nome = 'Mãe Um' where id = auth.uid();

-- Não pode inserir consentimento direto (só via servidor)
do $$ begin
  begin
    insert into consentimentos (aluno_id, concedido_por, qualidade, termo_id, concedido)
    select '11111111-1111-1111-1111-111111111111', auth.uid(), 'responsavel', id, true
      from termos where tipo = 'imagem';
    raise exception 'FALHOU: cliente inseriu consentimento';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Não pode editar aluno nem criar vínculo com filho alheio
do $$
declare n int;
begin
  update alunos set nome = 'Hack' where true;
  get diagnostics n = row_count;
  assert n = 0, 'responsável não edita aluno';
  begin
    insert into responsaveis_alunos (responsavel_id, aluno_id)
    values (auth.uid(), '22222222-2222-2222-2222-222222222222');
    raise exception 'FALHOU: criou vínculo com filho alheio';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Pode pedir exclusão do próprio filho, não do alheio
insert into solicitacoes_exclusao (aluno_id, aluno_nome, solicitante_id)
values ('11111111-1111-1111-1111-111111111111', 'Aluno Um', auth.uid());
do $$ begin
  begin
    insert into solicitacoes_exclusao (aluno_id, aluno_nome, solicitante_id)
    values ('22222222-2222-2222-2222-222222222222', 'Aluna Dois', auth.uid());
    raise exception 'FALHOU: pediu exclusão de filho alheio';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Registro de acesso via função
do $$ begin perform registrar_acesso('11111111-1111-1111-1111-111111111111', 'exportacao_dados', 'exportacao'); end $$;
reset role;

-- ---------- Como ALUNO 1 ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
do $$ begin
  assert (select count(*) from alunos) = 1, 'aluno vê só a si mesmo';
  assert (select count(*) from alunos_saude) = 0, 'aluno não lê saúde';
  assert (select count(*) from responsaveis_alunos) = 0;
end $$;
reset role;

-- ---------- Como ANÔNIMO ----------
set role anon;
set request.jwt.claim.sub = '';
do $$ begin
  assert (select count(*) from termos) = 4, 'termos públicos';
end $$;
do $$ begin
  assert (select count(*) from alunos) = 0, 'anônimo não lê alunos';
  assert (select count(*) from perfis) = 0, 'anônimo não lê perfis';
end $$;
reset role;

-- ---------- Como TREINADOR ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from alunos) = 3, 'admin vê todos';
  assert (select count(*) from alunos_saude) = 2, 'admin lê saúde';
  assert (select count(*) from logs_acesso) = 1, 'admin lê logs';
  assert (select count(*) from solicitacoes_exclusao) = 1;
end $$;
-- Admin não tem política de delete em logs: nada é apagado
do $$
declare n int;
begin
  delete from logs_acesso;
  get diagnostics n = row_count;
  assert n = 0, 'admin não apaga logs';
end $$;
reset role;

-- Nem o superusuário altera log (gatilho)
do $$ begin
  begin
    delete from logs_acesso;
    raise exception 'FALHOU: log apagado';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
end $$;

-- ---------- RPC criar_aluno ----------
-- Responsável não pode usar
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
do $$ begin
  begin
    perform criar_aluno('Intruso', (now() - interval '12 years')::date, 'M', null, null,
                        auth.uid(), null, null, null, null);
    raise exception 'FALHOU: responsável criou aluno';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Treinador cria menor com responsável e saúde, tudo atômico
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
declare v uuid;
begin
  v := criar_aluno('Aluno Três', (now() - interval '11 years')::date, 'M', 'Futebol', 'direito',
                   '00000000-0000-0000-0000-0000000000b2', 'pai', null, 'v1:x', null);
  assert (select criado_por from alunos where id = v) = auth.uid();
  assert exists (select 1 from responsaveis_alunos where aluno_id = v and principal);
  assert exists (select 1 from alunos_saude where aluno_id = v);
  -- Menor sem responsável: falha ao fim da transação
  begin
    perform criar_aluno('Sem Resp', (now() - interval '9 years')::date, 'F', null, null,
                        null, null, null, null, null);
    set constraints all immediate;
    raise exception 'FALHOU: RPC criou menor sem responsável';
  exception when check_violation then null;
  end;
end $$;
reset role;

