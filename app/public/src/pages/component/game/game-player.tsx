import { type PointerEvent, useEffect, useRef, useState } from "react"
import { CircularProgressbarWithChildren } from "react-circular-progressbar"
import { Tooltip } from "react-tooltip"

import type { IPlayer } from "../../../../../types"
import { getAvatarSrc } from "../../../../../utils/avatar"
import { DEPTH } from "../../../game/depths"
import { useAppSelector } from "../../../hooks"
import { cc } from "../../utils/jsx"
import GamePlayerDetail from "./game-player-detail"

import "react-circular-progressbar/dist/styles.css"
import "./game-player.css"

export default function GamePlayer(props: {
  player: IPlayer
  click: (id: string) => void
  index: number
}) {
  const spectatedPlayerId = useAppSelector(
    (state) => state.game.playerIdSpectated
  )
  const connectedPlayerId = useAppSelector((state) => state.network.uid)
  const touchTooltipTimer = useRef<number | null>(null)
  const touchPointerId = useRef<number | null>(null)
  const touchLongPress = useRef(false)
  const suppressTouchClick = useRef(false)
  const [touchTooltipControlled, setTouchTooltipControlled] = useState(false)
  const [touchTooltipOpen, setTouchTooltipOpen] = useState(false)

  useEffect(
    () => () => {
      if (touchTooltipTimer.current !== null) {
        window.clearTimeout(touchTooltipTimer.current)
      }
    },
    []
  )

  const stopTouchTooltip = (
    event: PointerEvent<HTMLDivElement>,
    suppressClick: boolean
  ) => {
    if (
      event.pointerType === "mouse" ||
      touchPointerId.current !== event.pointerId
    ) {
      return
    }

    if (touchTooltipTimer.current !== null) {
      window.clearTimeout(touchTooltipTimer.current)
      touchTooltipTimer.current = null
    }
    if (suppressClick && touchLongPress.current) {
      suppressTouchClick.current = true
    }
    touchLongPress.current = false
    touchPointerId.current = null
    setTouchTooltipOpen(false)
  }

  function playerClick() {
    if (spectatedPlayerId !== props.player.id) {
      props.click(props.player.id)
    }
  }

  return (
    <div className="game-player-wrapper">
      <div
        style={{
          top: `${1 + props.index * 12.5}%`,
          backgroundImage: `url('${getAvatarSrc(props.player.avatar)}')`,
          zIndex: DEPTH.PLAYER_ICON
        }}
        className={cc("game-player", {
          spectated: spectatedPlayerId === props.player.id,
          self: connectedPlayerId === props.player.id,
          dead: props.player.life <= 0
        })}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" || !event.isPrimary) {
            return
          }

          suppressTouchClick.current = false
          if (touchTooltipTimer.current !== null) {
            window.clearTimeout(touchTooltipTimer.current)
          }
          setTouchTooltipControlled(true)
          setTouchTooltipOpen(false)
          touchLongPress.current = false
          touchPointerId.current = event.pointerId
          event.currentTarget.setPointerCapture?.(event.pointerId)
          touchTooltipTimer.current = window.setTimeout(() => {
            if (touchPointerId.current === event.pointerId) {
              touchLongPress.current = true
              setTouchTooltipOpen(true)
            }
            touchTooltipTimer.current = null
          }, 350)
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") {
            setTouchTooltipControlled(false)
          }
        }}
        onPointerUp={(event) => stopTouchTooltip(event, true)}
        onPointerCancel={(event) => stopTouchTooltip(event, false)}
        onPointerLeave={(event) => stopTouchTooltip(event, true)}
        onClick={(event) => {
          if (suppressTouchClick.current) {
            suppressTouchClick.current = false
            event.preventDefault()
            event.stopPropagation()
            return
          }
          playerClick()
        }}
        data-tooltip-id={"detail-" + props.player.id}
      >
        <CircularProgressbarWithChildren value={props.player.life} />
        <div className="my-container life-text">{props.player.life}</div>
      </div>
      <Tooltip
        id={"detail-" + props.player.id}
        className="custom-theme-tooltip game-player-detail-tooltip"
        place="left"
        data-tooltip-offset={{ left: 30, bottom: props.index === 0 ? 50 : 0 }}
        style={{ zIndex: DEPTH.TOOLTIP }}
        positionStrategy="fixed"
        isOpen={touchTooltipControlled ? touchTooltipOpen : undefined}
      >
        <GamePlayerDetail player={props.player} />
      </Tooltip>
    </div>
  )
}
