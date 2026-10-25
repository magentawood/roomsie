import { AwsClient } from 'aws4fetch'

/** Photo bytes never pass through the API (ADR-0005). The client uploads to R2 with a signed link. */
export type Storage = {
  uploadUrl(key: string, contentType: string, size: number): Promise<{ url: string; expiresAt: Date }>
  deleteObjects(keys: string[]): Promise<void>
  publicUrl(key: string): string
}

const uploadSeconds = 600

export function r2Storage(options: { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; publicUrl: string }): Storage {
  const client = new AwsClient({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    service: 's3',
    region: 'auto',
    retries: 1,
  })
  const objectUrl = (key: string) => `https://${options.accountId}.r2.cloudflarestorage.com/${options.bucket}/${key}`
  return {
    async uploadUrl(key, contentType, size) {
      const upload = new Request(`${objectUrl(key)}?X-Amz-Expires=${uploadSeconds}`, {
        method: 'PUT',
        headers: { 'content-type': contentType, 'content-length': String(size) },
      })
      // allHeaders signs the type and the size, so R2 rejects a different file.
      const signed = await client.sign(upload, { aws: { signQuery: true, allHeaders: true } })
      return { url: signed.url, expiresAt: new Date(Date.now() + uploadSeconds * 1000) }
    },
    async deleteObjects(keys) {
      await Promise.all(keys.map(async (key) => {
        const res = await client.fetch(objectUrl(key), { method: 'DELETE' })
        if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed with ${res.status}`)
      }))
    },
    publicUrl: (key) => `${options.publicUrl.replace(/\/$/, '')}/${key}`,
  }
}
