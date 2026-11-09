/** The mascots of the waits, from the sticker sheets of the Product file (Additional assets). */
export const mascots = {
  chatting: '/mascots/reading.webp', searching: '/mascots/searching.webp', working: '/mascots/laptop.webp',
  home: '/mascots/home.webp', looking: '/mascots/looking.webp', starry: '/mascots/starry.webp', loving: '/mascots/loving.webp',
} as const
export type Mascot = keyof typeof mascots

/**
 * The wait of a page or a list: a moving mascot of its page, and the words for a screen reader. Each wait names its mascot:
 * Messages chats, Saved loves, Listings hugs a house, a place and the onboarding look through binoculars, a profile is starry,
 * the chat searches, the admin works at a laptop. It fills its place and sits in the middle: `page` takes the height of the screen,
 * and in a page it takes at least half of the screen, so it is near the middle also where the page has no height.
 */
export function Loading({ mascot, page }: { mascot: Mascot; page?: boolean }) {
  return (
    <div role="status" className={`flex flex-1 flex-col items-center justify-center gap-2 font-playful text-lg font-semibold text-secondary ${page ? 'min-h-dvh' : 'min-h-[55dvh]'}`}>
      <img src={mascots[mascot]} alt="" width={160} height={160} className="size-28 motion-safe:animate-mascot lg:size-32" />
      Loading…
    </div>
  )
}
