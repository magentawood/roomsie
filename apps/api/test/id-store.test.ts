import { afterEach, describe, expect, it, vi } from 'vitest'
import { s3IdStore } from '../src/id-store'

const store = s3IdStore({ bucket: 'roomsie-ids', accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'secret' })
const key = 'checks/0190a000-0000-7000-8000-000000000000/0190a000-0000-7000-8000-000000000001.jpg'
afterEach(() => vi.unstubAllGlobals())

/** Answers each AWS call with `reply`, and keeps the requests. */
function fakeAws(reply: () => Response) {
  const requests: Request[] = []
  vi.stubGlobal('fetch', async (req: Request) => { requests.push(req); return reply() })
  return requests
}

describe('the ID store', () => {
  it('signs upload links for the private bucket in Mumbai, for 5 minutes, with the type and the size', async () => {
    const { url, expiresAt } = await store.uploadUrl(key, 'image/jpeg', 1234)
    const link = new URL(url)
    expect(link.host).toBe('roomsie-ids.s3.ap-south-1.amazonaws.com')
    expect(link.pathname).toBe(`/${key}`)
    expect(link.searchParams.get('X-Amz-Expires')).toBe('300')
    expect(link.searchParams.get('X-Amz-Credential')).toContain('/ap-south-1/s3/')
    expect(link.searchParams.get('X-Amz-SignedHeaders')).toContain('content-length')
    expect(expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(300_000)
  })

  it('signs view links for 5 minutes', async () => {
    const link = new URL((await store.viewUrl(key)).url)
    expect(link.searchParams.get('X-Amz-Expires')).toBe('300')
    expect(link.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('asks Rekognition to compare the selfie with the ID photo in the bucket', async () => {
    const requests = fakeAws(() => Response.json({ FaceMatches: [{ Similarity: 98.6 }, { Similarity: 41 }], UnmatchedFaces: [] }))
    expect(await store.faceMatch('selfie.jpg', 'id.jpg')).toBe(98.6)
    const [req] = requests
    expect(req!.url).toBe('https://rekognition.ap-south-1.amazonaws.com/')
    expect(req!.headers.get('x-amz-target')).toBe('RekognitionService.CompareFaces')
    expect(await req!.json()).toMatchObject({
      SourceImage: { S3Object: { Bucket: 'roomsie-ids', Name: 'selfie.jpg' } },
      TargetImage: { S3Object: { Bucket: 'roomsie-ids', Name: 'id.jpg' } },
    })
  })

  it('gives 0 when no face matches, and no score when Rekognition fails', async () => {
    fakeAws(() => Response.json({ FaceMatches: [], UnmatchedFaces: [{}] }))
    expect(await store.faceMatch('selfie.jpg', 'id.jpg')).toBe(0)
    fakeAws(() => Response.json({ __type: 'InvalidParameterException' }, { status: 400 }))
    expect(await store.faceMatch('selfie.jpg', 'id.jpg')).toBeNull()
  })

  it('deletes each file, and fails when S3 fails', async () => {
    const requests = fakeAws(() => new Response(null, { status: 204 }))
    await store.deleteObjects([key, 'checks/a.jpg'])
    expect(requests.map((r) => [r.method, new URL(r.url).pathname])).toEqual([['DELETE', `/${key}`], ['DELETE', '/checks/a.jpg']])
    fakeAws(() => new Response(null, { status: 500 }))
    await expect(store.deleteObjects([key])).rejects.toThrow()
  })
})
