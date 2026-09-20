// 临时申诉提交 Edge Function
// - 从用户 JWT 解析 user_id / email / created_at
// - 多开检测：同设备指纹的其他账号数（排除管理员，管理员自身豁免）
// - 写入 temp_appeals 并返回风控信息
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function distinctUserIds(rows: { user_id: string }[], adminSet: Set<string>, uid: string): number {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.user_id && r.user_id !== uid && !adminSet.has(r.user_id)) set.add(r.user_id);
  }
  return set.size;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) return json({ ok: false, err: '请先登录' }, 401);

    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // 用用户 token 解析当前用户
    const supaUser = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supaUser.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ ok: false, err: '登录状态异常，请重新登录' }, 401);
    }
    const uid = userData.user.id;
    const email = userData.user.email ?? '';

    const body = await req.json().catch(() => ({}));
    const reason = String(body?.reason ?? '').trim();
    const deviceFingerprint = String(body?.device_fingerprint ?? '').trim();

    if (reason.length < 5) return json({ ok: false, err: '请填写不少于 5 字的申诉理由' });
    if (reason.length > 300) return json({ ok: false, err: '申诉理由不超过 300 字' });

    const admin = createClient(url, serviceKey);

    // 已有待处理申诉
    const { data: pending } = await admin
      .from('temp_appeals')
      .select('id')
      .eq('user_id', uid)
      .eq('status', 'pending')
      .limit(1);
    if (pending && pending.length > 0) {
      return json({ ok: false, err: '您已有一条待处理的临时申诉，请耐心等待管理员审核' });
    }

    // 账号创建时间（用 auth admin API，.from() 不能访问 auth schema）
    let createdAt: string | null = null;
    try {
      const { data: adminUserData } = await admin.auth.admin.getUserById(uid);
      createdAt = adminUserData?.user?.created_at ?? null;
    } catch {
      // 获取失败不中断主流程
    }

    // 管理员集合（用于多开检测排除与豁免）
    const { data: admins } = await admin.from('admin_users').select('user_id');
    const adminSet = new Set((admins ?? []).map((a: { user_id: string }) => a.user_id));
    const adminExempt = adminSet.has(uid);

    // 多开检测：同设备指纹的其他账号数（排除管理员）
    let sameFp = 0;
    if (deviceFingerprint && !['unknown', 'web', ''].includes(deviceFingerprint)) {
      const { data: fpUsers } = await admin
        .from('user_approvals')
        .select('user_id')
        .eq('device_id', deviceFingerprint)
        .neq('user_id', uid);
      sameFp = distinctUserIds(fpUsers ?? [], adminSet, uid);
    }

    const { error: insErr } = await admin.from('temp_appeals').insert({
      user_id: uid,
      email,
      reason,
      device_fingerprint: deviceFingerprint || null,
      same_fp_count: sameFp,
      account_created_at: createdAt,
      admin_exempt: adminExempt,
    });
    if (insErr) return json({ ok: false, err: `提交失败：${insErr.message}` });

    return json({
      ok: true,
      risk: {
        same_fp_count: sameFp,
        admin_exempt: adminExempt,
      },
      created_at: createdAt,
    });
  } catch (err) {
    return json({ ok: false, err: `提交失败：${String(err)}` }, 500);
  }
});