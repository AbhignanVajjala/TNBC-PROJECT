export type Theme = 'light' | 'dark';
export const THEME_KEY = 'exo-target-theme';
export function readTheme(storage: Pick<Storage, 'getItem'>): Theme {
  try { return storage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
}
export function saveTheme(theme: Theme, storage: Pick<Storage, 'setItem'>) {
  try { storage.setItem(THEME_KEY, theme); } catch {}
}
