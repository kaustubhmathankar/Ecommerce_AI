import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'

const ThemeContext = createContext(null)
const THEME_STORAGE_KEY = 'shopsphere_theme'

function getInitialTheme() {
    try {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
        if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme
    } catch (error) {
        console.error('Unable to read ShopSphere theme preference:', error)
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(getInitialTheme)

    useEffect(() => {
        document.documentElement.dataset.theme = theme
        document.documentElement.style.colorScheme = theme

        const themeColor = document.querySelector('meta[name="theme-color"]')
        if (themeColor) {
            themeColor.content = theme === 'dark' ? '#111112' : '#bc0019'
        }

        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme)
        } catch (error) {
            console.error('Unable to save ShopSphere theme preference:', error)
        }
    }, [theme])

    const toggleTheme = useCallback(() => {
        setTheme((current) => current === 'dark' ? 'light' : 'dark')
    }, [])

    const value = useMemo(
        () => ({ theme, toggleTheme }),
        [theme, toggleTheme],
    )

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
    const context = useContext(ThemeContext)

    if (!context) {
        throw new Error('useTheme must be used inside ThemeProvider')
    }

    return context
}
