import { BASE_URL } from "../../config"

export function pacUrl(path: string): string {
  if (!path.startsWith("/")) {
    return path
  }
  return `${BASE_URL}${path}`
}

export function pacFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  return fetch(typeof input === "string" ? pacUrl(input) : input, init)
}
