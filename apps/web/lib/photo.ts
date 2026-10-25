/** The long side of a listing photo after the browser shrinks it (T-42 spec). */
export const maxPhotoSide = 1600

export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

const encode = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The photo could not be read'))), type, 0.82),
  )

/**
 * Draws the photo again, 1600 px or less, as WebP. Safari cannot make WebP and gives a PNG, so there it is a JPEG.
 * The new file has no EXIF data, so no GPS location.
 */
export async function shrinkPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxPhotoSide)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const webp = await encode(canvas, 'image/webp')
  return webp.type === 'image/webp' ? webp : encode(canvas, 'image/jpeg')
}
