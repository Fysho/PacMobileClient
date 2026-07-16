import { type MouseEventHandler, type ToggleEvent, useEffect } from "react"
import type { ITooltip } from "react-tooltip"

const MOBILE_POINTER_QUERY = "(hover: none) and (pointer: coarse)"
const MOBILE_CLICK_TOOLTIP_PROPS: Pick<
  ITooltip,
  "clickable" | "closeEvents" | "globalCloseEvents" | "openEvents"
> = {
  clickable: true,
  openEvents: { click: true },
  closeEvents: {},
  globalCloseEvents: {}
}

export function isMobilePointer() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(MOBILE_POINTER_QUERY).matches
  )
}

export function getMobileClickTooltipProps(isOpen: boolean) {
  return isMobilePointer()
    ? {
        ...MOBILE_CLICK_TOOLTIP_PROPS,
        isOpen
      }
    : {}
}

export function getMobileTooltipAnchorProps(toggle: () => void) {
  if (!isMobilePointer()) {
    return {}
  }

  const onClick: MouseEventHandler<HTMLElement> = () => {
    toggle()
  }
  return { onClick }
}

export function useMobileTooltipOutsideClose(
  tooltipId: string | null,
  isOpen: boolean,
  close: () => void
) {
  useEffect(() => {
    if (!tooltipId || !isOpen || !isMobilePointer()) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return

      const anchor = document.querySelector(
        `[data-tooltip-id="${CSS.escape(tooltipId)}"]`
      )
      const tooltip = document.getElementById(tooltipId)
      if (anchor?.contains(target) || tooltip?.contains(target)) return
      close()
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [close, isOpen, tooltipId])
}

export function closeSiblingDetails(event: ToggleEvent<HTMLDetailsElement>) {
  const details = event.currentTarget as HTMLDetailsElement
  if (details.open === false) return
  const detailsElements = (details.parentElement?.children ??
    []) as HTMLCollectionOf<HTMLDetailsElement>
  for (const el of Array.from(detailsElements)) {
    el.open = el === event.currentTarget
    if (el !== event.currentTarget && el.tagName === "DETAILS") {
      el.removeAttribute("open")
    }
  }
}
