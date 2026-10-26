'use client'

import { useMutation } from '@tanstack/react-query'
import { Trash01, UploadCloud02 } from '@untitledui/icons'
import { useUser } from '../lib/auth'
import { uploadPhoto, type UploadTarget } from '../lib/upload'

export function PhotoPicker({ target, label, onUploaded }: { target: UploadTarget; label: string; onUploaded: (key: string, preview: string) => void }) {
  const user = useUser()
  const upload = useMutation({
    mutationFn: (file: File) => uploadPhoto(user, target, file),
    onSuccess: ({ key, preview }) => onUploaded(key, preview),
  })
  return (
    <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-primary p-5 text-center hover:bg-primary_hover ${upload.isPending ? 'opacity-60' : ''}`}>
      <span className="flex size-10 items-center justify-center rounded-md border border-primary text-fg-quaternary shadow-xs"><UploadCloud02 size={20} aria-hidden /></span>
      <span className="text-sm"><span className="font-semibold text-secondary">{upload.isPending ? 'Uploading…' : label}</span></span>
      <span className="text-xs text-tertiary">PNG, JPG or WebP. We shrink it before the upload.</span>
      {upload.isError && <span className="text-xs text-error-primary">The upload failed. Try again.</span>}
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={upload.isPending}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) upload.mutate(file)
        }} />
    </label>
  )
}

export function Thumb({ src, onRemove, label }: { src?: string; onRemove: () => void; label: string }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-secondary bg-tertiary">
      {src && <img src={src} alt="" className="size-full object-cover" />}
      <button type="button" aria-label={label} onClick={onRemove} className="absolute top-2 right-2 rounded-md bg-primary p-1.5 text-fg-quaternary shadow-sm hover:text-fg-error">
        <Trash01 size={16} aria-hidden />
      </button>
    </div>
  )
}
