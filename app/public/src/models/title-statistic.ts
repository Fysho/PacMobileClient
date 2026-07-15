import type { ITitleStatistic } from "../../../types/models/title-statistic"
import { pacFetch } from "../pac-api"

export type { ITitleStatistic } from "../../../types/models/title-statistic"

export async function fetchTitles(): Promise<ITitleStatistic[]> {
  return pacFetch("/titles").then((res) => res.json())
}
