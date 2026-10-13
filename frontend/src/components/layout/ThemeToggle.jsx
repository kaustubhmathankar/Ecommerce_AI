import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

function ThemeToggle() {
    const { theme, toggleTheme } = useTheme()

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="fixed right-5 top-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white/90 shadow-sm backdrop-blur transition hover:bg-neutral-100"
        >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    )
}

export default ThemeToggle
