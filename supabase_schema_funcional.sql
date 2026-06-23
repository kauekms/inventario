-- ============================================================
-- MANAGE INVENTORY — Schema Supabase funcional
-- Execute no Supabase: Dashboard → SQL Editor → New Query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. FUNÇÃO DE UPDATED_AT
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. PRODUTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.produtos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  code          TEXT NOT NULL UNIQUE,
  kind          TEXT NOT NULL DEFAULT 'unitario' CHECK (kind IN ('unitario','kit')),
  emoji         TEXT NOT NULL DEFAULT '📦',
  cost          NUMERIC(12,2) NOT NULL DEFAULT 0,
  package_cost  NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax           TEXT NOT NULL DEFAULT 'Padrão da conta',
  qty           INTEGER NOT NULL DEFAULT 0,
  min           INTEGER NOT NULL DEFAULT 5,
  ads           NUMERIC(12,2) NOT NULL DEFAULT 0,
  sync          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS package_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax TEXT NOT NULL DEFAULT 'Padrão da conta',
  ADD COLUMN IF NOT EXISTS ads NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sync BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS produtos_updated_at ON public.produtos;
CREATE TRIGGER produtos_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. MOVIMENTAÇÕES DE ESTOQUE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.movimentacoes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku_id              UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  sku_name            TEXT NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('entrada','saida')),
  qty                 INTEGER NOT NULL CHECK (qty > 0),
  cost                NUMERIC(12,2) NOT NULL DEFAULT 0,
  note                TEXT NOT NULL DEFAULT '',
  notes               TEXT NOT NULL DEFAULT '',
  previous_qty        INTEGER NOT NULL DEFAULT 0,
  qty_after           INTEGER NOT NULL DEFAULT 0,
  previous_cost       NUMERIC(12,2) NOT NULL DEFAULT 0,
  average_cost_after  NUMERIC(12,2) NOT NULL DEFAULT 0,
  date                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_sku_id ON public.movimentacoes(sku_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_date ON public.movimentacoes(date DESC);

-- ============================================================
-- 4. CARTÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cartoes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT NOT NULL,
  digitos     TEXT NOT NULL,
  limite      NUMERIC(12,2) NOT NULL DEFAULT 0,
  utilizado   NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS cartoes_updated_at ON public.cartoes;
CREATE TRIGGER cartoes_updated_at
BEFORE UPDATE ON public.cartoes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. COMPRAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compras (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku          TEXT NOT NULL,
  compra_nome  TEXT NOT NULL DEFAULT '',
  compra_link  TEXT NOT NULL DEFAULT '',
  cat_nome     TEXT NOT NULL DEFAULT '',
  cat_link     TEXT NOT NULL DEFAULT '',
  qty          INTEGER NOT NULL DEFAULT 1,
  preco        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total        NUMERIC(12,2) NOT NULL DEFAULT 0,
  cartao_id    UUID REFERENCES public.cartoes(id) ON DELETE SET NULL,
  parcelas     INTEGER NOT NULL DEFAULT 1,
  venda        NUMERIC(12,2) NOT NULL DEFAULT 0,
  margem       TEXT NOT NULL DEFAULT '',
  roi          TEXT NOT NULL DEFAULT '',
  date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compras_cartao_id ON public.compras(cartao_id);
CREATE INDEX IF NOT EXISTS idx_compras_date ON public.compras(date DESC);

-- ============================================================
-- 6. LANÇAMENTOS FINANCEIROS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lancamentos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descricao   TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('receita','despesa','fatura')),
  valor       NUMERIC(12,2) NOT NULL DEFAULT 0,
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria   TEXT NOT NULL DEFAULT '',
  cartao_id   UUID REFERENCES public.cartoes(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lancamentos_cartao_id ON public.lancamentos(cartao_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON public.lancamentos(data DESC);

-- ============================================================
-- 7. FUNÇÃO ATÔMICA PARA MOVIMENTAÇÃO DE ESTOQUE
-- Atualiza produto + insere histórico numa única transação.
-- O HTML chama esta função via db.rpc('registrar_movimentacao', ...).
-- ============================================================
CREATE OR REPLACE FUNCTION public.registrar_movimentacao(
  p_sku_id UUID,
  p_type TEXT,
  p_qty INTEGER,
  p_cost NUMERIC DEFAULT 0,
  p_note TEXT DEFAULT '',
  p_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prod public.produtos%ROWTYPE;
  v_new_qty INTEGER;
  v_cost NUMERIC(12,2);
  v_mov_id UUID;
BEGIN
  IF p_type NOT IN ('entrada','saida') THEN
    RAISE EXCEPTION 'Tipo de movimentação inválido: %', p_type;
  END IF;

  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'Quantidade inválida.';
  END IF;

  SELECT * INTO v_prod
  FROM public.produtos
  WHERE id = p_sku_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado.';
  END IF;

  IF p_type = 'saida' AND v_prod.qty < p_qty THEN
    RAISE EXCEPTION 'Estoque insuficiente. Disponível: % unidades.', v_prod.qty;
  END IF;

  v_cost := COALESCE(NULLIF(p_cost, 0), v_prod.cost, 0);

  IF p_type = 'entrada' THEN
    v_new_qty := v_prod.qty + p_qty;

    UPDATE public.produtos
    SET qty = v_new_qty,
        cost = v_cost
    WHERE id = p_sku_id;
  ELSE
    v_new_qty := v_prod.qty - p_qty;

    UPDATE public.produtos
    SET qty = v_new_qty
    WHERE id = p_sku_id;
  END IF;

  INSERT INTO public.movimentacoes (
    sku_id,
    sku_name,
    type,
    qty,
    cost,
    note,
    notes,
    previous_qty,
    qty_after,
    previous_cost,
    average_cost_after,
    date
  )
  VALUES (
    v_prod.id,
    v_prod.name,
    p_type,
    p_qty,
    v_cost,
    COALESCE(p_note, ''),
    COALESCE(p_notes, ''),
    v_prod.qty,
    v_new_qty,
    v_prod.cost,
    CASE WHEN p_type = 'entrada' THEN v_cost ELSE v_prod.cost END,
    NOW()
  )
  RETURNING id INTO v_mov_id;

  RETURN jsonb_build_object(
    'ok', true,
    'sku_id', p_sku_id,
    'movimentacao_id', v_mov_id,
    'qty_after', v_new_qty,
    'cost_after', CASE WHEN p_type = 'entrada' THEN v_cost ELSE v_prod.cost END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_movimentacao(UUID, TEXT, INTEGER, NUMERIC, TEXT, TEXT) TO anon, authenticated;

-- ============================================================
-- 8. RLS
-- Para funcionar sem tela de login, libera anon + authenticated.
-- Em produção com login, troque por políticas usando auth.uid().
-- ============================================================
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_full_access" ON public.produtos;
CREATE POLICY "public_full_access" ON public.produtos
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "public_full_access" ON public.movimentacoes;
CREATE POLICY "public_full_access" ON public.movimentacoes
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "public_full_access" ON public.cartoes;
CREATE POLICY "public_full_access" ON public.cartoes
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "public_full_access" ON public.compras;
CREATE POLICY "public_full_access" ON public.compras
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "public_full_access" ON public.lancamentos;
CREATE POLICY "public_full_access" ON public.lancamentos
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ============================================================
-- 9. VIEWS ÚTEIS
-- ============================================================
CREATE OR REPLACE VIEW public.v_estoque AS
SELECT
  p.id,
  p.name,
  p.code,
  p.kind,
  p.emoji,
  p.qty,
  p.min,
  p.cost,
  p.qty * p.cost AS valor_total,
  CASE
    WHEN p.qty = 0 THEN 'zero'
    WHEN p.qty <= p.min THEN 'low'
    ELSE 'ok'
  END AS status,
  p.created_at,
  p.updated_at
FROM public.produtos p;

CREATE OR REPLACE VIEW public.v_saldo_financeiro AS
SELECT
  COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN l.valor ELSE 0 END), 0) AS total_receitas,
  COALESCE(SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor ELSE 0 END), 0) AS total_despesas_lancamentos,
  COALESCE((SELECT SUM(total) FROM public.compras), 0) AS total_compras,
  COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN l.valor ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.cartao_id IS NULL THEN l.valor ELSE 0 END), 0)
  - COALESCE((SELECT SUM(total) FROM public.compras WHERE cartao_id IS NULL), 0)
  - COALESCE(SUM(CASE WHEN l.tipo = 'fatura' THEN l.valor ELSE 0 END), 0) AS saldo_caixa
FROM public.lancamentos l;
