// 门禁统一工具：根据当前用户身份与审批状态，解析应跳转的目标路由
import { supabase } from '@/client/supabase';

export type GateTarget =
  | 'admin'
  | 'home'
  | 'character-create';

export async function resolveGateTarget(needsCharacterCreation: boolean): Promise<GateTarget> {
  try {
    const { data: isAdmin } = await supabase.rpc('is_current_admin');
    if (Boolean(isAdmin)) return 'admin';
  } catch {
    // ignore
  }
  return needsCharacterCreation ? 'character-create' : 'home';
}

export function gateTargetHref(target: GateTarget): string {
  switch (target) {
    case 'admin': return '/(app)/admin-panel';
    case 'home': return '/(app)/home';
    case 'character-create': return '/(app)/character-create';
  }
}
