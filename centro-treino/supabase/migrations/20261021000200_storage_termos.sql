-- =====================================================================
-- FASE 1 — Storage de fotos e versões iniciais dos termos
-- =====================================================================

-- Bucket privado para fotos de alunos. Caminho: {aluno_id}/{arquivo}
insert into storage.buckets (id, name, public)
values ('fotos-alunos', 'fotos-alunos', false)
on conflict (id) do nothing;

-- Treinador gerencia as fotos
create policy fotos_admin_tudo on storage.objects for all to authenticated
  using (bucket_id = 'fotos-alunos' and public.eh_admin())
  with check (bucket_id = 'fotos-alunos' and public.eh_admin());

-- Responsável e o próprio aluno podem ver a foto
create policy fotos_familia_le on storage.objects for select to authenticated
  using (
    bucket_id = 'fotos-alunos'
    and (
      public.eh_responsavel_de(((storage.foldername(name))[1])::uuid)
      or public.eh_o_proprio_aluno(((storage.foldername(name))[1])::uuid)
    )
  );

-- ---------------------------------------------------------------------
-- Termos — versão 1.0
-- ATENÇÃO: textos-MINUTA. Precisam de revisão jurídica antes de produção.
-- Para publicar nova versão: inserir com vigente=false, depois, numa só
-- transação, marcar a antiga como vigente=false e a nova como true.
-- Quem consentiu na versão antiga passa a ver o pedido de novo aceite.
-- ---------------------------------------------------------------------
insert into public.termos (tipo, versao, titulo, conteudo, vigente) values
('dados_menor', '1.0',
 'Consentimento para tratamento de dados pessoais de criança ou adolescente',
 $t$[MINUTA — revisar com assessoria jurídica antes do uso]

Na qualidade de pai, mãe ou responsável legal, autorizo, de forma específica e destacada (Lei 13.709/2018 — LGPD, art. 14, §1º), o tratamento dos dados pessoais do(a) aluno(a) indicado(a), para as seguintes finalidades:

1. Cadastro e identificação no centro de treinamento.
2. Avaliação física: medidas corporais (massa, estatura, altura sentado), estimativa de maturação biológica e resultados de testes físicos, comparados com referências científicas publicadas.
3. Prescrição e acompanhamento de treinos, incluindo percepção de esforço e relato de dor ou desconforto.
4. Registro de histórico de lesões e observações de saúde relevantes para a segurança do treino.

Dados de saúde são dados sensíveis (art. 11). Eles são acessados somente pela equipe técnica, ficam cifrados no banco de dados e todo acesso é registrado.

Os dados não são vendidos nem compartilhados para fins de publicidade. São compartilhados apenas com prestadores necessários ao funcionamento do serviço (hospedagem, envio de e-mail, processamento de pagamento), sob contrato.

Você pode, a qualquer momento e sem custo: consultar e baixar os dados; corrigi-los; revogar este consentimento; e pedir a exclusão. A revogação suspende novas avaliações e treinos, mas não torna ilegal o tratamento feito antes dela.

Os dados são mantidos enquanto houver vínculo com o centro e, após o encerramento, pelo prazo exigido por lei, sendo depois excluídos ou anonimizados.$t$,
 true),

('imagem', '1.0',
 'Autorização de uso de imagem e vídeo do aluno',
 $t$[MINUTA — revisar com assessoria jurídica antes do uso]

Esta autorização é SEPARADA e OPCIONAL. Recusá-la não impede o aluno de treinar ou ser avaliado.

Autorizo o centro de treinamento a:
1. Armazenar a foto de perfil do(a) aluno(a) no aplicativo, visível apenas para a equipe técnica e para os responsáveis.
2. Gravar vídeos de execução de exercícios e testes do(a) aluno(a) para análise técnica, visíveis apenas para a equipe técnica, para o próprio aluno e para os responsáveis.

Esta autorização NÃO inclui publicação em redes sociais, site ou material de divulgação. Para isso será pedida autorização específica, peça por peça.

Posso revogar esta autorização a qualquer momento. Após a revogação, fotos e vídeos serão excluídos.$t$,
 true),

('termos_uso', '1.0',
 'Termos de uso',
 $t$[MINUTA — revisar com assessoria jurídica antes do uso]

1. O aplicativo apoia o trabalho do centro de treinamento: avaliações físicas, prescrição de treinos e pagamentos.
2. Os resultados de avaliação são comparados com referências científicas indicadas em cada relatório. Eles descrevem o momento do aluno e não são diagnóstico médico.
3. Os treinos devem ser feitos conforme orientação do treinador. Em caso de dor, o aluno deve parar e relatar no aplicativo.
4. O acesso é pessoal. Não compartilhe sua senha.
5. Condições comerciais (planos, cobrança, cancelamento) estão descritas na área de assinatura.$t$,
 true),

('privacidade', '1.0',
 'Política de privacidade',
 $t$[MINUTA — revisar com assessoria jurídica antes do uso]

Quem trata os dados: o centro de treinamento (controlador).

Quais dados: dados de cadastro do aluno e do responsável; medidas corporais e maturação; resultados de testes; registros de treino; histórico de lesões e relatos de dor (sensíveis); dados de pagamento (o cartão é processado pelo gateway de pagamento e nunca é armazenado pelo centro).

Por quê: prestar o serviço contratado de avaliação e treinamento com segurança, com base no consentimento do responsável (art. 14) e na execução de contrato.

Segurança: acesso por perfil (treinador, aluno, responsável), dados de saúde cifrados, registro de acessos a dados sensíveis.

Seus direitos (art. 18): confirmação e acesso, correção, anonimização, portabilidade (download dos dados), exclusão, informação sobre compartilhamento e revogação do consentimento. Use a área "Consentimentos e privacidade" do aplicativo ou fale com o encarregado de dados.

Encarregado (DPO): [preencher nome e e-mail de contato].$t$,
 true);
