CREATE TABLE public.temp_appeals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email         text NOT NULL,
  reason        text NOT NULL,
  status        text NOT NULL DEFAULT 'pending',
  handler       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reject_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_temp_appeals_status ON public.temp_appeals(status, created_at DESC);
CREATE INDEX idx_temp_appeals_user   ON public.temp_appeals(user_id, created_at DESC);
ALTER TABLE public.temp_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "temp_appeals_owner_read" ON public.temp_appeals FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "temp_appeals_admin_all" ON public.temp_appeals FOR SELECT TO authenticated
  USING (is_current_admin());

CREATE OR REPLACE FUNCTION public.submit_temp_appeal(p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_uid uuid := auth.uid(); v_email text; v_reason text := trim(p_reason);
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'err', '请先登录'); END IF;
  IF v_reason = '' OR length(v_reason) < 5 THEN
    RETURN jsonb_build_object('ok', false, 'err', '请填写不少于 5 字的申诉理由');
  END IF;
  IF length(v_reason) > 300 THEN
    RETURN jsonb_build_object('ok', false, 'err', '申诉理由不超过 300 字');
  END IF;
  IF EXISTS (SELECT 1 FROM temp_appeals WHERE user_id = v_uid AND status = 'pending') THEN
    RETURN jsonb_build_object('ok', false, 'err', '您已有一条待处理的临时申诉，请耐心等待管理员审核');
  END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  INSERT INTO temp_appeals (user_id, email, reason) VALUES (v_uid, v_email, v_reason);
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_temp_appeal(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_temp_appeals(p_status text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(t) INTO v_rows FROM (
    SELECT id, user_id, email, reason, status, reject_reason, handler, created_at, updated_at
    FROM temp_appeals
    WHERE (p_status IS NULL OR status = p_status)
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;
  RETURN COALESCE(v_rows, '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_temp_appeals(text, int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_temp_appeal(p_id uuid, p_approve boolean, p_reject_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_row temp_appeals%ROWTYPE; v_reason text := trim(COALESCE(p_reject_reason, ''));
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_row FROM temp_appeals WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'err', '申诉不存在'); END IF;
  IF v_row.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'err', '该申诉已处理'); END IF;

  IF p_approve THEN
    UPDATE temp_appeals SET status='approved', handler=auth.uid(), updated_at=now() WHERE id=p_id;
  ELSE
    IF v_reason = '' THEN RETURN jsonb_build_object('ok', false, 'err', '拒绝时请填写拒绝理由'); END IF;
    UPDATE temp_appeals SET status='rejected', reject_reason=v_reason, handler=auth.uid(), updated_at=now() WHERE id=p_id;
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_review_temp_appeal(uuid, boolean, text) TO authenticated;