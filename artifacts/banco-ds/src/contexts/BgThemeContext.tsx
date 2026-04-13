import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type BgTheme = "white" | "gray" | "black";

type ThemeVars = Record<string, string>;

const THEME_CONFIGS: Record<BgTheme, { label: string; dark: boolean; hex: string; vars: ThemeVars }> = {
  white: {
    label: "Blanco",
    dark: false,
    hex: "#f9fafc",
    vars: {},
  },
  gray: {
    label: "Gris",
    dark: true,
    hex: "#111113",
    vars: {
      "--background":         "240 3% 7%",
      "--card":               "240 3% 10%",
      "--popover":            "240 3% 10%",
      "--secondary":          "240 3% 15%",
      "--secondary-foreground":"0 0% 100%",
      "--muted":              "240 3% 15%",
      "--muted-foreground":   "0 0% 80%",
      "--accent":             "240 3% 15%",
      "--accent-foreground":  "0 0% 100%",
      "--border":             "240 3% 18%",
      "--input":              "240 3% 15%",
    },
  },
  black: {
    label: "Negro",
    dark: true,
    hex: "#000000",
    vars: {
      "--background":         "0 0% 0%",
      "--card":               "0 0% 5%",
      "--popover":            "0 0% 5%",
      "--secondary":          "0 0% 10%",
      "--secondary-foreground":"0 0% 100%",
      "--muted":              "0 0% 10%",
      "--muted-foreground":   "0 0% 80%",
      "--accent":             "0 0% 10%",
      "--accent-foreground":  "0 0% 100%",
      "--border":             "0 0% 14%",
      "--input":              "0 0% 10%",
    },
  },
};

const OVERRIDEABLE_VARS = [
  "--background", "--card", "--popover",
  "--secondary", "--secondary-foreground",
  "--muted", "--muted-foreground",
  "--accent", "--accent-foreground",
  "--border", "--input",
];

export const BG_STYLES: Record<BgTheme, { bg: string; label: string }> = {
  white: { bg: THEME_CONFIGS.white.hex, label: THEME_CONFIGS.white.label },
  gray:  { bg: THEME_CONFIGS.gray.hex,  label: THEME_CONFIGS.gray.label },
  black: { bg: THEME_CONFIGS.black.hex, label: THEME_CONFIGS.black.label },
};

const BgThemeContext = createContext<{
  theme: BgTheme;
  setTheme: (t: BgTheme) => void;
}>({ theme: "gray", setTheme: () => {} });

export function BgThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<BgTheme>(() => {
    return (localStorage.getItem("banco-bg") as BgTheme) ?? "gray";
  });

  useEffect(() => {
    const html = document.documentElement;
    const config = THEME_CONFIGS[theme];

    if (config.dark) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
      OVERRIDEABLE_VARS.forEach(v => html.style.removeProperty(v));
    }

    Object.entries(config.vars).forEach(([key, val]) => {
      html.style.setProperty(key, val);
    });
  }, [theme]);

  function setTheme(t: BgTheme) {
    setThemeState(t);
    localStorage.setItem("banco-bg", t);
  }

  return (
    <BgThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </BgThemeContext.Provider>
  );
}

export function useBgTheme() {
  return useContext(BgThemeContext);
}
