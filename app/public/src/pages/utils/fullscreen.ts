import { useEffect, useState } from "react"

type WebkitFullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void
  webkitFullscreenElement?: Element | null
}

type WebkitFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

export function getFullScreenElement(): Element | null {
  const fullscreenDocument = document as WebkitFullscreenDocument
  return (
    document.fullscreenElement ??
    fullscreenDocument.webkitFullscreenElement ??
    null
  )
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
  if (getFullScreenElement() || !isFullScreenSupported()) {
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

const MOBILE_PORTRAIT_QUERY =
  "(hover: none) and (pointer: coarse) and (orientation: portrait)"

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>
  unlock?: () => void
}

async function requestLandscapeOrientation(): Promise<void> {
  const orientation = screen.orientation as LockableScreenOrientation
  if (!orientation.lock) return

  try {
    await orientation.lock("landscape")
  } catch (error) {
    // Most browsers only permit locking in fullscreen or an installed PWA.
    if (getFullScreenElement()) {
      console.info("Unable to lock landscape orientation", error)
    }
  }
}

function releaseOrientationLock(): void {
  const orientation = screen.orientation as LockableScreenOrientation
  orientation.unlock?.()
}

export function useLandscapeOrientationGate(enabled: boolean): boolean {
  const [portraitBlocked, setPortraitBlocked] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setPortraitBlocked(false)
      releaseOrientationLock()
      return
    }

    const media = window.matchMedia(MOBILE_PORTRAIT_QUERY)
    const updateOrientation = () => {
      setPortraitBlocked(media.matches)
      if (media.matches) void requestLandscapeOrientation()
    }
    const updateFullscreen = () => {
      void requestLandscapeOrientation()
    }
    const removeLaunchListeners = () => {
      window.removeEventListener("pointerdown", enterOnFirstInteraction, true)
      window.removeEventListener("keydown", enterOnFirstInteraction, true)
    }
    const enterOnFirstInteraction = (event: Event) => {
      removeLaunchListeners()
      if (
        event.target instanceof Element &&
        event.target.closest(".game-fullscreen-toggle")
      ) {
        return
      }
      void enterFullScreen().then(requestLandscapeOrientation)
    }

    updateOrientation()
    media.addEventListener("change", updateOrientation)
    document.addEventListener("fullscreenchange", updateFullscreen)
    document.addEventListener("webkitfullscreenchange", updateFullscreen)
    window.addEventListener("pointerdown", enterOnFirstInteraction, {
      once: true,
      capture: true
    })
    window.addEventListener("keydown", enterOnFirstInteraction, {
      once: true,
      capture: true
    })

    return () => {
      media.removeEventListener("change", updateOrientation)
      document.removeEventListener("fullscreenchange", updateFullscreen)
      document.removeEventListener("webkitfullscreenchange", updateFullscreen)
      removeLaunchListeners()
      releaseOrientationLock()
    }
  }, [enabled])

  return enabled && portraitBlocked
}
