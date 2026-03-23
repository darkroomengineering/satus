import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router";
import { type ThemeName, type Themes, themes } from "@/styles/colors";
import type { StandardContext } from "@/utils/context";

export interface ThemeState {
  name: ThemeName;
  theme: Themes[ThemeName];
}

export interface ThemeActions {
  setTheme: (theme: ThemeName) => void;
}

export type ThemeContextType = StandardContext<ThemeState, ThemeActions>;

const ThemeContextInternal = createContext<ThemeContextType | null>(null);

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContextInternal);
  if (!context) {
    throw new Error("useTheme must be used within a Theme provider");
  }
  return context;
}

export function Theme({
  children,
  theme,
  global,
}: {
  children: React.ReactNode;
  theme: ThemeName;
  global?: boolean;
}) {
  const { pathname } = useLocation();
  const [currentTheme, setCurrentTheme] = useState(theme);

  useEffect(() => {
    setCurrentTheme(theme);
  }, [theme]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset theme on route change
  useEffect(() => {
    if (global) {
      document.documentElement.setAttribute("data-theme", currentTheme);
    }
  }, [pathname, currentTheme, global]);

  const contextValue: ThemeContextType = {
    state: {
      name: currentTheme,
      theme: themes[currentTheme],
    },
    actions: {
      setTheme: setCurrentTheme,
    },
  };

  return (
    <>
      {global && (
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: FOUC prevention
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.setAttribute('data-theme','${currentTheme}');`,
          }}
        />
      )}
      <ThemeContextInternal value={contextValue}>{children}</ThemeContextInternal>
    </>
  );
}
