import type { ReactNode } from 'react'
import { LoopVideo } from './loop-video'
import { Container, SectionHeading } from './parts'

function Step({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-primary bg-primary shadow-step-sm md:w-90.5 xl:w-auto xl:flex-1 xl:shadow-step">
      <div className="h-72.5 xl:h-79">{children}</div>
      <div className="flex flex-col gap-1 border-t border-primary bg-secondary p-4 xl:p-5">
        <h3 className="text-lg font-semibold text-primary xl:text-xl">{title}</h3>
        <p className="text-sm text-secondary xl:text-xl xl:text-primary">{text}</p>
      </div>
    </li>
  )
}

export function HowItWorks() {
  return (
    <Container className="flex flex-col gap-6 py-14 md:gap-12 md:py-12 xl:py-24">
      <SectionHeading className="text-primary">Roomsie does it for you simply</SectionHeading>
      <ol className="flex flex-col gap-6 md:flex-row md:flex-wrap md:justify-center xl:flex-nowrap xl:gap-9.75">
        <Step title="Tell it." text="Type it in English or Hinglish. No problem.">
          <LoopVideo src="/landing/tell.mp4" poster="/landing/tell-poster.jpg" className="size-full object-cover" />
        </Step>
        <Step title="It searches." text="Only those listings that fit and accept you.">
          <LoopVideo src="/landing/search.mp4" poster="/landing/search-poster.jpg" className="size-full object-cover" />
        </Step>
        <Step title="You decide." text="Shortlist people or flats. Share and visit them easily.">
          <LoopVideo src="/landing/you-decide.mp4" phoneSrc="/landing/you-decide-phone.mp4" poster="/landing/you-decide-poster.jpg" className="size-full object-cover" />
        </Step>
      </ol>
    </Container>
  )
}
