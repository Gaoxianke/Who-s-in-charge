-- 删除旧的姓名词库表及其 RPC（改为单一完整姓名名册 npc_names）
DROP FUNCTION IF EXISTS public.admin_list_npc_name_pool(text,int,int);
DROP FUNCTION IF EXISTS public.admin_add_npc_name(text,text);
DROP FUNCTION IF EXISTS public.admin_delete_npc_name(uuid);
DROP TABLE IF EXISTS public.npc_name_pool;
DROP TABLE IF EXISTS public.npc_in_use;
DROP FUNCTION IF EXISTS public.admin_list_npc_in_use(text,int,int);
DROP FUNCTION IF EXISTS public.admin_add_npc_in_use(text);
DROP FUNCTION IF EXISTS public.admin_delete_npc_in_use(uuid);
DROP FUNCTION IF EXISTS public.admin_scan_npc_names();