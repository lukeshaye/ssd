-- migrations/14.sql

-- Adiciona a tabela para registrar as faltas dos profissionais
CREATE TABLE IF NOT EXISTS professional_absences (
  id SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Adiciona os campos de salário e comissão à tabela de profissionais
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS salary INTEGER, -- Em centavos
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 2); -- Ex: 0.10 para 10%

-- Adiciona a política de segurança para a nova tabela
ALTER TABLE public.professional_absences ENABLE ROW LEVEL SECURITY;

-- ADICIONADO: Remove a política se ela já existir para evitar o erro
DROP POLICY IF EXISTS "Usuários podem gerenciar as faltas de seus profissionais." ON public.professional_absences;

CREATE POLICY "Usuários podem gerenciar as faltas de seus profissionais."
ON public.professional_absences
FOR ALL
USING (auth.uid() = user_id);

-- Adiciona comentários para documentação
COMMENT ON COLUMN professionals.salary IS 'Salário base do profissional, em centavos.';
COMMENT ON COLUMN professionals.commission_rate IS 'Percentual de comissão do profissional sobre os serviços prestados.';
COMMENT ON TABLE professional_absences IS 'Registros de faltas dos profissionais.';
