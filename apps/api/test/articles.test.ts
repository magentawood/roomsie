import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { articleResponse, articlesResponse } from '@roomsie/contract'
import { parseArticle } from '../src/articles/parse'
import { searchPassages, syncArticles } from '../src/articles/store'
import { articlePassages, articles } from '../src/db/schema'
import { testApp, type TestApp } from './app'

const article = (fileName: string, title: string, body: string) => parseArticle(fileName, `---
number: ${Number(fileName.slice(0, 2))}
title: "${title}"
author: "Asha Rao"
author_line: "Rented in Andheri for six years"
seo_title: "${title}"
seo_description: "About ${title.toLowerCase()}"
date_checked: 2026-10-08
---
${body}`)

const deposit = article('04-deposit-back.md', 'Getting your deposit back', `Most deposits come back in full.

## How long can a landlord keep the deposit?

Two to three months is usual.

## What can a landlord deduct?

Unpaid rent and damage beyond wear and tear.
`)
const police = article('07-police-verification.md', 'Police verification for tenants', `## Who files the police verification?

The landlord files it online, before you move in.
`)

let t: TestApp<'reader'>
beforeAll(async () => { t = await testApp(['reader']) })
afterAll(() => t.close())

const stored = () => t.db.select({ slug: articles.slug, title: articles.title }).from(articles).orderBy(articles.number)

describe('syncArticles', () => {
  it('adds the new articles, changes the changed articles and removes the removed articles', async () => {
    await syncArticles(t.db, [deposit, police])
    expect(await stored()).toEqual([
      { slug: 'deposit-back', title: 'Getting your deposit back' },
      { slug: 'police-verification', title: 'Police verification for tenants' },
    ])

    await syncArticles(t.db, [{ ...deposit, title: 'Your deposit, back in full', passages: deposit.passages.slice(0, 1) }])
    expect(await stored()).toEqual([{ slug: 'deposit-back', title: 'Your deposit, back in full' }])
    expect(await t.db.select({ text: articlePassages.text }).from(articlePassages)).toEqual([{ text: 'Most deposits come back in full.' }])
  })
})

describe('searchPassages', () => {
  beforeAll(() => syncArticles(t.db, [deposit, police]))

  it('gives the best passages first, each with its article and heading', async () => {
    const found = await searchPassages(t.db, 'How long can my landlord keep my deposit?')
    expect(found).toHaveLength(3)
    expect(found[0]).toEqual({
      slug: 'deposit-back',
      title: 'Getting your deposit back',
      heading: 'How long can a landlord keep the deposit?',
      text: 'Two to three months is usual.',
    })
  })

  it('matches any word of the question', async () => {
    const found = await searchPassages(t.db, 'police deposit', 10)
    expect(new Set(found.map((p) => p.slug))).toEqual(new Set(['deposit-back', 'police-verification']))
  })

  it('gives no passage for a question that has no word of an article', async () => {
    expect(await searchPassages(t.db, 'Which cricket bat is best?')).toEqual([])
    expect(await searchPassages(t.db, 'is it?')).toEqual([])
  })
})

describe('the article routes', () => {
  beforeAll(() => syncArticles(t.db, [police, deposit]))

  it('list the articles by number', async () => {
    const list = articlesResponse.parse((await t.call(null, 'GET', '/v1/articles')).json())
    expect(list.articles).toEqual([
      {
        slug: 'deposit-back', number: 4, title: 'Getting your deposit back', author: 'Asha Rao', authorLine: 'Rented in Andheri for six years',
        authorPhoto: null, seoTitle: 'Getting your deposit back', seoDescription: 'About getting your deposit back', dateChecked: '2026-10-08',
        coverImage: null, coverAlt: null,
      },
      expect.objectContaining({ slug: 'police-verification', number: 7 }),
    ])
  })

  it('give one article with its sections in order, and 404 for an unknown slug', async () => {
    const one = articleResponse.parse((await t.call(null, 'GET', '/v1/articles/police-verification')).json())
    expect(one.passages).toEqual([{ heading: 'Who files the police verification?', html: '<p>The landlord files it online, before you move in.</p>\n' }])
    expect((await t.call(null, 'GET', '/v1/articles/no-such-article')).statusCode).toBe(404)
  })
})
