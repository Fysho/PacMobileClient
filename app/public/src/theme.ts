import { VIDEO_BG_THEMES } from "../../config/game/theme"
import { subscribeToPreference } from "./preferences"

const THEME_LINK_ID = "pac-theme"

function addVideoBackground(theme: string) {
  const videoElement = document.createElement("video")
  videoElement.id = "videobg"
  videoElement.src = `/assets/theme/${theme}/videobg.mp4`
  videoElement.autoplay = true
  videoElement.muted = true
  videoElement.loop = true
  videoElement.playsInline = true
  document.body.prepend(videoElement)
}

export function applyTheme(theme: string) {
  document.getElementById("videobg")?.remove()
  let link = document.getElementById(THEME_LINK_ID) as HTMLLinkElement | null
  if (!theme || theme === "default") {
    link?.remove()
    return
  }
  if (!link) {
    link = document.createElement("link")
    link.id = THEME_LINK_ID
    link.rel = "stylesheet"
    document.head.appendChild(link)
  }
  link.href = `themes/${theme}.css`

  if (VIDEO_BG_THEMES.some((videoTheme) => videoTheme === theme)) {
    addVideoBackground(theme === "pasdefault" ? "default" : theme)
  }
}

subscribeToPreference("theme", applyTheme, true)
