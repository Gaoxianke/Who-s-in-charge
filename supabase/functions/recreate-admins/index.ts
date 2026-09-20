import { createClient } from "npm:@supabase/supabase-js@2";

const ADMINS = [
  { email: "admin_01@zhuchen.who", password: "WH@Admin01!", role: "admin" },
  { email: "admin_02@zhuchen.who", password: "WH@Admin02!", role: "admin" },
  { email: "admin_03@zhuchen.who", password: "WH@Admin03!", role: "admin" },
  { email: "admin_04@zhuchen.who", password: "WH@Admin04!", role: "admin" },
  { email: "admin_05@zhuchen.who", password: "WH@Admin05!", role: "admin" },
  { email: "admin_06@zhuchen.who", password: "WH@Admin06!", role: "admin" },
  { email: "admin_07@zhuchen.who", password: "WH@Admin07!", role: "admin" },
  { email: "admin_08@zhuchen.who", password: "WH@Admin08!", role: "admin" },
  { email: "admin_09@zhuchen.who", password: "WH@Admin09!", role: "admin" },
  { email: "admin_10@zhuchen.who", password: "WH@Admin10!", role: "admin" },
  { email: "admin_11@zhuchen.who", password: "WH@Admin11!", role: "admin" },
  { email: "admin_12@zhuchen.who", password: "WH@Admin12!", role: "admin" },
  { email: "admin_13@zhuchen.who", password: "WH@Admin13!", role: "admin" },
  { email: "admin_14@zhuchen.who", password: "WH@Admin14!", role: "admin" },
  { email: "admin_15@zhuchen.who", password: "WH@Admin15!", role: "admin" },
  { email: "admin_16@zhuchen.who", password: "WH@Admin16!", role: "admin" },
  { email: "admin_17@zhuchen.who", password: "WH@Admin17!", role: "admin" },
  { email: "admin_18@zhuchen.who", password: "WH@Admin18!", role: "admin" },
  { email: "admin_19@zhuchen.who", password: "WH@Admin19!", role: "admin" },
  { email: "admin_20@zhuchen.who", password: "WH@Admin20!", role: "admin" },
  { email: "W2794045093@hotmail.com", password: "we2794045093/%", role: "super_admin" },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 先分页拉取全部已存在用户，建立 email -> id 映射
    const existing = new Map<string, string>();
    let page = 1;
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (error || !data?.users?.length) break;
      for (const u of data.users) {
        if (u.email) existing.set(u.email, u.id);
      }
      if (data.users.length < 100) break;
      page++;
    }

    const results: Array<{ email: string; ok: boolean; error?: string }> = [];

    for (const a of ADMINS) {
      let userId = existing.get(a.email);

      if (!userId) {
        // 通过 GoTrue admin API 创建（保证 schema 完整、可被正常 scan）
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: a.email,
          password: a.password,
          email_confirm: true,
          user_metadata: {},
        });
        if (createErr || !created?.user) {
          results.push({ email: a.email, ok: false, error: createErr?.message ?? "create failed" });
          await sleep(1500);
          continue;
        }
        userId = created.user.id;
      }

      // 确保 admin_users 行存在（ON CONFLICT 跳过）
      const { error: insErr } = await supabase
        .from("admin_users")
        .upsert({ user_id: userId, email: a.email, role: a.role }, { onConflict: "user_id" });
      if (insErr) {
        results.push({ email: a.email, ok: false, error: insErr.message });
        await sleep(1500);
        continue;
      }
      results.push({ email: a.email, ok: true });
      await sleep(1200); // 避免触发并发上限
    }

    const failed = results.filter((r) => !r.ok);
    return new Response(
      JSON.stringify({ total: results.length, success: results.length - failed.length, failed: failed.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: failed.length ? 207 : 200 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});