import type { IMetaV2 } from "../../../types/models/meta-v2"
import { pacFetch } from "../pac-api"

export type {
  IMeanTeam,
  IMetaV2,
  ITopTeam
} from "../../../types/models/meta-v2"

export async function fetchMetaV2(): Promise<IMetaV2[]> {
  return pacFetch(`/meta-v2?t=${new Date().getUTCDate()}`).then((res) =>
    res.json()
  )
}
