import Link from 'next/link'
import { Logo } from '../shell/logo'
import { HeaderAction } from './header-action'
import { LoopVideo } from './loop-video'
import { Container, Mascot, StartLooking } from './parts'

export function LandingHeader() {
  return (
    <header>
      <Container className="flex items-center justify-between pt-4.5 pb-4 xl:h-24 xl:px-12 xl:py-0">
        <Link href="/" className="rounded-md text-primary outline-focus-ring focus-visible:outline-2">
          <Logo className="h-7.5 w-auto xl:h-10.75" />
        </Link>
        <HeaderAction />
      </Container>
    </header>
  )
}

export function Hero() {
  return (
    <Container className="flex flex-col gap-6 pt-10 pb-3 md:gap-12 md:pt-8 md:pb-2 xl:pt-17.75">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="relative flex flex-col gap-3.5 md:max-w-116.5 md:gap-2.75 xl:max-w-183">
          <h1 className="max-w-70 text-display-sm font-medium text-primary md:max-w-none md:text-display-md xl:text-display-xl">
            Find where you’ll live. And who with.
          </h1>
          <Mascot name="sunglasses" className="-top-6.5 left-57.75 size-16 md:-top-14 md:left-100 md:size-26 xl:-top-10.75 xl:left-169 xl:size-31.75" />
          <p className="text-sm text-secondary md:text-md md:font-medium xl:text-xl">
            Roomsie finds flats, flatmates and rented accommodations made for you based on your preferences, and your needs.
          </p>
        </div>
        <span className="shrink-0"><StartLooking /></span>
      </div>
      <div className="aspect-8/5 overflow-hidden rounded-2xl border border-primary shadow-md">
        <LoopVideo src="/landing/film.mp4" phoneSrc="/landing/film-720.mp4" poster="/landing/film-poster.jpg" className="size-full object-cover"
          label="A short film of Roomsie: a person types what they want, and Roomsie shows matching places and people" />
      </div>
    </Container>
  )
}
