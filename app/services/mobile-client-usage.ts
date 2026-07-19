import { createHash } from "node:crypto"
import MobileClientUsage from "../models/mongo-models/mobile-client-usage"
import {
  MOBILE_CLIENT_ID,
  type MobileClientUsageEvent
} from "../types/mobile-client-usage"

const eventFields = {
  authenticated: {
    lastSeenField: "lastAuthenticatedAt",
    countField: "sessionCount"
  },
  lobby_joined: {
    lastSeenField: "lastLobbyJoinedAt",
    countField: "lobbyJoinCount"
  },
  game_joined: {
    lastSeenField: "lastGameJoinedAt",
    countField: "gameJoinCount"
  }
} as const satisfies Record<
  MobileClientUsageEvent,
  { lastSeenField: string; countField: string }
>

function hashUserId(uid: string): string {
  return createHash("sha256").update(uid).digest("hex")
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  )
}

export async function recordMobileClientUsage(
  uid: string,
  event: MobileClientUsageEvent
): Promise<void> {
  const userHash = hashUserId(uid)
  const now = new Date()
  const fields = eventFields[event]
  const filter = { userHash, client: MOBILE_CLIENT_ID }
  const update = {
    $setOnInsert: { firstSeenAt: now },
    $set: {
      lastSeenAt: now,
      [fields.lastSeenField]: now
    },
    $inc: { [fields.countField]: 1 }
  }

  try {
    await MobileClientUsage.updateOne(filter, update, { upsert: true })
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error
    await MobileClientUsage.updateOne(filter, update)
  }
}

export async function countUniqueMobileClientUsers(): Promise<number> {
  return MobileClientUsage.countDocuments({ client: MOBILE_CLIENT_ID })
}
