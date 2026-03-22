import { createContext, useContext, type ReactNode } from 'react';

type AppTheme = 'light' | 'dark';

type AppThemeContextValue = {
  theme: AppTheme;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({
  value,
  children,
}: {
  value: AppThemeContextValue;
  children: ReactNode;
}) {
  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }

  return context;
}

export function useOptionalAppTheme() {
  return useContext(AppThemeContext);
}
