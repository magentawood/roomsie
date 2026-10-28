import { readdir, readFile } from 'node:fs/promises'
import MarkdownIt, { type Token } from 'markdown-it'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'

// Raw HTML in an article shows as text, so a file cannot put a script on the blog.
const markdown = MarkdownIt({ html: false })

const articleFileName = /^\d{2}-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/
const withFrontMatter = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/

/** The front matter of the marketing article drafts, with the photo and the cover of T-37. */
const frontMatter = z.strictObject({
  number: z.int().positive(),
  title: z.string().min(1),
  author: z.string().min(1),
  author_line: z.string().min(1),
  author_photo: z.string().regex(/^\/authors\/[\w.-]+$/).optional(),
  main_keyword: z.string().optional(),
  related_keywords: z.array(z.string()).optional(),
  seo_title: z.string().min(1).max(60),
  seo_description: z.string().min(1).max(155),
  date_checked: z.iso.date(),
  sources: z.array(z.string()).optional(),
  // The share cards read only JPEG and PNG.
  cover_image: z.string().regex(/^\/blog\/[\w.-]+\.(?:jpe?g|png)$/).optional(),
  cover_alt: z.string().min(1).optional(),
}).refine((f) => !f.cover_image === !f.cover_alt, { message: 'cover_image and cover_alt go together', path: ['cover_alt'] })

function textOf(tokens: Token[]) {
  return tokens
    .filter((t) => t.type === 'inline')
    .map((t) => (t.children ?? []).map((c) => (c.type === 'softbreak' || c.type === 'hardbreak' ? ' ' : c.content)).join(''))
    .join(' ')
}

/** Each `##` heading is a question of the corpus plan, so each section is one passage. */
function passagesOf(body: string) {
  const sections: { heading: string | null; tokens: Token[] }[] = [{ heading: null, tokens: [] }]
  const tokens = markdown.parse(body, {})
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    if (token.type === 'heading_open' && token.tag === 'h2') {
      sections.push({ heading: textOf([tokens[i + 1]!]), tokens: [] })
      i += 2
    } else sections.at(-1)!.tokens.push(token)
  }
  return sections
    .filter((s) => s.heading !== null || s.tokens.length > 0)
    .map((s) => ({ heading: s.heading, html: markdown.renderer.render(s.tokens, markdown.options, {}), text: textOf(s.tokens) }))
}

export type Article = ReturnType<typeof parseArticle>

export function parseArticle(fileName: string, source: string) {
  try {
    const slug = articleFileName.exec(fileName)?.[1]
    if (!slug) throw new Error('the name is not NN-slug.md')
    const parts = withFrontMatter.exec(source.replaceAll('\r\n', '\n'))
    if (!parts) throw new Error('no front matter between two --- lines')
    const fields = frontMatter.parse(parseYaml(parts[1]!))
    return {
      slug,
      number: fields.number,
      title: fields.title,
      author: fields.author,
      authorLine: fields.author_line,
      authorPhoto: fields.author_photo ?? null,
      seoTitle: fields.seo_title,
      seoDescription: fields.seo_description,
      dateChecked: fields.date_checked,
      coverImage: fields.cover_image ?? null,
      coverAlt: fields.cover_alt ?? null,
      passages: passagesOf(parts[2]!),
    }
  } catch (err) {
    const reason = err instanceof z.ZodError ? z.prettifyError(err) : err instanceof Error ? err.message : String(err)
    throw new Error(`${fileName}: ${reason}`, { cause: err })
  }
}

/** The published articles: each `NN-slug.md` file of the folder. */
export async function readArticles(folder: URL) {
  const files = (await readdir(folder)).filter((f) => f.endsWith('.md')).sort()
  const articles = await Promise.all(files.map(async (f) => parseArticle(f, await readFile(new URL(f, folder), 'utf8'))))
  for (const key of ['number', 'slug'] as const) {
    const values = articles.map((a) => a[key])
    const twice = values.find((v, i) => values.indexOf(v) !== i)
    if (twice !== undefined) throw new Error(`The ${key} ${twice}: two files use it`)
  }
  return articles
}
