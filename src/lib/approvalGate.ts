// 门禁统一工具：根据当前用户身份与审批状态，解析应跳转的目标路由
import { supabase } from '@/client/supabase';

export type GateTarget =
  | 'admin'
  | 'home'
  | 'character-create'
  | 'pending-approval'
  | 'rejected-notice'
  | 'enter-code';

export async function resolveGateTarget(needsCharacterCreation: boolean): Promise<GateTarget> {
  try {
    // 管理员直接进入后台，阻断进入游戏
    const { data: isAdmin } = await supabase.rpc('is_current_admin');
    if (Boolean(isAdmin)) return 'admin';

    // 已有真实存档的老玩家：无论激活码制是否开启，一律直接进入游戏（熔断点①）
    const { data: hasSave } = await supabase.rpc('player_has_real_save');
    if (Boolean(hasSave)) return needsCharacterCreation ? 'character-create' : 'home';

    // 已通过的临时申诉：管理员已放行，直接进入游戏
    const { data: appealApproved } = await supabase.rpc('has_approved_temp_appeal');
    if (Boolean(appealApproved)) {
      return needsCharacterCreation ? 'character-create' : 'home';
    }

    // 激活码制状态：仅当明确为 true 时才视为开启；null/异常一律视为关闭（fail-open，熔断点②）
    const { data: codeEnabled } = await supabase.rpc('get_code_system_enabled');
    if (codeEnabled !== true) {
      return needsCharacterCreation ? 'character-create' : 'home';
    }

    // 激活码制开启：按测试码审批状态路由
    const { data } = await supabase.rpc('get_my_test_code_status');
    const status = (data as { approval_status?: string; has_code?: boolean } | null) ?? {};
    const approvalStatus = status.approval_status;

    if (approvalStatus === 'pending') return 'pending-approval';
    if (approvalStatus === 'rejected') return 'rejected-notice';
    if (approvalStatus === 'approved' && status.has_code) {
      return needsCharacterCreation ? 'character-create' : 'home';
    }

    return 'enter-code';
  } catch {
    // 任何异常都放行进入游戏，避免误跳测试码页（熔断点③）
    return needsCharacterCreation ? 'character-create' : 'home';
  }
}

export function gateTargetHref(target: GateTarget): string {
  switch (target) {
    case 'admin':
      return '/(app)/admin-panel';
    case 'home':
      return '/(app)/home';
    case 'character-create':
      return '/(app)/character-create';
    case 'pending-approval':
      return '/(app)/pending-approval';
    case 'rejected-notice':
      return '/(app)/rejected-notice';
    case 'enter-code':
      return '/(app)/enter-code';
  }
}