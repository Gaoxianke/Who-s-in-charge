-- 敏感词汇库
CREATE TABLE public.sensitive_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text UNIQUE NOT NULL,
  created_by uuid REFERENCES public.admin_users(user_id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sensitive_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sensitive_words_admin_all" ON public.sensitive_words FOR ALL
  TO authenticated USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());

-- 列出敏感词（分页）
CREATE OR REPLACE FUNCTION public.admin_list_sensitive_words(
  p_limit int DEFAULT 100, p_offset int DEFAULT 0
)
RETURNS TABLE(id uuid, word text, created_by_email text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT sw.id, sw.word, sw.created_by_email, sw.created_at
    FROM sensitive_words sw
   ORDER BY sw.created_at DESC
   LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 添加敏感词
CREATE OR REPLACE FUNCTION public.admin_add_sensitive_word(p_word text)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_word text;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_word := lower(trim(p_word));
  IF v_word = '' OR length(v_word) > 50 THEN
    RETURN QUERY SELECT false, '词汇长度需为1-50字符'; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM sensitive_words WHERE word = v_word) THEN
    RETURN QUERY SELECT false, '该敏感词已存在'; RETURN;
  END IF;
  INSERT INTO sensitive_words (word, created_by, created_by_email)
  VALUES (v_word, v_uid, (SELECT email FROM admin_users WHERE user_id = v_uid));
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- 删除敏感词
CREATE OR REPLACE FUNCTION public.admin_delete_sensitive_word(p_id uuid)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM sensitive_words WHERE id = p_id) THEN
    RETURN QUERY SELECT false, '敏感词不存在'; RETURN;
  END IF;
  DELETE FROM sensitive_words WHERE id = p_id;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;