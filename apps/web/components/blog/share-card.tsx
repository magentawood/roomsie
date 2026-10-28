import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { siteUrl } from '../../lib/site'
import { Logo } from '../shell/logo'

export const shareCardSize = { width: 1200, height: 630 }
const fullCard = { position: 'absolute', top: 0, left: 0, ...shareCardSize } as const

/** The picture of a shared link, as Substack makes it: the cover under a dark overlay, the logo and the title (T-37). */
export async function shareCard(title: string, cover: string | null) {
  const [font, image] = await Promise.all([
    readFile(join(process.cwd(), 'assets/figtree-600.woff')),
    cover && readFile(join(process.cwd(), 'public', cover)),
  ])
  const src = image && `data:image/${cover!.endsWith('.png') ? 'png' : 'jpeg'};base64,${image.toString('base64')}`
  // A PNG, not HTML: the style-prop rule of web.md guards the policy, so it does not apply.
  // The renderer reads no CSS variables: #171717 is --color-gray-900, the background of the footer.
  return new ImageResponse(
    (
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%', padding: 64, color: '#fff', backgroundColor: '#171717', fontFamily: 'Figtree' }}>
        {src && <img src={src} alt="" {...shareCardSize} style={{ ...fullCard, objectFit: 'cover' }} />}
        {src && <div style={{ ...fullCard, backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.85))' }} />}
        <Logo width={212} height={52} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', fontSize: 56, lineHeight: 1.2 }}>{title}</div>
          <div style={{ display: 'flex', fontSize: 26 }}>{`${new URL(siteUrl).host}/blog`}</div>
        </div>
      </div>
    ),
    { ...shareCardSize, fonts: [{ name: 'Figtree', data: font, weight: 600, style: 'normal' }] },
  )
}
