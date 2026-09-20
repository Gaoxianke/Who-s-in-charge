// 涉案资产页面（复用通用玩法模板）
import { useCallback } from 'react';
import { useGame } from '@/ctx/GameContext';
import { GameplayCardList } from '@/components/GameplayCardList';
import { executeGameplayAction } from '@/lib/gameplayApi';
import type { GameplayConfig, GameplayCategory } from '@/types/game';

const TABS: { key: GameplayCategory; label: string }[] = [
  { key: 'asset_hiding', label: '灰色资产' },
  { key: 'asset_transfer', label: '转移销赃' },
];

export default function IllicitAssetsScreen() {
  const { save, updateGameSave, refreshSave } = useGame();

  const onAction = useCallback(async (config: GameplayConfig) => {
    if (!save) return { ok: false, message: '存档未加载' };
    const res = await executeGameplayAction(save.id, config);
    if (res.gameOver) {
      await updateGameSave({ gameOverType: res.gameOver });
    }
    await refreshSave();
    return { ok: res.success, message: res.message };
  }, [save, updateGameSave, refreshSave]);

  return (
    <GameplayCardList
      title="涉案资产"
      subtitle="管理非法所得的存放与洗白，影响追缴率与证据链"
      tabs={TABS}
      onAction={onAction}
    />
  );
}