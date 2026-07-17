import React, {
  type PropsWithChildren,
  Suspense,
  useEffect,
  useRef,
  useState
} from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { BrowserRouter, Route, Routes } from "react-router"
import i18n from "./i18n"
import AfterGame from "./pages/after-game"
import Auth from "./pages/auth"
import BotBuilder from "./pages/component/bot-builder/bot-builder"
import { BotManagerPanel } from "./pages/component/bot-builder/bot-manager-panel"
import MapViewer from "./pages/component/debug/map-viewer"
import Game from "./pages/game"
import { Gameboy } from "./pages/gameboy"
import Lobby from "./pages/lobby"
import Preparation from "./pages/preparation"
import { SpriteDebug } from "./pages/sprite-viewer"
import TranslationsPage from "./pages/translations"
import {
  enterFullScreen,
  exitFullScreen,
  getFullScreenElement,
  isFullScreenDisplayMode
} from "./pages/utils/fullscreen"
import store from "./stores/index"
import "./style/index.css"
import "./theme"

// Redirect top window if running in an iframe
if (window.top && window !== window.top) {
  window.top.location.replace(window.location.href)
}

// Prevent the website to be opened from window.open()
if (window.opener) {
  window.opener.location.replace(window.location.href)
}

const MOBILE_PORTRAIT_QUERY =
  "(hover: none) and (pointer: coarse) and (orientation: portrait)"

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>
}

async function requestLandscapeOrientation(): Promise<void> {
  const orientation = screen.orientation as LockableScreenOrientation
  if (!orientation.lock) return

  try {
    await orientation.lock("landscape")
  } catch (error) {
    // Most browsers only permit locking in fullscreen or an installed PWA.
    if (document.fullscreenElement) {
      console.info("Unable to lock landscape orientation", error)
    }
  }
}

function LandscapeGate({ children }: PropsWithChildren) {
  const contentRef = useRef<HTMLDivElement>(null)
  const portraitMedia = useRef(window.matchMedia(MOBILE_PORTRAIT_QUERY))
  const [portraitBlocked, setPortraitBlocked] = useState(
    portraitMedia.current.matches
  )
  const [fullscreen, setFullscreen] = useState(getFullScreenElement() !== null)
  const installedFullscreen = useRef(isFullScreenDisplayMode())

  useEffect(() => {
    const media = portraitMedia.current
    const updateOrientation = () => {
      setPortraitBlocked(media.matches)
      if (media.matches) void requestLandscapeOrientation()
    }
    const updateFullscreen = () => {
      setFullscreen(getFullScreenElement() !== null)
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
        event.target.closest(".fullscreen-toggle")
      ) {
        return
      }
      void enterFullScreen().then(requestLandscapeOrientation)
    }

    updateOrientation()
    media.addEventListener("change", updateOrientation)
    document.addEventListener("fullscreenchange", updateFullscreen)
    document.addEventListener("webkitfullscreenchange", updateFullscreen)
    if (!installedFullscreen.current) {
      window.addEventListener("pointerdown", enterOnFirstInteraction, {
        once: true,
        capture: true
      })
      window.addEventListener("keydown", enterOnFirstInteraction, {
        once: true,
        capture: true
      })
    }

    return () => {
      media.removeEventListener("change", updateOrientation)
      document.removeEventListener("fullscreenchange", updateFullscreen)
      document.removeEventListener("webkitfullscreenchange", updateFullscreen)
      removeLaunchListeners()
    }
  }, [])

  useEffect(() => {
    if (contentRef.current) contentRef.current.inert = portraitBlocked
  }, [portraitBlocked])

  return (
    <>
      <div
        ref={contentRef}
        className="landscape-gate-content"
        aria-hidden={portraitBlocked || undefined}
      >
        {children}
      </div>
      {!installedFullscreen.current && (
        <button
          type="button"
          className="fullscreen-toggle bubbly"
          aria-label={i18n.t("toggle_fullscreen")}
          aria-pressed={fullscreen}
          title={i18n.t("toggle_fullscreen")}
          onClick={() => {
            if (getFullScreenElement()) {
              void exitFullScreen()
            } else {
              void enterFullScreen().then(requestLandscapeOrientation)
            }
          }}
        >
          <img src="/assets/ui/fullscreen.svg" alt="" />
        </button>
      )}
      {portraitBlocked && (
        <div
          className="mobile-landscape-blocker"
          role="alert"
          aria-live="assertive"
        >
          <div className="mobile-landscape-phone" aria-hidden="true">
            <span />
          </div>
          <p>{i18n.t("landscape_required")}</p>
        </div>
      )}
    </>
  )
}

const container = document.getElementById("root")
const root = createRoot(container!)

i18n.on("initialized", () => {
  root.render(
    <Provider store={store}>
      <React.StrictMode>
        <Suspense fallback="loading">
          <LandscapeGate>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Auth />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/lobby" element={<Lobby />} />
                <Route path="/preparation" element={<Preparation />} />
                <Route path="/game" element={<Game />} />
                <Route path="/after" element={<AfterGame />} />
                <Route path="/bot-builder" element={<BotBuilder />} />
                <Route path="/bot-admin" element={<BotManagerPanel />} />
                <Route path="/sprite-viewer" element={<SpriteDebug />} />
                <Route path="/map-viewer" element={<MapViewer />} />
                <Route path="/gameboy" element={<Gameboy />} />
                <Route path="/translations" element={<TranslationsPage />} />
              </Routes>
            </BrowserRouter>
          </LandscapeGate>
        </Suspense>
      </React.StrictMode>
    </Provider>
  )
})

if (navigator.serviceWorker) {
  navigator.serviceWorker.register("sw.js")
}
