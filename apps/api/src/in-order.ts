/** The rows in the order of the ids. An id with no row is left out. */
export const inOrder = <T extends { id: string }>(ids: string[], rows: T[]) => {
  const byId = new Map(rows.map((r) => [r.id, r]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}
