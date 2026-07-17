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

function getQuickActionPositions() {
  const shopRect = document
    .querySelector<HTMLElement>(".game-shop")
    ?.getBoundingClientRect()
  const playerRailLeft =
    document.getElementById("game-players")?.getBoundingClientRect().left ??
    window.innerWidth
  const left = Math.max(QUICK_ACTION_MARGIN, shopRect?.left ?? 0)
  const right = Math.max(
    left,
    playerRailLeft - QUICK_ACTION_SIZE - QUICK_ACTION_MARGIN
  )
  const top = Math.max(
    QUICK_ACTION_MARGIN,
    (shopRect?.top ?? window.innerHeight) -
      QUICK_ACTION_SIZE -
      QUICK_ACTION_MARGIN
  )

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

  const scene = getGameScene()

  const updateQuickActionTargets = (targets: ShopQuickActionTarget[]) => {
    quickActionTargetsRef.current = targets
    setQuickActionTargets(targets)
  }

  const startQuickAction = (index: number) => {
    updateQuickActionTargets(
      getQuickActionPositions().map((position) => ({
        index,
        ...position,
        active: false
      }))
    )
  }

  const moveQuickAction = (pointer: MobileQuickActionPointer) => {
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
