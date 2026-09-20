// VPN/代理检测 Edge Function
// 从请求头提取真实IP，调用 ip-api.com 检测是否为VPN/代理/托管IP
// 若命中则自动写入 banned_entities，阻断后续注册
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  return (
    ip === '::1' ||
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith('fc') || ip.startsWith('fd') ||
    ip === 'localhost'
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  // 从请求头提取真实 IP
  const rawIp =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    '127.0.0.1';
  const ip = rawIp.trim();

  // 私有IP直接放行（本地开发/内网）
  if (isPrivateIp(ip)) {
    return new Response(JSON.stringify({ vpn: false, ip, reason: 'private_ip' }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 调用 ip-api.com 免费接口（无需 key，HTTP，rate limit 45/min）
    const apiRes = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,proxy,hosting,query`,
      { signal: AbortSignal.timeout(4000) },
    );
    const data = await apiRes.json() as {
      status: string; proxy?: boolean; hosting?: boolean; query?: string;
    };

    const isVpn = data.status === 'success' && (data.proxy === true || data.hosting === true);

    if (isVpn) {
      // 使用 service_role 写入封禁记录（绕过 RLS）
      const supaAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      const banUntil = new Date(Date.now() + 100 * 365.25 * 24 * 60 * 60 * 1000).toISOString();
      const reason = `VPN/代理自动检测（proxy=${data.proxy}, hosting=${data.hosting}）`;
      // 写入 vpn 类型
      await supaAdmin.from('banned_entities').upsert(
        [
          { entity_type: 'vpn', entity_value: ip, ban_reason: reason, banned_until: banUntil },
          { entity_type: 'ip',  entity_value: ip, ban_reason: reason, banned_until: banUntil },
        ],
        { onConflict: 'entity_type,entity_value', ignoreDuplicates: true },
      );
    }

    return new Response(
      JSON.stringify({ vpn: isVpn, ip, proxy: data.proxy ?? false, hosting: data.hosting ?? false }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    // 检测失败不阻断注册（网络超时/API不可用时保守放行）
    return new Response(
      JSON.stringify({ vpn: false, ip, error: String(err), reason: 'check_failed' }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
