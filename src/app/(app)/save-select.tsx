// 存档选择中转页：登录后选择/新建/删除存档，再进入游戏
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';
import {
  listSaves, createSave, deleteSave, getSaveById,
  setActiveSaveLocal, getActiveSaveLocal, clearActiveSaveLocal,
} from '@/db/gameApi';
import type { PlayerSave } from '@/types/game';

const MAX_SAVES = 5;

const C = {
  bg: '#07111E', card: '#0F2235', gold: '#C8A84B', goldLight: '#E8D08A',
  red: '#C82829', green: '#2a7a3b', blue: '#2B4B6F',
  textPrimary: '#EDE8DC', textSecond: '#A09070', textHint: '#5A5040',
  divider: '#162840', border: '#1E3A5A',
};

function tenureText(gameDays: number): string {
  const years = Math.floor(gameDays / 365);
  const months = Math.floor((gameDays % 365) / 30);
  return `${years}年${months}月`;
}

export default function SaveSelectScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useSession();
  const [saves, setSaves] = useState<PlayerSave[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const accountLabel = session?.user?.email || session?.user?.id || '当前账号';

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await listSaves();
    setSaves(list);
    setActiveId(getActiveSaveLocal());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // 删除二次确认：3 秒倒计时防误删
  useEffect(() => {
    if (!confirmId) return;
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [confirmId]);

  const enter = async (s: PlayerSave) => {
    // 偏好档校验：若该档已被删（加载失败），清除偏好并停留在选择页重新列档
    const fresh = await getSaveById(s.id);
    if (!fresh) {
      clearActiveSaveLocal();
      await refresh();
      return;
    }
    setActiveSaveLocal(fresh.id);
    if (fresh.needsCharacterCreation) {
      router.replace('/(app)/character-create');
    } else {
      router.replace('/(app)/home');
    }
  };

  const createNew = async () => {
    if (saves.length >= MAX_SAVES || creating) return;
    setCreating(true);
    const s = await createSave();
    setCreating(false);
    if (s) {
      setActiveSaveLocal(s.id);
      router.replace('/(app)/character-create');
    }
  };

  const confirmDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    const ok = await deleteSave(confirmId);
    if (ok && confirmId === getActiveSaveLocal()) clearActiveSaveLocal();
    setConfirmId(null);
    setDeleting(false);
    await refresh();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <StatusBar style="light" />

      {/* 顶部标题栏 */}
      <View style={{ backgroundColor: C.card, borderBottomWidth: 2, borderBottomColor: C.gold, paddingHorizontal: 16, paddingVertical: 14 }}>
        <Text style={{ color: C.goldLight, fontSize: 18, fontWeight: '700', letterSpacing: 3 }}>选择存档</Text>
        <Text style={{ color: C.textSecond, fontSize: 12, marginTop: 4 }}>当前账号：{accountLabel}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }} showsVerticalScrollIndicator={false}>
          {saves.length === 0 ? (
            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderTopWidth: 2, borderTopColor: C.gold, padding: 28, alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 40 }}>📜</Text>
              <Text style={{ color: C.textPrimary, fontSize: 15, fontWeight: '700' }}>暂无存档</Text>
              <Text style={{ color: C.textSecond, fontSize: 12, textAlign: 'center' }}>点击下方「新建存档」开启你的仕途</Text>
            </View>
          ) : (
            saves.map((s) => {
              const isCurrent = s.id === activeId;
              return (
                <View key={s.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: isCurrent ? C.gold : C.border, borderTopWidth: 2, borderTopColor: isCurrent ? C.gold : C.divider, padding: 14, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: C.goldLight, fontSize: 16, fontWeight: '700' }}>{s.playerName || '未命名'}</Text>
                      {s.needsCharacterCreation ? (
                        <View style={{ backgroundColor: C.red, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: '#fff', fontSize: 10 }}>待捏脸</Text>
                        </View>
                      ) : null}
                      {isCurrent ? (
                        <View style={{ backgroundColor: C.green, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: '#fff', fontSize: 10 }}>当前</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ color: C.textHint, fontSize: 10 }}>
                      {s.createdAt ? new Date(s.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    <Text style={{ color: C.textSecond, fontSize: 12 }}>职务：{s.playerPosition || s.rankName || '-'}</Text>
                    <Text style={{ color: C.textSecond, fontSize: 12 }}>城市：{s.cityName || '-'}</Text>
                    <Text style={{ color: C.textSecond, fontSize: 12 }}>宦龄：{tenureText(s.gameDays)}</Text>
                  </View>

                  {confirmId === s.id ? (
                    <View style={{ backgroundColor: 'rgba(200,40,41,0.12)', borderWidth: 1, borderColor: C.red, padding: 10, gap: 8 }}>
                      <Text style={{ color: C.red, fontSize: 12, fontWeight: '700' }}>确认删除该存档？此操作不可恢复。</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          cssInterop={false}
                          disabled={countdown > 0 || deleting}
                          onPress={confirmDelete}
                          style={{ flex: 1, backgroundColor: countdown > 0 ? '#5a2020' : C.red, paddingVertical: 9, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{deleting ? '删除中...' : countdown > 0 ? `确认删除(${countdown}s)` : '确认删除'}</Text>
                        </Pressable>
                        <Pressable cssInterop={false} onPress={() => setConfirmId(null)} style={{ flex: 1, borderWidth: 1, borderColor: C.border, paddingVertical: 9, alignItems: 'center' }}>
                          <Text style={{ color: C.textSecond, fontWeight: '700', fontSize: 12 }}>取消</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable cssInterop={false} onPress={() => enter(s)} style={{ flex: 1, backgroundColor: C.gold, paddingVertical: 10, alignItems: 'center' }}>
                        <Text style={{ color: '#07111E', fontWeight: '700', fontSize: 13 }}>进入</Text>
                      </Pressable>
                      <Pressable cssInterop={false} onPress={() => setConfirmId(s.id)} style={{ backgroundColor: 'transparent', borderWidth: 1, borderColor: C.red, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' }}>
                        <Text style={{ color: C.red, fontWeight: '700', fontSize: 13 }}>删除</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })
          )}

          {/* 新建存档 */}
          <Pressable
            cssInterop={false}
            disabled={saves.length >= MAX_SAVES || creating}
            onPress={createNew}
            style={{ backgroundColor: saves.length >= MAX_SAVES ? '#2a3540' : C.blue, paddingVertical: 14, alignItems: 'center', opacity: saves.length >= MAX_SAVES ? 0.7 : 1 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
              {creating ? '创建中...' : saves.length >= MAX_SAVES ? `存档已满（${MAX_SAVES}/${MAX_SAVES}）` : '＋ 新建存档'}
            </Text>
          </Pressable>

          {/* 退出登录 */}
          <Pressable cssInterop={false} onPress={logout} style={{ paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ color: C.textHint, fontSize: 12 }}>退出登录</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}