const DEFAULT_BASE_URL = "https://pokemon-auto-chess.com"
const configuredBaseUrl =
  process.env.PAC_HTTP_ORIGIN ||
  (typeof window !== "undefined" ? window.location.origin : DEFAULT_BASE_URL)

export const BASE_URL = configuredBaseUrl.replace(/\/+$/, "")
export const PAC_WS_ORIGIN = (
  process.env.PAC_WS_ORIGIN || BASE_URL.replace(/^http/, "ws")
).replace(/\/+$/, "")

export const MAX_POOL_CONNECTIONS_SIZE = 16
export const MAX_CONCURRENT_PLAYERS_ON_SERVER = 1000
export const MAX_CONCURRENT_PLAYERS_ON_LOBBY = 500
export const MAX_PLAYERS_PER_GAME = 8
export const MIN_HUMAN_PLAYERS = process.env.MIN_HUMAN_PLAYERS
  ? parseInt(process.env.MIN_HUMAN_PLAYERS)
  : 1
export const INACTIVITY_TIMEOUT = 60 * 1000 * 30 // 30 minutes

export const MAX_SIMULATION_DELTA_TIME = 50 // milliseconds
export const MAX_LOADING_TIME = 3 * 60 * 1000 // 3 minutes max of loading before forcing game start
