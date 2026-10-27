'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, ShieldTick } from '@untitledui/icons'
import { documentTypeLabels, photoTypes, type DocumentType } from '@roomsie/contract'
import { errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { queryKeys } from '../../lib/queries'
import { openCamera, sendCheck, takeSelfie } from '../../lib/verification'
import { Button } from '../ui/button'
import { ChoiceChips } from '../ui/choice'
import { ModalFrame, ModalTop } from '../ui/modal'

/** The live camera of step 2. No file picker: the selfie must come from the camera now (T-46). */
function Camera({ shot, onShot }: { shot: string | null; onShot: (selfie: Blob) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null | 'opening'>('opening')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let opened: MediaStream | null = null
    let gone = false
    void openCamera().then((s) => {
      if (gone) return s?.getTracks().forEach((t) => t.stop())
      opened = s
      setStream(s)
    })
    return () => {
      gone = true
      opened?.getTracks().forEach((t) => t.stop())
    }
  }, [attempt])
  useEffect(() => {
    if (video.current && stream && stream !== 'opening') video.current.srcObject = stream
  }, [stream, shot])

  if (stream === null) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-secondary bg-secondary p-5 text-center">
        <p className="text-sm font-semibold text-primary">We can’t open a camera</p>
        <p className="text-sm text-tertiary">Allow the camera for roomsie in your browser settings, then try again. No camera on this computer? Verify on your phone.</p>
        <Button variant="secondary" size="sm" onClick={() => { setStream('opening'); setAttempt((n) => n + 1) }}>Try again</Button>
      </div>
    )
  }
  return (
    <div className="relative aspect-3/4 overflow-hidden rounded-xl bg-overlay sm:aspect-4/3">
      {shot
        ? <img src={shot} alt="Your selfie" className="size-full -scale-x-100 object-cover" />
        : <video ref={video} autoPlay playsInline muted aria-label="The camera" className="size-full -scale-x-100 object-cover" />}
      {!shot && (
        <>
          <span aria-hidden className="absolute inset-x-[22%] top-[10%] bottom-[18%] rounded-[50%] border-2 border-dashed border-white/90" />
          <span className="absolute inset-x-0 bottom-3 text-center text-xs font-medium text-white">Put your face in the oval</span>
          <Button variant="primary" size="md" className="absolute bottom-10 left-1/2 -translate-x-1/2" disabled={stream === 'opening'}
            onClick={() => video.current && void takeSelfie(video.current).then(onShot)}>Take selfie</Button>
        </>
      )}
    </div>
  )
}

/** "Verify your ID" in two steps: the ID, then a live selfie. Section 26 of the drafts. */
export function VerifyDialog({ onClose }: { onClose: () => void }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<'id' | 'selfie'>('id')
  const [documentType, setDocumentType] = useState<DocumentType | null>(null)
  const [idFile, setIdFile] = useState<File | null>(null)
  const [selfie, setSelfie] = useState<{ blob: Blob; url: string } | null>(null)
  const send = useMutation({
    mutationFn: () => sendCheck(user, documentType!, idFile!, selfie!.blob),
    onSuccess: (state) => {
      queryClient.setQueryData(queryKeys.verification, state)
      onClose()
    },
  })
  const idPreview = idFile && URL.createObjectURL(idFile)

  return (
    <ModalFrame labelledBy="verify-title" onClose={onClose}>
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <ModalTop icon={ShieldTick} iconTone="success" onClose={onClose} />
        <div className="flex flex-col gap-1">
          <h2 id="verify-title" className="text-md font-semibold text-primary">Verify your ID</h2>
          <p className="text-sm text-tertiary">
            {step === 'id'
              ? 'Step 1 of 2 · Pick your ID and add a photo of the side with your face. We don’t accept an Aadhaar card.'
              : 'Step 2 of 2 · Take a selfie now. Look at the camera, in good light, with nothing over your face.'}
          </p>
        </div>

        {step === 'id' && (
          <>
            <ChoiceChips label="Your ID" labels={documentTypeLabels} value={documentType} onChange={setDocumentType} />
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-secondary px-5 py-4 text-center outline-focus-ring focus-within:outline-2">
              {idPreview
                ? <img src={idPreview} alt="Your ID photo" className="max-h-40 rounded-md object-contain" />
                : <span className="flex size-10 items-center justify-center rounded-md border border-secondary text-fg-quaternary shadow-xs"><ImagePlus size={20} aria-hidden /></span>}
              <span className="text-sm text-tertiary"><span className="font-semibold text-secondary">{idFile ? 'Change the photo' : 'Click to upload'}</span> or take a photo</span>
              <span className="text-xs text-tertiary">JPG, PNG or WebP, max. 10 MB</span>
              <input type="file" accept={Object.keys(photoTypes).join(',')} className="sr-only" onChange={(e) => setIdFile(e.target.files?.[0] ?? null)} />
            </label>
            <p className="text-sm text-tertiary">Only our review team sees your photos. We delete them right after the check.</p>
          </>
        )}
        {step === 'selfie' && (
          <>
            <Camera shot={selfie?.url ?? null} onShot={(blob) => setSelfie({ blob, url: URL.createObjectURL(blob) })} />
            <p className="text-sm text-tertiary">We compare your selfie with your ID, and a person on our team checks both.</p>
          </>
        )}
        {send.isError && <p role="alert" className="text-sm text-error-primary">{errorText(send.error)}</p>}

        <div className="flex gap-3">
          {step === 'id' && (
            <>
              <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button variant="primary" size="lg" className="flex-1" disabled={!documentType || !idFile} onClick={() => setStep('selfie')}>Next</Button>
            </>
          )}
          {step === 'selfie' && !selfie && <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep('id')}>Back</Button>}
          {step === 'selfie' && selfie && (
            <>
              <Button variant="secondary" size="lg" className="flex-1" disabled={send.isPending} onClick={() => setSelfie(null)}>Retake</Button>
              <Button variant="primary" size="lg" className="flex-1" disabled={send.isPending} onClick={() => send.mutate()}>{send.isPending ? 'Sending…' : 'Send for review'}</Button>
            </>
          )}
        </div>
      </div>
    </ModalFrame>
  )
}
