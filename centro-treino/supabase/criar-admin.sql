-- Promove um usuário já criado no Supabase Auth a treinador/admin.
-- Rode no SQL Editor do Supabase trocando o e-mail.
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"papel":"admin"}'
 where email = 'treinador@seucentro.com.br';

update public.perfis set papel = 'admin' where email = 'treinador@seucentro.com.br';
