-- ═══════════════════════════════════════════════════════════════
--  SIFAU — Schema Completo v2 (Simplificado)
--  
--  INSTRUÇÕES:
--  1. Vá em supabase.com → Seu projeto → SQL Editor
--  2. Cole TODO este conteúdo
--  3. Clique "Run" ▶️
--  4. Deve aparecer "Success"
-- ═══════════════════════════════════════════════════════════════

-- LIMPAR TUDO PRIMEIRO (ordem importa por causa das foreign keys)
DROP TABLE IF EXISTS notificacoes;
DROP TABLE IF EXISTS mensagens;
DROP TABLE IF EXISTS fotos;
DROP TABLE IF EXISTS historico_atividades;
DROP TABLE IF EXISTS autos_infracao;
DROP TABLE IF EXISTS relatorios;
DROP TABLE IF EXISTS denuncias;
DROP TABLE IF EXISTS profiles;

-- ─── TABELA: PROFILES ────────────────────────────────────────
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  matricula TEXT UNIQUE,
  senha TEXT,
  status TEXT DEFAULT 'offline',
  pontos INTEGER DEFAULT 0,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TABELA: DENUNCIAS ───────────────────────────────────────
CREATE TABLE denuncias (
  id TEXT PRIMARY KEY,
  protocolo TEXT UNIQUE NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  endereco TEXT,
  latitude DOUBLE PRECISION DEFAULT 0,
  longitude DOUBLE PRECISION DEFAULT 0,
  status TEXT DEFAULT 'pendente',
  denunciante_nome TEXT,
  denunciante_anonimo BOOLEAN DEFAULT false,
  fiscal_id TEXT,
  gerente_id TEXT,
  sla_horas INTEGER DEFAULT 72,
  pontos_provisorio INTEGER DEFAULT 0,
  motivo_rejeicao TEXT,
  auth_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TABELA: RELATÓRIOS ──────────────────────────────────────
CREATE TABLE relatorios (
  id TEXT PRIMARY KEY,
  denuncia_id TEXT,
  fiscal_id TEXT,
  texto TEXT,
  assinatura_base64 TEXT,
  dados_extras JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TABELA: AUTOS DE INFRAÇÃO ───────────────────────────────
CREATE TABLE autos_infracao (
  id TEXT PRIMARY KEY,
  denuncia_id TEXT,
  fiscal_id TEXT,
  tipo TEXT,
  valor DECIMAL(12,2),
  embargo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TABELA: HISTÓRICO ───────────────────────────────────────
CREATE TABLE historico_atividades (
  id TEXT PRIMARY KEY,
  fiscal_id TEXT,
  denuncia_id TEXT,
  tipo TEXT,
  descricao TEXT,
  pontos INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TABELA: FOTOS ───────────────────────────────────────────
CREATE TABLE fotos (
  id TEXT PRIMARY KEY,
  denuncia_id TEXT,
  base64 TEXT,
  tipo TEXT DEFAULT 'denuncia',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TABELA: MENSAGENS ──────────────────────────────────────
CREATE TABLE mensagens (
  id TEXT PRIMARY KEY,
  de_id TEXT,
  para_id TEXT,
  de_nome TEXT,
  para_nome TEXT,
  texto TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  denuncia_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TABELA: NOTIFICAÇÕES ───────────────────────────────────
CREATE TABLE notificacoes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  mensagem TEXT,
  tipo TEXT DEFAULT 'info',
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TABELA: USER ACCOUNTS (Registro por email) ─────────────
DROP TABLE IF EXISTS user_accounts;
CREATE TABLE user_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  provider TEXT DEFAULT 'email',
  primeiro_acesso TIMESTAMPTZ DEFAULT now(),
  ultimo_acesso TIMESTAMPTZ DEFAULT now(),
  total_acessos INTEGER DEFAULT 1,
  dispositivo TEXT,
  scheduled_deletion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
--  ÍNDICES
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX idx_den_status ON denuncias(status);
CREATE INDEX idx_den_fiscal ON denuncias(fiscal_id);
CREATE INDEX idx_den_proto ON denuncias(protocolo);
CREATE INDEX idx_msg_de ON mensagens(de_id);
CREATE INDEX idx_msg_para ON mensagens(para_id);
CREATE INDEX idx_hist_fiscal ON historico_atividades(fiscal_id);
CREATE INDEX idx_den_email ON denuncias(auth_email);
CREATE INDEX idx_ua_email ON user_accounts(email);

-- ═══════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (Desabilitar para simplicidade)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE denuncias ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE autos_infracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Permitir TUDO para anon (app interno sem auth)
CREATE POLICY "allow_all" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON denuncias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON relatorios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON autos_infracao FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON historico_atividades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON fotos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON mensagens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON notificacoes FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON user_accounts FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
--  INSERIR USUÁRIOS
-- ═══════════════════════════════════════════════════════════════
INSERT INTO profiles (id, nome, tipo, matricula, senha, status, pontos) VALUES
  ('ger-001', 'Marconi',            'gerente', 'GER-001', 'marconi2026',   'offline', 0),
  ('fsc-001', 'Marie',              'fiscal',  'FSC-001', 'marie2026',     'offline', 0),
  ('fsc-002', 'Balbino',            'fiscal',  'FSC-002', 'balbino2026',   'offline', 0),
  ('fsc-003', 'Demétrius',          'fiscal',  'FSC-003', 'demetrius2026', 'offline', 0),
  ('fsc-004', 'Kamila Queiroz',     'fiscal',  'FSC-004', 'kamila2026',    'offline', 0),
  ('fsc-005', 'Evanisio Lopes',     'fiscal',  'FSC-005', 'evanisio2026',  'offline', 0),
  ('fsc-006', 'Iris',               'fiscal',  'FSC-006', 'iris2026',      'offline', 0),
  ('fsc-007', 'Paulo Karas',        'fiscal',  'FSC-007', 'paulo2026',     'offline', 0),
  ('fsc-008', 'Adriana Gondim',     'fiscal',  'FSC-008', 'adriana2026',   'offline', 0),
  ('fsc-009', 'André',              'fiscal',  'FSC-009', 'andre2026',     'offline', 0),
  ('fsc-010', 'Rebeca Cavalcanti',  'fiscal',  'FSC-010', 'rebeca2026',    'offline', 0),
  ('fsc-011', 'Gissieri',           'fiscal',  'FSC-011', 'gissieri2026',  'offline', 0),
  ('fsc-012', 'Edson',              'fiscal',  'FSC-012', 'edson2026',     'offline', 0);

-- ═══════════════════════════════════════════════════════════════
--  REALTIME (Habilitar notificações em tempo real)
-- ═══════════════════════════════════════════════════════════════

-- Remover das publicações caso já existam (evita erro de duplicata)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS mensagens;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS denuncias;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS profiles;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE denuncias;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- ═══════════════════════════════════════════════════════════════
--  ✅ PRONTO! Verifique em "Table Editor" que há 8 tabelas
--  e que "profiles" tem 13 linhas (1 gerente + 12 fiscais).
-- ═══════════════════════════════════════════════════════════════
