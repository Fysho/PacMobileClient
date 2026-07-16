import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Tooltip } from "react-tooltip"
import { RarityColor } from "../../../../../config"
import { EvolutionManager } from "../../../../../core/evolution-logic/evolution-manager"
import type { Pokemon } from "../../../../../models/colyseus-models/pokemon"
import {
  getPkmWithCustom,
  type PokemonCustoms
} from "../../../../../models/colyseus-models/pokemon-customs"
import PokemonFactory from "../../../../../models/pokemon-factory"
import { getBuyPrice } from "../../../../../models/shop"
import { EvolutionRuleType } from "../../../../../types/EvolutionRules"
import { type Pkm, PkmFamily } from "../../../../../types/enum/Pokemon"
import { getPortraitSrc } from "../../../../../utils/avatar"
import { schemaValues } from "../../../../../utils/schemas"
import {
  selectConnectedPlayer,
  selectSpectatedPlayer,
  useAppSelector
} from "../../../hooks"
import { getGameScene } from "../../game"
import { cc } from "../../utils/jsx"
import { Money } from "../icons/money"
import SynergyIcon from "../icons/synergy-icon"
import { GamePokemonDetail } from "./game-pokemon-detail"
import "./game-pokemon-portrait.css"

export function getCachedPortrait(
  index: string,
  customs?: PokemonCustoms
): string {
  const scene = getGameScene()
  const pokemonCustom = getPkmWithCustom(index, customs)
  return (
    scene?.textures.getBase64(`portrait-${index}`) ??
    getPortraitSrc(index, pokemonCustom.shiny, pokemonCustom.emotion)
  )
}

export type MobileQuickActionPointer = {
  clientX: number
  clientY: number
}

export default function GamePokemonPortrait(props: {
  index: number
  origin: "wiki" | "shop" | "proposition" | "team" | "planner" | "battle"
  pokemon: Pokemon | Pkm | undefined
  click?: React.MouseEventHandler<HTMLDivElement>
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>
  inPlanner?: boolean
  onMobileLongPressStart?: (
    index: number,
    pointer: MobileQuickActionPointer,
    sourceRect: DOMRect
  ) => void
  onMobileLongPressMove?: (pointer: MobileQuickActionPointer) => void
  onMobileLongPressEnd?: (
    pointer: MobileQuickActionPointer,
    cancelled: boolean
  ) => void
}) {
  const pokemon = useMemo(() => {
    if (typeof props.pokemon === "string") {
      const pokemon = PokemonFactory.createPokemonFromName(props.pokemon)
      pokemon.pp = pokemon.maxPP
      return pokemon
    }
    return props.pokemon
  }, [props.pokemon])

  const currentPlayerUid: string = useAppSelector((state) => state.network.uid)
  const spectatedPlayerId: string = useAppSelector(
    (state) => state.game.playerIdSpectated
  )
  const spectatedPlayer = useAppSelector(selectSpectatedPlayer)
  const connectedPlayer = useAppSelector(selectConnectedPlayer)

  const board = connectedPlayer?.board ?? null

  const specialGameRule = useAppSelector((state) => state.game.specialGameRule)
  const stageLevel = useAppSelector((state) => state.game.stageLevel)

  const isOnAnotherBoard = spectatedPlayerId !== currentPlayerUid

  const [count, setCount] = useState(0)
  const [countEvol, setCountEvol] = useState(0)
  const touchTooltipTimer = useRef<number | null>(null)
  const touchPointerId = useRef<number | null>(null)
  const touchPointerPosition = useRef<MobileQuickActionPointer>({
    clientX: 0,
    clientY: 0
  })
  const touchLongPress = useRef(false)
  const suppressTouchClick = useRef(false)
  const [touchTooltipControlled, setTouchTooltipControlled] = useState(false)
  const [touchTooltipOpen, setTouchTooltipOpen] = useState(false)

  // recount where board size or pokemon on this shop cell changes
  useEffect(() => {
    let _count = 0
    let _countEvol = 0
    if (
      board &&
      board.forEach &&
      !isOnAnotherBoard &&
      props.pokemon &&
      pokemon &&
      pokemon.hasEvolution
    ) {
      board.forEach((p) => {
        if (p.name === pokemon.name) {
          _count++
        } else if (PkmFamily[p.name] === pokemon.name) {
          _countEvol++
        }
      })
    }

    setCount(_count)
    setCountEvol(_countEvol)
  }, [board, board?.size, props.pokemon, pokemon, isOnAnotherBoard])

  useEffect(
    () => () => {
      if (touchTooltipTimer.current !== null) {
        window.clearTimeout(touchTooltipTimer.current)
      }
    },
    []
  )

  if (!props.pokemon || !pokemon) {
    return <div className="game-pokemon-portrait my-box empty" />
  }

  const customs = spectatedPlayer?.pokemonCustoms
  const pokemonCustom = getPkmWithCustom(pokemon.index, customs)
  const rarityColor = RarityColor[pokemon.rarity]

  const evolutionName = spectatedPlayer
    ? EvolutionManager.getEvolution(pokemon, spectatedPlayer)
    : (pokemon.evolutions[0] ?? pokemon.evolution)
  let pokemonEvolution = PokemonFactory.createPokemonFromName(evolutionName)

  const willEvolve =
    pokemon.evolutionRule.type === EvolutionRuleType.COUNT &&
    count === pokemon.evolutionRule.numberRequired - 1

  const shouldShimmer =
    pokemon.evolutionRule.type === EvolutionRuleType.COUNT &&
    ((count > 0 && pokemon.hasEvolution) ||
      (countEvol > 0 && pokemonEvolution.hasEvolution))

  if (
    pokemon.evolutionRule.type === EvolutionRuleType.COUNT &&
    count === pokemon.evolutionRule.numberRequired - 1 &&
    countEvol === pokemon.evolutionRule.numberRequired - 1 &&
    pokemonEvolution.hasEvolution
  ) {
    const evolutionName2 = spectatedPlayer
      ? EvolutionManager.getEvolution(
          pokemonEvolution,
          spectatedPlayer,
          stageLevel
        )
      : (pokemonEvolution.evolutions[0] ?? pokemonEvolution.evolution)
    pokemonEvolution = PokemonFactory.createPokemonFromName(evolutionName2)
  }

  const pokemonInPortrait =
    willEvolve && pokemonEvolution ? pokemonEvolution : pokemon

  const cost = getBuyPrice(pokemon.name, specialGameRule)

  const gainedSynergies =
    pokemonEvolution && willEvolve
      ? schemaValues(pokemonEvolution.types).filter(
          (type) => !pokemon.types.has(type)
        )
      : []
  const lostSynergies =
    pokemonEvolution && willEvolve
      ? schemaValues(pokemon.types).filter(
          (type) => !pokemonEvolution.types.has(type)
        )
      : []

  const canBuy = spectatedPlayer?.alive && spectatedPlayer?.money >= cost

  const stopTouchTooltip = (
    event: React.PointerEvent<HTMLDivElement>,
    suppressClick: boolean,
    cancelled: boolean
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
    if (touchLongPress.current) {
      props.onMobileLongPressEnd?.(
        {
          clientX: event.clientX,
          clientY: event.clientY
        },
        cancelled
      )
    }
    touchLongPress.current = false
    touchPointerId.current = null
    setTouchTooltipOpen(false)
  }

  return (
    <div
      className={cc("my-box", "clickable", "game-pokemon-portrait", {
        shimmer: shouldShimmer,
        disabled: !canBuy && props.origin === "shop",
        planned: props.inPlanner ?? false
      })}
      style={{
        backgroundColor: rarityColor,
        borderColor: rarityColor,
        backgroundImage: `url("${getCachedPortrait(pokemonInPortrait.index, customs)}")`
      }}
      onPointerDown={(event) => {
        if (
          (props.origin !== "shop" && props.origin !== "proposition") ||
          event.pointerType === "mouse" ||
          !event.isPrimary
        ) {
          return
        }
        const pointerId = event.pointerId
        const anchor = event.currentTarget
        suppressTouchClick.current = false

        if (touchTooltipTimer.current !== null) {
          window.clearTimeout(touchTooltipTimer.current)
        }
        setTouchTooltipControlled(true)
        setTouchTooltipOpen(false)
        touchLongPress.current = false
        touchPointerId.current = pointerId
        touchPointerPosition.current = {
          clientX: event.clientX,
          clientY: event.clientY
        }
        anchor.setPointerCapture?.(pointerId)
        touchTooltipTimer.current = window.setTimeout(() => {
          if (touchPointerId.current === pointerId) {
            touchLongPress.current = true
            setTouchTooltipOpen(true)
            if (
              canBuy &&
              props.origin === "shop" &&
              props.onMobileLongPressStart
            ) {
              props.onMobileLongPressStart(
                props.index,
                touchPointerPosition.current,
                anchor.getBoundingClientRect()
              )
            }
          }
          touchTooltipTimer.current = null
        }, 350)
      }}
      onPointerMove={(event) => {
        if (
          event.pointerType === "mouse" ||
          touchPointerId.current !== event.pointerId
        ) {
          return
        }
        touchPointerPosition.current = {
          clientX: event.clientX,
          clientY: event.clientY
        }
        if (touchLongPress.current) {
          props.onMobileLongPressMove?.(touchPointerPosition.current)
        }
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") {
          setTouchTooltipControlled(false)
        }
      }}
      onPointerUp={(event) => stopTouchTooltip(event, true, false)}
      onPointerCancel={(event) => stopTouchTooltip(event, false, true)}
      onPointerLeave={(event) => {
        if (
          touchLongPress.current &&
          props.origin === "shop" &&
          props.onMobileLongPressMove
        ) {
          return
        }
        stopTouchTooltip(event, true, true)
      }}
      onClick={(e) => {
        if (suppressTouchClick.current) {
          suppressTouchClick.current = false
          e.preventDefault()
          e.stopPropagation()
          return
        }
        if (canBuy && props.click) props.click(e)
      }}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      data-tooltip-id={`tooltip-${props.origin}-${props.index}`}
    >
      <Tooltip
        id={`tooltip-${props.origin}-${props.index}`}
        className="custom-theme-tooltip game-pokemon-detail-tooltip"
        place="top"
        isOpen={touchTooltipControlled ? touchTooltipOpen : undefined}
      >
        <GamePokemonDetail
          key={pokemonInPortrait.id}
          pokemon={pokemonInPortrait}
          emotion={pokemonCustom.emotion}
          shiny={pokemonCustom.shiny}
          origin={props.origin}
        />
      </Tooltip>
      {willEvolve && pokemonEvolution && (
        <div className="game-pokemon-portrait-evolution">
          <img
            src={getCachedPortrait(pokemon.index, customs)}
            className="game-pokemon-portrait-evolution-portrait"
          />
          <img
            src="/assets/ui/evolution.png"
            alt=""
            className="game-pokemon-portrait-evolution-icon"
          />
        </div>
      )}
      {props.inPlanner && (!willEvolve || !pokemonEvolution) && (
        <img
          src="/assets/ui/planned.png"
          alt=""
          className="game-pokemon-portrait-planned-icon"
        />
      )}
      {props.origin === "shop" && (
        <div className="game-pokemon-portrait-cost">
          <Money value={cost} />
        </div>
      )}
      <ul className="game-pokemon-portrait-types">
        {Array.from(pokemonInPortrait.types.values()).map((type) => {
          return (
            <li
              key={type}
              className={cc({ gained: gainedSynergies.includes(type) })}
            >
              <SynergyIcon type={type} />
            </li>
          )
        })}
        {lostSynergies.map((type) => (
          <li key={type} className="lost">
            <SynergyIcon type={type} />
          </li>
        ))}
      </ul>
    </div>
  )
}
