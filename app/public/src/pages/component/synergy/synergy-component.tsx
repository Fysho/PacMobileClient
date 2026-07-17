import { useTranslation } from "react-i18next"
import { SynergyTriggers } from "../../../../../config"
import type { Synergy } from "../../../../../types/enum/Synergy"
import { selectSpectatedPlayer, useAppSelector } from "../../../hooks"
import { getGameScene } from "../../game"
import SynergyIcon from "../icons/synergy-icon"

export default function SynergyComponent(props: {
  type: Synergy
  value: number
  index: number
  onHoverStart: () => void
  onHoverEnd: () => void
  onPressStart: () => void
  onPressEnd: () => void
}) {
  const { t } = useTranslation()
  const levelReached = SynergyTriggers[props.type]
    .filter((n) => n <= props.value)
    .at(-1)

  const spectatedPlayer = useAppSelector(selectSpectatedPlayer)
  const highlightSynergy = (type: Synergy) => {
    const scene = getGameScene()
    if (!scene) return
    if (!spectatedPlayer?.board) return
    spectatedPlayer.board.forEach((p) => {
      if (p.types.has(type)) {
        const sprite = scene.board?.pokemons.get(p.id)?.sprite
        if (sprite) {
          scene.setHovered(sprite, 4)
        }
      }
    })
  }

  const removeHighlightSynergy = (type: Synergy) => {
    const scene = getGameScene()
    if (!scene) return
    spectatedPlayer?.board.forEach((p) => {
      if (p.types.has(type)) {
        const sprite = scene.board?.pokemons.get(p.id)?.sprite
        if (sprite) {
          scene.clearHovered(sprite)
        }
      }
    })
  }

  return (
    <div
      className="game-synergy-row"
      style={{
        backgroundColor:
          props.value >= SynergyTriggers[props.type][0]
            ? "var(--color-bg-secondary)"
            : "rgba(84, 89, 107,0)",
        border:
          props.value >= SynergyTriggers[props.type][0]
            ? "var(--border-thin)"
            : "none"
      }}
      data-tooltip-id="detail-synergy"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") {
          highlightSynergy(props.type)
          props.onHoverStart()
        }
      }}
      onPointerLeave={(event) => {
        removeHighlightSynergy(props.type)
        if (event.pointerType === "mouse") {
          props.onHoverEnd()
        } else {
          props.onPressEnd()
        }
      }}
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse" && event.isPrimary) {
          event.currentTarget.setPointerCapture?.(event.pointerId)
          highlightSynergy(props.type)
          props.onPressStart()
        }
      }}
      onPointerUp={(event) => {
        if (event.pointerType !== "mouse") {
          removeHighlightSynergy(props.type)
          props.onPressEnd()
        }
      }}
      onPointerCancel={(event) => {
        if (event.pointerType !== "mouse") {
          removeHighlightSynergy(props.type)
          props.onPressEnd()
        }
      }}
    >
      <SynergyIcon type={props.type} className="game-synergy-row-icon" />
      <span
        className="game-synergy-count"
        style={{
          color: levelReached ? "#ffffff" : "#b8b8b8"
        }}
      >
        {props.value}
      </span>
      <div className="game-synergy-labels">
        <div className="game-synergy-triggers">
          {SynergyTriggers[props.type].map((t) => {
            return (
              <span
                key={t}
                style={{
                  color:
                    levelReached === t
                      ? "var(--color-fg-gold)"
                      : props.value >= t
                        ? "var(--color-fg-primary)"
                        : "var(--color-fg-secondary)"
                }}
              >
                {t}
              </span>
            )
          })}
        </div>
        <p className="game-synergy-name">{t(`synergy.${props.type}`)}</p>
      </div>
    </div>
  )
}
