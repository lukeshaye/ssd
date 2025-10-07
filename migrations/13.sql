-- =====================================================
-- MIGRAÇÃO 13: ADICIONAR DATA DE NASCIMENTO E GÊNERO AOS CLIENTES
-- =====================================================

-- Adiciona a coluna birth_date para armazenar a data de nascimento
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS birth_date DATE;
COMMENT ON COLUMN public.clients.birth_date IS 'Data de nascimento do cliente.';

-- Adiciona a coluna gender para armazenar o gênero
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS gender TEXT;
COMMENT ON COLUMN public.clients.gender IS 'Gênero do cliente (masculino, feminino, outro).';
