export const MOBILE_CLIENT_ID = "pac-mobile" as const

export const MOBILE_CLIENT_USAGE_EVENTS = [
  "authenticated",
  "lobby_joined",
  "game_joined"
] as const

export type MobileClientUsageEvent = (typeof MOBILE_CLIENT_USAGE_EVENTS)[number]

export interface MobileClientUsageRequest {
  client: typeof MOBILE_CLIENT_ID
  event: MobileClientUsageEvent
}

export interface MobileClientUsageCountResponse {
  uniqueUsers: number
}

export function isMobileClientUsageEvent(
  value: unknown
): value is MobileClientUsageEvent {
  return MOBILE_CLIENT_USAGE_EVENTS.some((event) => event === value)
}
