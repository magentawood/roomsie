import { replyBlocks } from '../../lib/chat'

/** The text of a reply: its lines, and the points of the advisor as a list (`replyBlocks`). */
export function ReplyText({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 text-md text-primary">
      {replyBlocks(text).map((block, i) => (block.kind === 'list'
        ? <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5 marker:text-fg-quaternary">{block.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
        : <p key={i} className="whitespace-pre-wrap">{block.text}</p>))}
    </div>
  )
}
