import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '@/ctx';
import { useGame } from '@/ctx/GameContext';
import { resolveGateTarget, gateTargetHref } from '@/lib/approvalGate';
import { listSaves, getActiveSaveLocal } from '@/db/gameApi';

export default function IndexScreen() {
  const { session, isLoading: sessionLoading } = useSession();
  const { save, isLoading: gameLoading } = useGame();
  const [target, setTarget] = useState<string | null>(null);
  const ready = !sessionLoading && !gameLoading && !!session;
  useEffect(() => {
    if (!ready) return;
    let active = true;
    (async () => {
      const all = await listSaves();
      const activeId = getActiveSaveLocal();
      if (all.length > 1 || (all.length === 1 && !activeId)) {
        if (active) setTarget('/(app)/save-select' as never);
        return;
      }
      const t = await resolveGateTarget(Boolean(save?.needsCharacterCreation));
      if (active) setTarget(gateTargetHref(t));
    })();
    return () => { active = false; };
  }, [ready, save?.needsCharacterCreation]);
  if (sessionLoading || (session && gameLoading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F5' }}>
        <ActivityIndicator size="large" color="#C82829" />
      </View>
    );
  }
  if (!session) return <Redirect href={'/(auth)/sign-in' as never} />;
  if (!target) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F5' }}>
        <ActivityIndicator size="large" color="#C82829" />
      </View>
    );
  }
  return <Redirect href={target as never} />;
}