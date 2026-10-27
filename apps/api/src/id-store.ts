import { AwsClient } from 'aws4fetch'
import { z } from 'zod'

/** The only code that touches the ID photos and the selfies: a private S3 bucket and Amazon Rekognition in Mumbai (ADR-0020). */
export type IdStore = {
  uploadUrl(key: string, contentType: string, size: number): Promise<{ url: string; expiresAt: Date }>
  viewUrl(key: string): Promise<{ url: string; expiresAt: Date }>
  deleteObjects(keys: string[]): Promise<void>
  /** The similarity of the two faces, 0 to 100. Null when Rekognition gives no score. */
  faceMatch(selfieKey: string, idPhotoKey: string): Promise<number | null>
}

const region = 'ap-south-1'
const linkSeconds = 300
const compareFacesReply = z.object({ FaceMatches: z.array(z.object({ Similarity: z.number() })) })

export function s3IdStore(options: { bucket: string; accessKeyId: string; secretAccessKey: string }): IdStore {
  const { bucket, accessKeyId, secretAccessKey } = options
  const s3 = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region, retries: 1 })
  const rekognition = new AwsClient({ accessKeyId, secretAccessKey, service: 'rekognition', region, retries: 0 })
  const objectUrl = (key: string) => `https://${bucket}.s3.${region}.amazonaws.com/${key}`
  const signed = async (req: Request) => ({
    url: (await s3.sign(req, { aws: { signQuery: true, allHeaders: true } })).url,
    expiresAt: new Date(Date.now() + linkSeconds * 1000),
  })
  return {
    // allHeaders signs the type and the size, so S3 rejects a different file.
    uploadUrl: (key, contentType, size) => signed(new Request(`${objectUrl(key)}?X-Amz-Expires=${linkSeconds}`, {
      method: 'PUT', headers: { 'content-type': contentType, 'content-length': String(size) },
    })),
    viewUrl: (key) => signed(new Request(`${objectUrl(key)}?X-Amz-Expires=${linkSeconds}`)),
    async deleteObjects(keys) {
      await Promise.all(keys.map(async (key) => {
        const res = await s3.fetch(objectUrl(key), { method: 'DELETE' })
        if (!res.ok) throw new Error(`S3 delete failed with ${res.status}`)
      }))
    },
    async faceMatch(selfieKey, idPhotoKey) {
      const res = await rekognition.fetch(`https://rekognition.${region}.amazonaws.com/`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': 'RekognitionService.CompareFaces' },
        body: JSON.stringify({
          SourceImage: { S3Object: { Bucket: bucket, Name: selfieKey } },
          TargetImage: { S3Object: { Bucket: bucket, Name: idPhotoKey } },
          SimilarityThreshold: 0,
        }),
        signal: AbortSignal.timeout(10_000),
      })
      // A photo with no face is a 400. The reviewer then decides with no score.
      if (!res.ok) return null
      const reply = compareFacesReply.safeParse(await res.json())
      return reply.success ? Math.max(0, ...reply.data.FaceMatches.map((m) => m.Similarity)) : null
    },
  }
}
