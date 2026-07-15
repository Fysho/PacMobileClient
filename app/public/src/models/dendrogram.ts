import type { IDendrogram } from "../../../types/models/dendrogram"
import { pacFetch } from "../pac-api"

export type {
  IBranchProfile,
  IClusterProfile,
  IDendrogram,
  IDendrogramNode
} from "../../../types/models/dendrogram"

export async function fetchDendrogram(): Promise<IDendrogram | null> {
  return pacFetch("/dendrogram").then((res) => res.json())
}
