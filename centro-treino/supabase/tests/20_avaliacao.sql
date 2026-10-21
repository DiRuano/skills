-- Testes da Fase 2 (reaproveita os usuários e alunos criados em 10_rls.sql).
-- Aluno Um (1111…) TEM consentimento; Aluna Dois (2222…) NÃO tem.

do $$ begin
  assert (select count(*) from testes where padrao) = 12, 'bateria pré-cadastrada';
  assert (select count(*) from tabelas_referencia) = 0, 'nenhuma norma semeada';
  assert (select count(*) from faixas_referencia) = 0, 'nenhuma faixa semeada';
end $$;

-- ---------- Treinador ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

-- Sem consentimento: não registra avaliação
do $$ begin
  begin
    insert into avaliacoes (aluno_id, data) values ('22222222-2222-2222-2222-222222222222', current_date);
    raise exception 'FALHOU: avaliou aluno sem consentimento';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Com consentimento: registra avaliação (não publicada) e resultado
insert into avaliacoes (id, aluno_id, data, massa_kg, estatura_cm, altura_sentado_cm)
values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', current_date, 45, 155, 80);
insert into resultados_testes (avaliacao_id, teste_id, tentativas, valor)
select 'aaaaaaaa-0000-0000-0000-000000000001', id, '{30,32}', 32 from testes where codigo = 'cmj';

-- Altura sentado maior que estatura: rejeitada
do $$ begin
  begin
    insert into avaliacoes (aluno_id, data, estatura_cm, altura_sentado_cm)
    values ('11111111-1111-1111-1111-111111111111', current_date, 100, 120);
    raise exception 'FALHOU: aceitou altura sentado > estatura';
  exception when check_violation then null;
  end;
end $$;

-- Tabela de referência exige citação; faixas não se sobrepõem
do $$
declare v_tab uuid; v_teste uuid;
begin
  select id into v_teste from testes where codigo = 'cmj';
  begin
    insert into tabelas_referencia (teste_id, nome, populacao, tipo, citacao, nivel_confianca)
    values (v_teste, 'X', 'Y', 'percentil', '', 'local');
    raise exception 'FALHOU: tabela sem citação';
  exception when check_violation then null;
  end;
  insert into tabelas_referencia (teste_id, nome, populacao, tipo, citacao, nivel_confianca)
  values (v_teste, 'Teste', 'Fictícia', 'percentil', 'Referência fictícia de teste, 2026', 'local')
  returning id into v_tab;
  insert into faixas_referencia (tabela_id, sexo, idade_min, idade_max, valores)
  values (v_tab, 'M', 12, 13, '{"P10":1,"P90":2}');
  begin
    insert into faixas_referencia (tabela_id, sexo, idade_min, idade_max, valores)
    values (v_tab, 'M', 12.5, 14, '{"P10":1,"P90":2}');
    raise exception 'FALHOU: faixas sobrepostas';
  exception when exclusion_violation then null;
  end;
  -- Mesmo intervalo no outro sexo é permitido; faixa adjacente também
  insert into faixas_referencia (tabela_id, sexo, idade_min, idade_max, valores)
  values (v_tab, 'F', 12, 13, '{"P10":1,"P90":2}'), (v_tab, 'M', 13, 14, '{"P10":1,"P90":2}');
  update testes set tabela_padrao_id = v_tab where id = v_teste;
  -- Tabela de outro teste não pode ser padrão
  begin
    update testes set tabela_padrao_id = v_tab where codigo = 'sprint_10m';
    raise exception 'FALHOU: tabela padrão de outro teste';
  exception when check_violation then null;
  end;
end $$;

-- Média da turma: com 1 aluno, não revela nada
do $$ begin
  assert (select count(*) from media_turma((select id from testes where codigo = 'cmj'), 'M', 13)) = 0,
    'média da turma exige n >= 3';
end $$;
reset role;

-- ---------- Responsável: só vê avaliação publicada ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
do $$ begin
  assert (select count(*) from avaliacoes) = 0, 'não publicada fica oculta';
  assert (select count(*) from resultados_testes) = 0;
  assert (select count(*) from testes) > 0, 'catálogo legível';
end $$;
-- Não escreve
do $$ begin
  begin
    insert into avaliacoes (aluno_id, data) values ('11111111-1111-1111-1111-111111111111', current_date);
    raise exception 'FALHOU: responsável criou avaliação';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

update avaliacoes set publicada_em = now() where id = 'aaaaaaaa-0000-0000-0000-000000000001';

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
do $$ begin
  assert (select count(*) from avaliacoes) = 1, 'publicada fica visível';
  assert (select count(*) from resultados_testes) = 1;
end $$;
reset role;

-- Responsável de outro aluno não vê
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  assert (select count(*) from avaliacoes) = 0, 'outro responsável não vê';
end $$;
reset role;

-- Média com 3 alunos ativos de mesma idade/sexo aparece
do $$
declare v_teste uuid; i int; v_aluno uuid; v_av uuid; v_termo uuid;
begin
  select id into v_teste from testes where codigo = 'cmj';
  select id into v_termo from termos where tipo = 'dados_menor' and vigente;
  for i in 1..2 loop
    insert into alunos (nome, data_nascimento, sexo_biologico)
    values ('Extra ' || i, (now() - interval '13 years 2 months')::date, 'M') returning id into v_aluno;
    insert into responsaveis_alunos (responsavel_id, aluno_id) values ('00000000-0000-0000-0000-0000000000b2', v_aluno);
    insert into consentimentos (aluno_id, concedido_por, qualidade, termo_id, concedido)
    values (v_aluno, '00000000-0000-0000-0000-0000000000b2', 'responsavel', v_termo, true);
    insert into avaliacoes (aluno_id, data) values (v_aluno, current_date) returning id into v_av;
    insert into resultados_testes (avaliacao_id, teste_id, valor) values (v_av, v_teste, 30 + i);
  end loop;
  assert (select n from media_turma(v_teste, 'M', 13)) = 3, 'n = 3';
  assert (select media from media_turma(v_teste, 'M', 13)) = 31.67, 'média (32+31+32)/3';
end $$;

-- Sanidade: asserts estão ligados
do $$ begin
  begin
    assert false, 'x';
    raise exception 'FALHOU: asserts desligados (plpgsql.check_asserts)';
  exception when assert_failure then null;
  end;
end $$;
