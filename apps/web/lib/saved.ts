/** The tabs of the Listings page that hold what a person saved. A plain module, so the server redirect of /saved reads it too. */
export const savedHref = { places: '/listings?tab=places', people: '/listings?tab=people' } as const
