import { useEffect, useRef, useState } from "react"
import ReactDOM from "react-dom"
import { useTranslation } from "react-i18next"
import { isSameFamily } from "../../../../../models/pokemon-factory"
import { Pkm } from "../../../../../types/enum/Pokemon"
import { useAppSelector } from "../../../hooks"
import type { IDetailledPokemon } from "../../../models/bot-v2"
import { buyInShop } from "../../../network"
import { getGameScene } from "../../game"
import { playSound, SOUNDS } from "../../utils/audio"
import { LocalStoreKeys, localStore } from "../../utils/store"
import type { MobileQuickActionPointer } from "./game-pokemon-portrait"
import GamePokemonPortrait from "./game-pokemon-portrait"

const QUICK_ACTION_SIZE = 60
const QUICK_ACTION_MARGIN = 8

type ShopQuickActionSide = "left" | "right"

type ShopQuickActionTarget = {
  side: ShopQuickActionSide
  index: number
  left: number
  top: number
  active: boolean
}

function isInsideQuickAction(
  pointer: MobileQuickActionPointer,
  target: ShopQuickActionTarget
) {
  return (
    pointer.clientX >= target.left &&
    pointer.clientX <= target.left + QUICK_ACTION_SIZE &&
    pointer.clientY >= target.top &&
    pointer.clientY <= target.top + QUICK_ACTION_SIZE
  )
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function getQuickActionPositions(detailRect?: DOMRect) {
  const topHudBottom =
    document.getElementById("game-stage-info")?.getBoundingClientRect()
      .bottom ?? 0
  const shopRect = document
    .querySelector<HTMLElement>(".game-shop")
    ?.getBoundingClientRect()
  const shopTop = shopRect?.top ?? window.innerHeight
  const playerRailLeft =
    document.getElementById("game-players")?.getBoundingClientRect().left ??
    window.innerWidth
  const leftBound = Math.max(QUICK_ACTION_MARGIN, shopRect?.left ?? 0)
  const rightBound = Math.max(
    leftBound,
    playerRailLeft - QUICK_ACTION_SIZE - QUICK_ACTION_MARGIN
  )
  const topBound = Math.min(
    window.innerHeight - QUICK_ACTION_SIZE - QUICK_ACTION_MARGIN,
    Math.max(QUICK_ACTION_MARGIN, topHudBottom + QUICK_ACTION_MARGIN)
  )
  const bottomBound = Math.max(
    topBound,
    shopTop - QUICK_ACTION_SIZE - QUICK_ACTION_MARGIN
  )
  const top = detailRect
    ? clamp(
        detailRect.top + detailRect.height / 2 - QUICK_ACTION_SIZE / 2,
        topBound,
        bottomBound
      )
    : clamp((topBound + bottomBound) / 2, topBound, bottomBound)
  const left = detailRect
    ? clamp(
        detailRect.left - QUICK_ACTION_SIZE - QUICK_ACTION_MARGIN,
        leftBound,
        rightBound
      )
    : leftBound
  const right = detailRect
    ? clamp(detailRect.right + QUICK_ACTION_MARGIN, leftBound, rightBound)
    : rightBound

  return [
    { side: "left" as const, left, top },
    { side: "right" as const, left: right, top }
  ]
}

export default function GameStore() {
  const { t } = useTranslation()
  const shop = useAppSelector((state) => state.game.shop)
  const [teamPlanner, setTeamPlanner] = useState<IDetailledPokemon[]>(
    localStore.get(LocalStoreKeys.TEAM_PLANNER)
  )
  const [quickActionTargets, setQuickActionTargets] = useState<
    ShopQuickActionTarget[]
  >([])
  const quickActionTargetsRef = useRef<ShopQuickActionTarget[]>([])
  const quickActionPointerRef = useRef<MobileQuickActionPointer>({
    clientX: 0,
    clientY: 0
  })
  const quickActionPlacementTimer = useRef<number | null>(null)
  useEffect(() => {
    if (teamPlanner && !Array.isArray(teamPlanner)) {
      setTeamPlanner([]) // in case team planner local storage has been corrupted somehow (loading a wrong file for example)
    }
    const updateTeamPlanner = (e: StorageEvent) => {
      if (e.key === LocalStoreKeys.TEAM_PLANNER) {
        setTeamPlanner(localStore.get(LocalStoreKeys.TEAM_PLANNER))
      }
    }
    window.addEventListener("storage", updateTeamPlanner)
    return () => {
      window.removeEventListener("storage", updateTeamPlanner)
    }
  }, [])

  useEffect(
    () => () => {
      if (quickActionPlacementTimer.current !== null) {
        window.clearTimeout(quickActionPlacementTimer.current)
      }
    },
    []
  )

  const scene = getGameScene()

  const updateQuickActionTargets = (targets: ShopQuickActionTarget[]) => {
    quickActionTargetsRef.current = targets
    setQuickActionTargets(targets)
  }

  const startQuickAction = (
    index: number,
    pointer: MobileQuickActionPointer
  ) => {
    quickActionPointerRef.current = pointer
    updateQuickActionTargets(
      getQuickActionPositions().map((position) => ({
        index,
        ...position,
        active: false
      }))
    )

    if (quickActionPlacementTimer.current !== null) {
      window.clearTimeout(quickActionPlacementTimer.current)
    }
    quickActionPlacementTimer.current = window.setTimeout(() => {
      quickActionPlacementTimer.current = null
      if (
        !quickActionTargetsRef.current.some((target) => target.index === index)
      ) {
        return
      }

      const tooltip = document.getElementById(`tooltip-shop-${index}`)
      const style = tooltip ? window.getComputedStyle(tooltip) : null
      const detailRect =
        tooltip &&
        style?.display !== "none" &&
        (style?.opacity !== "0" ||
          tooltip.classList.contains("react-tooltip__show"))
          ? tooltip.getBoundingClientRect()
          : undefined
      const adjustedTargets = getQuickActionPositions(detailRect).map(
        (position) => {
          const target = {
            index,
            ...position,
            active: false
          }
          target.active = isInsideQuickAction(
            quickActionPointerRef.current,
            target
          )
          return target
        }
      )
      updateQuickActionTargets(adjustedTargets)
    }, 80)
  }

  const moveQuickAction = (pointer: MobileQuickActionPointer) => {
    quickActionPointerRef.current = pointer
    const currentTargets = quickActionTargetsRef.current
    if (currentTargets.length === 0) return

    const activeSide = currentTargets.find((target) =>
      isInsideQuickAction(pointer, target)
    )?.side
    if (
      currentTargets.some(
        (target) => target.active !== (target.side === activeSide)
      )
    ) {
      updateQuickActionTargets(
        currentTargets.map((target) => ({
          ...target,
          active: target.side === activeSide
        }))
      )
    }
  }

  const finishQuickAction = (
    pointer: MobileQuickActionPointer,
    cancelled: boolean
  ) => {
    if (quickActionPlacementTimer.current !== null) {
      window.clearTimeout(quickActionPlacementTimer.current)
      quickActionPlacementTimer.current = null
    }
    const target = quickActionTargetsRef.current.find((candidate) =>
      isInsideQuickAction(pointer, candidate)
    )
    updateQuickActionTargets([])
    if (!target || cancelled) return

    playSound(SOUNDS.BUTTON_CLICK)
    scene?.removeFromShop(target.index)
    if (scene) scene.shopIndexHovered = null
  }

  return (
    <>
      <ul className="game-pokemons-store">
        {shop.map((pokemon, index) => {
          if (pokemon != Pkm.DEFAULT) {
            return (
              <GamePokemonPortrait
                key={"shop" + index}
                origin="shop"
                index={index}
                pokemon={pokemon}
                inPlanner={teamPlanner?.some((p) =>
                  isSameFamily(p.name, pokemon)
                )}
                onMouseEnter={() => {
                  if (scene) {
                    if (scene.pokemonHovered) {
                      scene.clearHovered(scene.pokemonHovered.sprite)
                    }
                    scene.pokemonHovered = null
                    scene.shopIndexHovered = index
                  }
                }}
                onMouseLeave={() => {
                  if (scene) scene.shopIndexHovered = null
                }}
                click={(e) => {
                  playSound(SOUNDS.BUTTON_CLICK)
                  buyInShop(index)
                  if (scene) scene.shopIndexHovered = null
                }}
                onMobileLongPressStart={startQuickAction}
                onMobileLongPressMove={moveQuickAction}
                onMobileLongPressEnd={finishQuickAction}
              />
            )
          } else {
            return (
              <GamePokemonPortrait
                key={"shop" + index}
                origin="shop"
                index={index}
                pokemon={undefined}
              />
            )
          }
        })}
      </ul>
      {quickActionTargets.length > 0 &&
        ReactDOM.createPortal(
          <>
            {quickActionTargets.map((target) => (
              <div
                key={target.side}
                className={`mobile-shop-quick-action mobile-shop-quick-action-${target.side}${target.active ? " active" : ""}`}
                style={{
                  left: target.left,
                  top: target.top
                }}
              >
                <img src="/assets/ui/trash.svg" alt={t("drop_here_to_sell")} />
              </div>
            ))}
          </>,
          document.body
        )}
    </>
  )
}
