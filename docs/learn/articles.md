# Articles and the blog

**In one line:** the Roomsie team writes each article as a Markdown file in the repo, each deploy of the API loads the files into the database, the blog shows them, and the Advisor searches their passages.

## What it is

- An **article** is one file, `apps/api/content/articles/NN-slug.md`. `NN` is its number in the corpus plan, and `slug` is its address: `roomsie.in/blog/<slug>`. Only the team writes articles. A merged pull request publishes an article, and nobody else can add one.
- The **front matter** is the block between two `---` lines at the top of the file. It holds the fields of the article.
- A **passage** is one `##` section of an article: a heading, which is a question, and its answer. The text before the first heading is a passage with no heading.
- **Full-text search** is the search of Postgres. It changes each passage into word stems ("deposits" becomes "deposit") and finds the passages that have the stems of a question.
- A **share card** is the picture that WhatsApp, LinkedIn or X shows for a shared link.

## How it fits our project

```
a file in the repo ──pull request──▶ merge ──▶ deploy of the API: migrate.js ──▶ articles, article_passages
                                                                                     │                  │
                     the blog (/blog, /blog/<slug>) ◀── GET /v1/articles ◀───────────┘                  │
                                                                     searchPassages() ──▶ the Advisor (T-38)
```

| Field | Rule |
|---|---|
| `number`, `title`, `author`, `author_line`, `date_checked` | Required. `author_line` gives the role of the author in the team. `date_checked` is the date of each rate or fee in the text. |
| `seo_title`, `seo_description` | Required. At most 60 and 155 characters. |
| `author_photo` | Optional: a file in `apps/web/public/authors/`, for example `/authors/asha.jpg`. With none, the byline shows the initials. |
| `cover_image`, `cover_alt` | Optional, but together: a JPEG or PNG in `apps/web/public/blog/`, and its alt text. |
| `main_keyword`, `related_keywords`, `sources` | Optional. The blog does not show them. |

- **To publish:** add the file, and the photo or the cover if any, in one pull request. The API tests parse each file and check each photo and cover. After the merge, the deploy loads the file, and the blog shows it within 60 seconds.
- **To change or remove:** edit or delete the file. The next deploy changes or removes the article.
- **The blog** gets its data from `GET /v1/articles` and `GET /v1/articles/<slug>`, server to server. The web keeps each answer for 60 seconds, so a view does not wait for the API. Each link to an article loads the article before the click.
- **The way in:** the landing footer shows "Blog" when the first article exists. Until then, `/blog` is a 404. `sitemap.xml` lists the blog pages, and `robots.txt` names the sitemap.
- **Share cards:** each article has its own card: its cover under a dark overlay, the logo and its title. With no cover, the card has the dark background. `/blog` has a general card. The design is section 30 of the Figma drafts page.
- **The search:** `searchPassages(db, question, limit = 3)` in `apps/api/src/articles/store.ts`. Any word of the question matches, and the best passages come first. A heading counts more than its answer.

## The choice we made

- Files and pull requests, not an editor in the app, so each article gets a review before it goes live ([#183](https://github.com/magentawood/roomsie/pull/183)).
- Postgres full-text search, with no vector store ([PD7a](../decisions/pd-07a-agent-architecture.md)).
- The blog reads the API, not the files ([ADR-0007](../decisions/0007-web-rendering-and-auth-transport.md)).

## Gotchas

- The slug comes from the file name. A new name is a new article, and the old links give 404.
- A file that does not parse fails the API tests in CI. If it gets past them, it stops the deploy of the API, because `migrate.js` loads the files.
- Raw HTML in a file shows as text, so a file cannot put a script on the blog.
- A cover must be a JPEG or a PNG: the share cards cannot read WebP.
- The share cards read the font and the covers from disk. `outputFileTracingIncludes` in `next.config.ts` ships these files with the function.
- `sitemap.xml` renders on each request. At build time, the API can be down, or older than the web.
- The search matches any word, so a common word such as "Mumbai" matches many passages. The Advisor must check that a passage answers the question.

## Tickets

- T-37: [#183](https://github.com/magentawood/roomsie/pull/183), 2026-10-28. The files, the tables, the search, the blog and the share cards.
