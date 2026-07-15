import React, { useEffect, useRef, useState } from "react"
import { Tooltip } from "react-tooltip"
import { RarityColor } from "../../../../../config"
import { getPkmWithCustom } from "../../../../../models/colyseus-models/pokemon-customs"
import { getPokemonData } from "../../../../../models/precomputed/precomputed-pokemon-data"
import { type PkmDuo, PkmDuos } from "../../../../../types/enum/Pokemon"
import { selectSpectatedPlayer, useAppSelector } from "../../../hooks"
import { cc } from "../../utils/jsx"
import SynergyIcon from "../icons/synergy-icon"
import { GamePokemonDetail } from "./game-pokemon-detail"
import { getCachedPortrait } from "./game-pokemon-portrait"
import "./game-pokemon-portrait.css"

export default function GamePokemonDuoPortrait(props: {
  index: number
  origin: "proposition"
  duo: PkmDuo
  click?: React.MouseEventHandler<HTMLDivElement>
  inPlanner?: boolean
}) {
  const duo = PkmDuos[props.duo].map((p) => getPokemonData(p))
  const rarityColor = RarityColor[duo[0].rarity]
  const spectatedPlayer = useAppSelector(selectSpectatedPlayer)
  const duoCustom = duo.map((p) =>
    getPkmWithCustom(p.index, spectatedPlayer?.pokemonCustoms)
  )
  const touchTooltipTimer = useRef<number | null>(null)
  const touchPointerId = useRef<number | null>(null)
  const touchLongPress = useRef(false)
  const suppressTouchClick = useRef(false)
  const [touchTooltipControlled, setTouchTooltipControlled] = useState(false)
  const [touchTooltipIndex, setTouchTooltipIndex] = useState<number | null>(
    null
  )

  useEffect(
    () => () => {
      if (touchTooltipTimer.current !== null) {
        window.clearTimeout(touchTooltipTimer.current)
      }
    },
    []
  )

  const stopTouchTooltip = (
    event: React.PointerEvent<HTMLDivElement>,
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
    setTouchTooltipIndex(null)
  }

  return (
    <div
      className={cc(
        `my-container game-pokemon-portrait game-pokemon-portrait-duo`,
        { planned: props.inPlanner ?? false }
      )}
      style={{
        backgroundColor: rarityColor,
        borderColor: rarityColor
      }}
      onClick={(event) => {
        if (suppressTouchClick.current) {
          suppressTouchClick.current = false
          event.preventDefault()
          event.stopPropagation()
          return
        }
        props.click?.(event)
      }}
    >
      {duo.map((p, i) => (
        <React.Fragment key={"duo-" + i}>
          <div
            className={cc(
              "game-pokemon-portrait-duo-part",
              "game-pokemon-portrait-duo-part-" + (i === 0 ? "down" : "up")
            )}
            data-tooltip-id={`tooltip-${props.origin}-${props.index}-${p.index}`}
            style={{
              backgroundImage: `url("${getCachedPortrait(p.index, spectatedPlayer?.pokemonCustoms)}")`
            }}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse" || !event.isPrimary) {
                return
              }
              suppressTouchClick.current = false

              if (touchTooltipTimer.current !== null) {
                window.clearTimeout(touchTooltipTimer.current)
              }
              setTouchTooltipControlled(true)
              setTouchTooltipIndex(null)
              touchLongPress.current = false
              touchPointerId.current = event.pointerId
              event.currentTarget.setPointerCapture?.(event.pointerId)
              touchTooltipTimer.current = window.setTimeout(() => {
                if (touchPointerId.current === event.pointerId) {
                  touchLongPress.current = true
                  setTouchTooltipIndex(i)
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
          ></div>
          <Tooltip
            id={`tooltip-${props.origin}-${props.index}-${p.index}`}
            className="custom-theme-tooltip game-pokemon-detail-tooltip"
            place="bottom"
            isOpen={
              touchTooltipControlled ? touchTooltipIndex === i : undefined
            }
          >
            <GamePokemonDetail
              pokemon={p.name}
              emotion={duoCustom[i]?.emotion}
              shiny={duoCustom[i]?.shiny}
              origin={props.origin}
            />
          </Tooltip>
        </React.Fragment>
      ))}
      {props.inPlanner && (
        <img
          src="/assets/ui/planned.png"
          alt=""
          className="game-pokemon-portrait-planned-icon"
        />
      )}
      <ul className="game-pokemon-portrait-types">
        {Array.from(duo[0].types.values()).map((type) => {
          return (
            <li key={type}>
              <SynergyIcon type={type} size="1.4vw" />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
