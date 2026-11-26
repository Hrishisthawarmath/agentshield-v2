// Theme (light / dark) for the portal. Dark is the default.
// The `dark` class lives on <html>; index.html applies it before React loads
// so there is no light flash, and the header toggle flips it.
export const THEME_KEY = 'agentshield.user.theme.v1'

export function currentTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme) {
  const dark = theme === 'dark'
  document.documentElement.classList.toggle('dark', dark)
  try {
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
  } catch {
    // storage unavailable — the class still applies for this visit
  }
  return dark ? 'dark' : 'light'
}
