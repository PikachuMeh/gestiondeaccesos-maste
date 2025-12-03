import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        // Check localStorage first
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme) {
            console.log("Loaded theme from localStorage:", savedTheme);
            return savedTheme;
        }
        // Check system preference
        if (typeof window !== "undefined" && window.matchMedia) {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
            console.log("Using system theme:", systemTheme);
            return systemTheme;
        }
        console.log("Using default theme: light");
        return "light";
    });

    useEffect(() => {
        const root = document.documentElement;
        const body = document.body;
        console.log("Applying theme:", theme);

        // Apply theme class for dark mode
        if (theme === "dark") {
            root.classList.add("dark");
            body.classList.add("dark");
            console.log("Added 'dark' class to html and body elements");
        } else {
            root.classList.remove("dark");
            body.classList.remove("dark");
            console.log("Removed 'dark' class from html and body elements");
        }

        // Save to localStorage
        localStorage.setItem("theme", theme);
        console.log("Saved theme to localStorage:", theme);
    }, [theme]);

    // Listen for system theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e) => {
            // Only update if no manual preference is saved
            const savedTheme = localStorage.getItem("theme");
            if (!savedTheme) {
                setTheme(e.matches ? "dark" : "light");
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    const toggleTheme = () => {
        console.log("Toggling theme from:", theme);
        setTheme((prevTheme) => {
            const newTheme = prevTheme === "dark" ? "light" : "dark";
            console.log("New theme:", newTheme);
            return newTheme;
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
