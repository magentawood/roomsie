import { User01 } from '@untitledui/icons'
import { Container, Mascot, SectionHeading } from './parts'

/** `me`: the right side. A line with no name continues the line before it. */
type Line = { me: boolean; name?: string; text: string }

const chats: { lines: Line[]; className: string }[] = [
  {
    lines: [
      { me: true, name: 'Meena (Student)', text: 'Sir the 20k Flat near Mithibai college, still available?' },
      { me: false, name: 'Broker 😈', text: 'Yes yes available. Come today at 5. I will show you' },
      { me: true, name: 'Meena (Student)', text: 'Ok sir coming. Wohi waala chahiye mast laga wo mujhe' },
      { me: false, name: 'Broker 😈', text: 'That one gone. I have another, 27k. Come see.' },
    ],
    className: 'ml-3.5 rotate-5 md:mt-4.5 md:ml-0 md:-rotate-7',
  },
  {
    lines: [
      { me: true, name: 'Meena (Student)', text: 'I posted the flat on facebook' },
      { me: true, text: '15 days no replies. ab kya kru?' },
      { me: false, name: 'Chandu', text: 'Post again. Purani posts logo ko dikhti nahi hai.' },
      { me: true, name: 'Meena (Student)', text: 'Bohot baar post kiya yaar, post doesnt get much traction...' },
      { me: false, name: 'Chandu', text: 'Baar baar karoge to hi hoga...' },
    ],
    className: '-mt-1 ml-3.5 -rotate-8 md:mt-7 md:-ml-7.75 md:rotate-11 xl:-ml-1',
  },
  {
    lines: [
      { me: true, name: 'Rahul', text: 'Anyone know a place in goregaon? Under 15k' },
      { me: false, name: 'Mahesh', text: 'What kind?' },
      { me: true, name: 'Meena (Student)', text: 'Honestly I just want a flatmate who isn’t messy and doesn’t mind me cooking non-veg' },
      { me: false, name: 'Mahesh', text: 'Yeah no app tells you that lol. I’ll ask around' },
    ],
    className: 'ml-3.5 rotate-7 md:mt-5 md:-ml-7.75 md:-rotate-8 xl:-ml-1',
  },
]

function Bubble({ line }: { line: Line }) {
  return (
    <div className={`flex flex-col gap-1.5 ${line.me ? 'w-90' : 'w-79'}`}>
      {line.name && (
        <p className="flex items-center gap-2">
          <span className="flex-1 truncate text-sm font-medium text-secondary">{line.name}</span>
          <span className="flex items-center gap-0.5 text-xs text-tertiary">
            Friday 2:20pm
            {line.me && <img src="/landing/icons/check-read.svg" alt="" width={16} height={16} />}
          </span>
        </p>
      )}
      <p className={`rounded-lg border border-secondary px-3 py-2 text-md text-primary ${line.me ? 'rounded-tr-none bg-primary' : 'rounded-tl-none bg-secondary'}`}>{line.text}</p>
    </div>
  )
}

/** A chat of the old way to search. On a phone and a tablet, the card shows at 64%. */
function ChatCard({ lines }: { lines: Line[] }) {
  return (
    <div className="flex w-118.75 flex-col gap-0.75 rounded-xl border border-primary bg-primary p-5 shadow-tilt zoom-64 xl:zoom-100">
      {lines.map((line, i) => line.me
        ? <div key={i} className={`flex flex-col items-end p-2.5 ${line.name ? '' : 'pt-0'} ${lines[i + 1] && !lines[i + 1]!.name ? 'pb-0' : ''}`}><Bubble line={line} /></div>
        : (
          <div key={i} className="flex items-start gap-3 p-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-secondary bg-tertiary">
              <User01 size={19} aria-hidden className="text-fg-quaternary" />
            </span>
            <Bubble line={line} />
          </div>
        ))}
    </div>
  )
}

export function Problems() {
  return (
    <section className="overflow-x-clip">
      <Container className="flex flex-col gap-6 pt-8 pb-14 md:gap-16 md:py-12 xl:py-24">
        <SectionHeading className="text-primary xl:whitespace-nowrap">We tackle the problems you normally have...</SectionHeading>
        <div className="relative flex flex-col items-start md:flex-row md:justify-center md:pb-7 xl:items-center xl:py-10">
          {chats.map((chat, i) => (
            <div key={i} className={`shrink-0 ${chat.className}`}><ChatCard lines={chat.lines} /></div>
          ))}
          <Mascot name="confused" className="top-59 left-61.5 size-26 md:-top-15.75 md:left-115.75 md:size-31.5 xl:-top-10.5 xl:left-204.5 xl:h-46.5 xl:w-45 xl:-rotate-13" />
          <Mascot name="angry" className="top-136 -left-4 size-26 md:top-65.25 md:left-37.25 md:size-31.5 xl:top-108.5 xl:left-75.75 xl:h-45.75 xl:w-45" />
        </div>
      </Container>
    </section>
  )
}
