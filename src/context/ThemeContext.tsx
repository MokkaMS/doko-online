import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'classic' | 'minimal';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('appTheme');
    return (stored === 'classic' || stored === 'minimal') ? stored : 'classic';
  });

  useEffect(() => {
    localStorage.setItem('appTheme', theme);
    if (theme === 'minimal') {
      document.body.classList.add('theme-minimal');
    } else {
      document.body.classList.remove('theme-minimal');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'classic' ? 'minimal' : 'classic'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
