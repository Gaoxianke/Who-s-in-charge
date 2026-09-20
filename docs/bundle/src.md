# src

共 2 个文件。
<a id="srcctxtsx"></a>
## `src/ctx.tsx`

```tsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';

import { supabase } from '@/client/supabase';

type SessionContextType = {
  session: Session | null;
  isLoading: boolean;
};

const SessionContext = createContext<SessionContextType>({
  session: null,
  isLoading: true,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
    });

    // iOS/Android 后台时 JS 线程挂起，autoRefreshToken 定时器停止，回前台需手动续期
    // Web 端定时器不受影响，autoRefreshToken 自动处理，无需额外触发
    const appStateSubscription = AppState.addEventListener('change', async (nextState) => {
      if (Platform.OS !== 'web' && appState.current.match(/inactive|background/) && nextState === 'active') {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          await supabase.auth.signOut();
        }
      }
      appState.current = nextState;
    });

    return () => {
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
```

<a id="srcglobalcss"></a>
## `src/global.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* 案牍米白底色 #F5F4F1 */
    --background: 40 20% 96%;
    --foreground: 0 0% 13%;
    /* 卡片白 */
    --card: 0 0% 100%;
    --card-foreground: 0 0% 13%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 13%;
    /* 主色：政务红 #C82829 */
    --primary: 0 67% 47%;
    --primary-foreground: 0 0% 100%;
    /* 辅助色：公文蓝 #2B4B6F */
    --secondary: 210 43% 30%;
    --secondary-foreground: 0 0% 100%;
    --muted: 40 12% 91%;
    --muted-foreground: 0 0% 40%;
    /* 强调色：公文蓝 #2B4B6F */
    --accent: 210 43% 30%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 67% 47%;
    --destructive-foreground: 0 0% 98%;
    --border: 40 10% 84%;
    --input: 40 10% 88%;
    --ring: 0 67% 47%;
    --radius: 0.125rem;
  }
}
```
