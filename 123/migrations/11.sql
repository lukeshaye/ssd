-- =====================================================
-- MIGRAÇÃO 11: ADICIONAR CORES A PROFISSIONAIS E SERVIÇOS
-- =====================================================

-- ETAPA 1: Adicionar a coluna 'color' à tabela de profissionais.
-- Usamos IF NOT EXISTS para segurança, caso o passo já tenha sido executado.
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS color TEXT;
COMMENT ON COLUMN public.professionals.color IS 'Cor de identificação do profissional (formato hexadecimal, ex: #8b5cf6)';

-- ETAPA 2: Adicionar a coluna 'color' à tabela de serviços.
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS color TEXT;
COMMENT ON COLUMN public.services.color IS 'Cor de identificação do serviço (formato hexadecimal, ex: #FFFFFF)';

-- ETAPA 3: Atualizar a view para incluir as novas colunas de cor.
-- É crucial recriar a view para que as novas colunas fiquem disponíveis
-- para a aplicação do frontend.

-- Primeiro, removemos a view existente.
DROP VIEW IF EXISTS public.v_appointments_complete;

-- Depois, a recriamos com as colunas professional_color e service_color.
CREATE OR REPLACE VIEW public.v_appointments_complete
WITH (security_invoker = true) -- Mantém a segurança em nível de linha (RLS).
AS
SELECT 
  a.id,
  a.user_id,
  a.client_id,
  c.name AS client_name,
  c.phone AS client_phone,
  c.email AS client_email,
  a.service_id,
  s.name AS service_name,
  s.color AS service_color, -- Cor do serviço adicionada
  a.price,
  a.professional_id,
  p.name AS professional_name,
  p.color AS professional_color, -- Cor do profissional adicionada
  a.appointment_date,
  a.end_date,
  a.attended,
  a.created_at,
  a.updated_at
FROM 
  appointments a
LEFT JOIN 
  clients c ON a.client_id = c.id
LEFT JOIN 
  professionals p ON a.professional_id = p.id
LEFT JOIN 
  services s ON a.service_id = s.id;

-- =====================================================
-- COMENTÁRIOS DE DOCUMENTAÇÃO ADICIONAIS
-- =====================================================
COMMENT ON VIEW public.v_appointments_complete IS 'Visão completa dos agendamentos, incluindo nomes de cliente, profissional, serviço e suas respectivas cores de identificação.';

