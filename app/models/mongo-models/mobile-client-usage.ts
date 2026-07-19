import { model, Schema } from "mongoose"
import type { MOBILE_CLIENT_ID } from "../../types/mobile-client-usage"

export interface IMobileClientUsage {
  userHash: string
  client: typeof MOBILE_CLIENT_ID
  firstSeenAt: Date
  lastSeenAt: Date
  lastAuthenticatedAt?: Date
  lastLobbyJoinedAt?: Date
  lastGameJoinedAt?: Date
  sessionCount: number
  lobbyJoinCount: number
  gameJoinCount: number
}

const mobileClientUsageSchema = new Schema<IMobileClientUsage>(
  {
    userHash: {
      type: String,
      required: true
    },
    client: {
      type: String,
      required: true
    },
    firstSeenAt: {
      type: Date,
      required: true
    },
    lastSeenAt: {
      type: Date,
      required: true
    },
    lastAuthenticatedAt: Date,
    lastLobbyJoinedAt: Date,
    lastGameJoinedAt: Date,
    sessionCount: {
      type: Number,
      default: 0
    },
    lobbyJoinCount: {
      type: Number,
      default: 0
    },
    gameJoinCount: {
      type: Number,
      default: 0
    }
  },
  { versionKey: false }
)

mobileClientUsageSchema.index({ client: 1, userHash: 1 }, { unique: true })
mobileClientUsageSchema.index({ client: 1, lastSeenAt: -1 })

export default model<IMobileClientUsage>(
  "MobileClientUsage",
  mobileClientUsageSchema
)
