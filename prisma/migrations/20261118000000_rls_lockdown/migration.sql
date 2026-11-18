-- Defesa em profundidade: liga Row Level Security em todas as tabelas SEM políticas.
-- Efeito: a API automática do Supabase (PostgREST, chaves anon/authenticated) não lê nem grava nada.
-- O app conecta como dono das tabelas (Prisma), que ignora RLS — o isolamento entre
-- eletricistas é aplicado no servidor em toda consulta (filtro obrigatório por userId).
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations' LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
