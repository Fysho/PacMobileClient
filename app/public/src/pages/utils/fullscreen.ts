type WebkitFullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void
  webkitFullscreenElement?: Element | null
}

type WebkitFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

export const FULL_SCREEN_DISPLAY_QUERY = "(display-mode: fullscreen)"

export function getFullScreenElement(): Element | null {
  const fullscreenDocument = document as WebkitFullscreenDocument
  return (
    document.fullscreenElement ??
    fullscreenDocument.webkitFullscreenElement ??
    null
  )
}

export function isFullScreenDisplayMode(): boolean {
  return window.matchMedia(FULL_SCREEN_DISPLAY_QUERY).matches
}

export function isFullScreenSupported(): boolean {
  const root = document.documentElement as WebkitFullscreenElement
  return Boolean(
    document.fullscreenEnabled ||
      root.requestFullscreen ||
      root.webkitRequestFullscreen
  )
}

export async function enterFullScreen(): Promise<void> {
  if (
    getFullScreenElement() ||
    isFullScreenDisplayMode() ||
    !isFullScreenSupported()
  ) {
    return
  }

  const root = document.documentElement as WebkitFullscreenElement
  try {
    if (root.requestFullscreen) {
      await root.requestFullscreen({ navigationUI: "hide" })
    } else if (root.webkitRequestFullscreen) {
      await root.webkitRequestFullscreen()
    }
  } catch (error) {
    console.info("Unable to enter fullscreen", error)
  }
}

export async function exitFullScreen(): Promise<void> {
  if (!getFullScreenElement()) {
    return
  }

  const fullscreenDocument = document as WebkitFullscreenDocument
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen()
    } else if (fullscreenDocument.webkitExitFullscreen) {
      await fullscreenDocument.webkitExitFullscreen()
    }
  } catch (error) {
    console.info("Unable to exit fullscreen", error)
  }
}

export function toggleFullScreen(): void {
  if (!getFullScreenElement()) {
    void enterFullScreen()
  } else {
    void exitFullScreen()
  }
}
