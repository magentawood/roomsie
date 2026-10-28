const phrases = [
  'Find a flatmate for me, vegetarian preferred',
  'pg near andheri station with food',
  '3bhk for 4 friends, bachelors ok, near metro',
  '1bhk for me and my partner, we’re not married',
]

function Phrases({ copy }: { copy?: boolean }) {
  return (
    <ul aria-hidden={copy} className="flex shrink-0 items-center gap-3 pr-3 md:gap-4 md:pr-4">
      {phrases.map((phrase) => (
        <li key={phrase} className="flex items-center gap-3 md:gap-4">
          <span className="text-xs font-medium whitespace-nowrap text-primary md:px-2.5 md:py-1.5 md:text-md xl:p-2.5 xl:text-xl">{phrase}</span>
          <span aria-hidden className="size-1.75 rounded-full bg-dot-accent md:size-3" />
        </li>
      ))}
    </ul>
  )
}

/** Example searches. The row moves, stops under the pointer, and stays still for a person who turns off motion. */
export function SearchStrip() {
  return (
    <section aria-label="Example searches" className="overflow-hidden bg-strip-glow">
      <div className="flex w-max animate-marquee py-3 pl-4 pause-on-hover motion-reduce:animate-none md:py-1 md:pl-0 xl:py-2">
        <Phrases />
        <Phrases copy />
      </div>
    </section>
  )
}
