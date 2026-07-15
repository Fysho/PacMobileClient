export async function enterFullScreen(): Promise<void> {
  if (!document.fullscreenEnabled || document.fullscreenElement) {
    return
  }

  try {
    await document.documentElement.requestFullscreen()
  } catch (error) {
    console.info(error)
  }
}

export async function exitFullScreen(): Promise<void> {
  if (!document.fullscreenEnabled || !document.fullscreenElement) {
    return
  }

  try {
    await document.exitFullscreen()
  } catch (error) {
    console.info(error)
  }
}

export function toggleFullScreen(): void {
  if (!document.fullscreenElement) {
    void enterFullScreen()
  } else {
    void exitFullScreen()
  }
}
