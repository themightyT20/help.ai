import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// Create theme context
type ThemeProviderState = {
  theme: string;
  setTheme: (theme: string) => void;
  themes: string[];
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  themes: ["light", "dark", "system"],
};

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      // Check for saved preference in localStorage
      const storedTheme = localStorage.getItem(storageKey);
      if (storedTheme) {
        return storedTheme;
      }
      
      // Check for system preference
      if (defaultTheme === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
    }
    
    return defaultTheme;
  });

  React.useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove old class
    root.classList.remove("light", "dark");
    
    // Add new class based on current theme
    root.classList.add(theme);
    
    // Save the theme to localStorage
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  const setTheme = React.useCallback((theme: string) => {
    setThemeState(theme);
  }, []);

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      themes: ["light", "dark", "system"],
    }),
    [theme, setTheme]
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = (): ThemeProviderState => {
  const context = React.useContext(ThemeProviderContext);
  
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
    
  return context;
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
