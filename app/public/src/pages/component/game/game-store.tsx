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

type ShopQuickActionTarget = {
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

function overlapsQuickAction(
  target: Pick<ShopQuickActionTarget, "left" | "top">,
  occupiedRect: DOMRect
) {
  return (
    target.left < occupiedRect.right + QUICK_ACTION_MARGIN &&
    target.left + QUICK_ACTION_SIZE > occupiedRect.left - QUICK_ACTION_MARGIN &&
    target.top < occupiedRect.bottom + QUICK_ACTION_MARGIN &&
    target.top + QUICK_ACTION_SIZE > occupiedRect.top - QUICK_ACTION_MARGIN
  )
}

function getQuickActionPosition(
  sourceRect: DOMRect,
  occupiedRects: DOMRect[] = []
) {
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
  const left = Math.max(QUICK_ACTION_MARGIN, shopRect?.left ?? 0)
  const right = Math.max(
    left,
    playerRailLeft - QUICK_ACTION_SIZE - QUICK_ACTION_MARGIN
  )
  const top = Math.min(
    window.innerHeight - QUICK_ACTION_SIZE - QUICK_ACTION_MARGIN,
    Math.max(QUICK_ACTION_MARGIN, topHudBottom + QUICK_ACTION_MARGIN)
  )
  const bottom = Math.max(
    top,
    shopTop - QUICK_ACTION_SIZE - QUICK_ACTION_MARGIN
  )
  const sourceCenterX = sourceRect.left + sourceRect.width / 2
  const sourceCenterY = sourceRect.top + sourceRect.height / 2
  const candidates = [
    { left, top },
    { left: right, top },
    { left, top: bottom },
    { left: right, top: bottom }
  ].sort((candidateA, candidateB) => {
    const deltaAX = candidateA.left + QUICK_ACTION_SIZE / 2 - sourceCenterX
    const deltaAY = candidateA.top + QUICK_ACTION_SIZE / 2 - sourceCenterY
    const deltaBX = candidateB.left + QUICK_ACTION_SIZE / 2 - sourceCenterX
    const deltaBY = candidateB.top + QUICK_ACTION_SIZE / 2 - sourceCenterY
    return (
      deltaAX * deltaAX +
      deltaAY * deltaAY -
      (deltaBX * deltaBX + deltaBY * deltaBY)
    )
  })

  return (
    candidates.find((candidate) =>
      occupiedRects.every(
        (occupiedRect) => !overlapsQuickAction(candidate, occupiedRect)
      )
    ) ?? candidates[candidates.length - 1]
  )
}

export default function GameStore() {
  const { t } = useTranslation()
  const shop = useAppSelector((state) => state.game.shop)
  const [teamPlanner, setTeamPlanner] = useState<IDetailledPokemon[]>(
    localStore.get(LocalStoreKeys.TEAM_PLANNER)
  )
  const [quickActionTarget, setQuickActionTarget] =
    useState<ShopQuickActionTarget | null>(null)
  const quickActionTargetRef = useRef<ShopQuickActionTarget | null>(null)
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

  const updateQuickActionTarget = (target: ShopQuickActionTarget | null) => {
    quickActionTargetRef.current = target
    setQuickActionTarget(target)
  }

  const startQuickAction = (
    index: number,
    pointer: MobileQuickActionPointer,
    sourceRect: DOMRect
  ) => {
    quickActionPointerRef.current = pointer
    const position = getQuickActionPosition(sourceRect)
    updateQuickActionTarget({
      index,
      ...position,
      active: false
    })

    if (quickActionPlacementTimer.current !== null) {
      window.clearTimeout(quickActionPlacementTimer.current)
    }
    quickActionPlacementTimer.current = window.setTimeout(() => {
      quickActionPlacementTimer.current = null
      if (quickActionTargetRef.current?.index !== index) return

      const visibleDetailRects = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".react-tooltip.game-pokemon-detail-tooltip"
        )
      )
        .filter((tooltip) => {
          const style = window.getComputedStyle(tooltip)
          return (
            style.display !== "none" &&
            (style.opacity !== "0" ||
              tooltip.classList.contains("react-tooltip__show"))
          )
        })
        .map((tooltip) => tooltip.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0)
      const adjustedPosition = getQuickActionPosition(
        sourceRect,
        visibleDetailRects
      )
      const adjustedTarget = {
        index,
        ...adjustedPosition,
        active: false
      }
      adjustedTarget.active = isInsideQuickAction(
        quickActionPointerRef.current,
        adjustedTarget
      )
      updateQuickActionTarget(adjustedTarget)
    }, 80)
  }

  const moveQuickAction = (pointer: MobileQuickActionPointer) => {
    quickActionPointerRef.current = pointer
    const currentTarget = quickActionTargetRef.current
    if (!currentTarget) return

    const active = isInsideQuickAction(pointer, currentTarget)
    if (active !== currentTarget.active) {
      updateQuickActionTarget({ ...currentTarget, active })
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
    const target = quickActionTargetRef.current
    updateQuickActionTarget(null)
    if (!target || cancelled || !isInsideQuickAction(pointer, target)) return

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
      {quickActionTarget &&
        ReactDOM.createPortal(
          <div
            className={`mobile-shop-quick-action${quickActionTarget.active ? " active" : ""}`}
            style={{
              left: quickActionTarget.left,
              top: quickActionTarget.top
            }}
          >
            <img src="/assets/ui/trash.svg" alt={t("drop_here_to_sell")} />
          </div>,
          document.body
        )}
    </>
  )
}
