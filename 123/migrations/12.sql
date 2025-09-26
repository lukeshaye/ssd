-- =====================================================
-- MIGRAÇÃO 12: ADICIONAR HORÁRIOS A PROFISSIONAIS
-- =====================================================
-- Este script adiciona colunas de horário de trabalho e almoço
-- à tabela de profissionais, que estavam faltando.

-- ETAPA 1: Adicionar colunas de horário de trabalho (work)
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS work_start_time TIME;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS work_end_time TIME;

-- ETAPA 2: Adicionar colunas de horário de almoço (lunch)
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS lunch_start_time TIME;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS lunch_end_time TIME;


-- =====================================================
-- COMENTÁRIOS DE DOCUMENTAÇÃO
-- =====================================================
COMMENT ON COLUMN public.professionals.work_start_time IS 'Horário de início do expediente do profissional.';
COMMENT ON COLUMN public.professionals.work_end_time IS 'Horário de término do expediente do profissional.';
COMMENT ON COLUMN public.professionals.lunch_start_time IS 'Horário de início do almoço do profissional.';
COMMENT ON COLUMN public.professionals.lunch_end_time IS 'Horário de término do almoço do profissional.';
