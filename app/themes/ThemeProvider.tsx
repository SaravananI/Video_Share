import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from './themes';
import { CustomTheme } from './types';

interface ThemeContextType {
  theme: CustomTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isCustomDarkTheme, setIsCustomDarkTheme] = useState(
    systemColorScheme === 'dark'
  );

  // Synchronize state with system color scheme changes
  useEffect(() => {
    setIsCustomDarkTheme(systemColorScheme === 'dark');
  }, [systemColorScheme]);

  const theme = isCustomDarkTheme ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setIsCustomDarkTheme((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useCustomTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useCustomTheme must be used within a ThemeProvider');
  }
  return context;
};
