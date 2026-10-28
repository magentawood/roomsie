import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseArticle, readArticles } from '../src/articles/parse'

const frontMatter = {
  number: '4',
  title: '"Getting your deposit back: what the agreement needs to say"',
  author: '"Asha Rao"',
  author_line: '"Rented in Andheri for six years"',
  main_keyword: '"deposit refund mumbai"',
  related_keywords: '["security deposit"]',
  seo_title: '"Getting your rent deposit back in Mumbai"',
  seo_description: '"What your leave and licence agreement must say so the deposit comes back."',
  date_checked: '2026-10-08',
  cover_image: '"/blog/deposit-back.jpg"',
  cover_alt: '"An empty living room on the day of the handover"',
  sources: '[]',
}
const body = `Most deposits come back in full when the agreement names **the deductions**.

## How long can a landlord keep the deposit?

Two to three months is usual. <script>alert(1)</script>

## What can a landlord deduct?

- Unpaid rent
- Damage beyond wear and tear
`
function source(fields: Record<string, string | undefined> = frontMatter) {
  const lines = Object.entries(fields).flatMap(([key, value]) => (value === undefined ? [] : [`${key}: ${value}`]))
  return `---\n${lines.join('\n')}\n---\n${body}`
}

describe('parseArticle', () => {
  it('reads the front matter, the slug of the file name and one passage for each ## section', () => {
    const article = parseArticle('04-deposit-back.md', source())
    expect(article).toMatchObject({
      slug: 'deposit-back',
      number: 4,
      title: 'Getting your deposit back: what the agreement needs to say',
      author: 'Asha Rao',
      authorLine: 'Rented in Andheri for six years',
      authorPhoto: null,
      seoTitle: 'Getting your rent deposit back in Mumbai',
      seoDescription: 'What your leave and licence agreement must say so the deposit comes back.',
      dateChecked: '2026-10-08',
      coverImage: '/blog/deposit-back.jpg',
      coverAlt: 'An empty living room on the day of the handover',
    })
    expect(article.passages.map((p) => p.heading)).toEqual([null, 'How long can a landlord keep the deposit?', 'What can a landlord deduct?'])
    expect(article.passages.map((p) => p.text)).toEqual([
      'Most deposits come back in full when the agreement names the deductions.',
      'Two to three months is usual. <script>alert(1)</script>',
      'Unpaid rent Damage beyond wear and tear',
    ])
    expect(article.passages[0]!.html).toContain('<strong>the deductions</strong>')
    expect(article.passages[1]!.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(article.passages[2]!.html).toContain('<li>Unpaid rent</li>')
  })

  it.each([
    ['a missing field', '04-deposit-back.md', source({ ...frontMatter, author: undefined })],
    ['an SEO title of more than 60 characters', '04-deposit-back.md', source({ ...frontMatter, seo_title: `"${'x'.repeat(61)}"` })],
    ['an SEO description of more than 155 characters', '04-deposit-back.md', source({ ...frontMatter, seo_description: `"${'x'.repeat(156)}"` })],
    ['a cover with no alt text', '04-deposit-back.md', source({ ...frontMatter, cover_alt: undefined })],
    ['a number that is not the number of the file name', '05-deposit-back.md', source()],
    ['a file name that is not NN-slug.md', 'Deposit Back.md', source()],
    ['no front matter', '04-deposit-back.md', body],
  ])('refuses %s', (_case, fileName, text) => {
    expect(() => parseArticle(fileName, text)).toThrow(fileName)
  })
})

describe('readArticles', () => {
  async function folderWith(files: Record<string, string>) {
    const dir = await mkdtemp(join(tmpdir(), 'articles-'))
    await Promise.all(Object.entries(files).map(([name, text]) => writeFile(join(dir, name), text)))
    return { url: pathToFileURL(`${dir}/`), remove: () => rm(dir, { recursive: true }) }
  }

  it.each([
    ['a number', { '04-deposit-back.md': source(), '04-deductions.md': source() }],
    ['a slug', { '04-deposit-back.md': source(), '05-deposit-back.md': source({ ...frontMatter, number: '5' }) }],
  ])('refuses %s that two files use', async (_case, files) => {
    const folder = await folderWith(files)
    await expect(readArticles(folder.url)).rejects.toThrow(/two files/)
    await folder.remove()
  })

  it('parses each file of the repo, and each author photo and cover is in the public folder of the web', async () => {
    const articles = await readArticles(new URL('../content/articles/', import.meta.url))
    for (const file of articles.flatMap((a) => [a.authorPhoto, a.coverImage])) {
      if (file) expect(existsSync(new URL(`../../web/public${file}`, import.meta.url)), file).toBe(true)
    }
  })
})
