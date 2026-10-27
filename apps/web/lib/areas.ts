import { maxProfileAreas, type AreasResponse } from '@roomsie/contract'

export type Area = AreasResponse['areas'][number]
export type AreaTree = ReturnType<typeof areaTree>

const searchable = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '')

/** The areas of the API as groups, sub-areas and pockets (PD2), in the order of the designs. */
export function areaTree(areas: readonly Area[]) {
  const bySlug = new Map(areas.map((a) => [a.slug, a]))
  const lineage = (slug: string): string[] => {
    const parent = bySlug.get(slug)?.parent
    return parent ? [slug, ...lineage(parent)] : [slug]
  }
  return {
    groups: areas.filter((a) => !a.parent),
    under: (slug: string) => areas.filter((a) => a.parent === slug),
    lineage,
    /** A pocket shows with its parent: "Versova, Andheri West". */
    label(slug: string) {
      const area = bySlug.get(slug)
      const parent = area?.parent ? bySlug.get(area.parent) : undefined
      return area && (parent?.parent ? `${area.name}, ${parent.name}` : area.name)
    },
    parentName: (area: Area) => (area.parent ? bySlug.get(area.parent)?.name : undefined),
    search(query: string) {
      const q = searchable(query)
      return q ? areas.filter((a) => [a.name, ...a.aliases].some((name) => searchable(name).includes(q))) : []
    },
  }
}

/** The Where step: the group, the sub-area and the pocket of the saved area. A listing from before can have only a group. */
export function subAreaChoice(tree: AreaTree, areaSlug: string | null | undefined) {
  const [group = null, subArea = null, pocket = null] = areaSlug ? tree.lineage(areaSlug).reverse() : []
  return { group, subArea, pocket }
}

/** The wider pick wins: a pick under a picked area is covered, and a new pick removes the picks under it. */
export function chipState(tree: AreaTree, picks: readonly string[], slug: string): 'picked' | 'covered' | 'full' | 'free' {
  if (picks.includes(slug)) return 'picked'
  if (tree.lineage(slug).some((above) => picks.includes(above))) return 'covered'
  return picks.length >= maxProfileAreas ? 'full' : 'free'
}

export function pickArea(tree: AreaTree, picks: readonly string[], slug: string): string[] {
  const state = chipState(tree, picks, slug)
  if (state === 'picked') return picks.filter((p) => p !== slug)
  if (state !== 'free') return [...picks]
  return [...picks.filter((p) => !tree.lineage(p).includes(slug)), slug]
}
