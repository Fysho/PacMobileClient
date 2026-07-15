import type { IRegionStatistic } from "../../../types/models/regions-statistic"
import { pacFetch } from "../pac-api"

export type { IRegionStatistic } from "../../../types/models/regions-statistic"

export async function fetchMetaRegions(): Promise<IRegionStatistic[]> {
  return pacFetch(`/meta/regions?t=${new Date().getUTCDate()}`).then((res) =>
    res.json()
  )
}
