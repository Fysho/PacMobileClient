import type { IPlayerRankDistribution } from "../../../types/models/player-rank-distribution"
import { pacFetch } from "../pac-api"

export type {
  IPlayerRankDistribution,
  IPlayerRankDistributionBucket
} from "../../../types/models/player-rank-distribution"

export async function fetchPlayerRankDistribution(): Promise<IPlayerRankDistribution> {
  const response = await pacFetch(
    `/meta/player-rank-distribution?t=${new Date().getUTCDate()}`
  )
  if (!response.ok) {
    throw new Error(
      `Failed to fetch player rank distribution: ${response.status}`
    )
  }
  return response.json()
}
