"use client"

import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark")

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "dark" | "light" | null
    const initial = stored || "dark"
    setTheme(initial)
    document.documentElement.classList.toggle("light", initial === "light")
  }, [])

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    localStorage.setItem("theme", next)
    document.documentElement.classList.toggle("light", next === "light")
  }

  return (
    <button
      onClick={toggle}
      className="p-1.5 md:p-2 text-[var(--text-primary)] hover:text-[#C0FC14] hover:bg-[var(--base-card)] transition-all border border-transparent hover:border-[#C0FC14] hover:shadow-[0_0_12px_rgba(192,252,20,0.2)]"
      title="Toggle theme"
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
