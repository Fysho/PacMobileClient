import firebase from "firebase/compat/app"
import type { ITypeStatistics } from "../../../types/meta"
import type { IPokemonsStatisticV2 } from "../../../types/models/pokemons-statistic-v2"
import { pacFetch } from "../pac-api"

export type {
  IHistoryEntry,
  IPokemonStatV2,
  IPokemonsStatisticV2
} from "../../../types/models/pokemons-statistic-v2"

export async function fetchMetaPokemons(): Promise<IPokemonsStatisticV2[]> {
  return pacFetch(`/meta/pokemons?t=${new Date().getUTCDate()}`).then((res) =>
    res.json()
  )
}

export async function fetchMetaTypes(): Promise<ITypeStatistics> {
  const token = await firebase.auth().currentUser?.getIdToken()
  return pacFetch(`/meta/types?t=${new Date().getUTCDate()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).then((res) => res.json())
}
