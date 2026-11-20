import React, { createContext, useContext, useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { readTheme, saveTheme, Theme, THEME_KEY } from '../lib/theme';
const Context = createContext<{theme:Theme; setTheme:(value:Theme)=>void}>({theme:'light',setTheme:()=>{}});
export function ThemeProvider({children}: {children:React.ReactNode}) {
  const [theme, update] = useState<Theme>(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  const setTheme = (value:Theme) => {
    document.documentElement.dataset.theme = value;
    try { saveTheme(value, window.localStorage); } catch {}
    update(value);
  };
  useEffect(() => {
    const sync = (event:StorageEvent) => {
      if (event.key !== THEME_KEY) return;
      let value:Theme = 'light';
      try { value = readTheme(window.localStorage); } catch {}
      document.documentElement.dataset.theme=value;
      update(value);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return <Context.Provider value={{theme,setTheme}}>{children}</Context.Provider>;
}
export function ThemeSwitcher() {
  const {theme,setTheme} = useContext(Context);
  return <div className="theme-switcher" role="group" aria-label="Color theme">
    {(['light','dark'] as const).map(value => <button key={value} type="button" onClick={() => setTheme(value)} aria-pressed={theme === value} aria-label={`${value === 'light' ? 'Light' : 'Dark'} theme`} title={`${value === 'light' ? 'Light' : 'Dark'} theme`}>
      {value === 'light' ? <Sun size={14}/> : <Moon size={14}/>}<span className="sr-only">{value === 'light' ? 'Light' : 'Dark'}</span>
    </button>)}
  </div>;
}
