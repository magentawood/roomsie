'use client'

import { useState } from 'react'
import { ShieldTick } from '@untitledui/icons'
import { errorText } from '../../lib/api'
import { useVerification } from '../../lib/queries'
import { verifyRow } from '../../lib/verification'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Modal } from '../ui/modal'
import { VerifyDialog } from './verify-dialog'

/** "Verify your ID" in Settings, in its five states (T-46). */
export function VerifyRow() {
  const verification = useVerification()
  const [verifying, setVerifying] = useState(false)
  if (verification.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(verification.error)}</p>
  if (!verification.data) return null
  const row = verifyRow(verification.data)
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 text-md font-medium text-primary">
          Verify your ID{row.badge && <Badge tone={row.badge[0]} dot={false}>{row.badge[1]}</Badge>}
        </span>
        <span className="text-sm text-tertiary">{row.text}</span>
        {row.note && <span className="text-sm font-medium text-secondary">Note from our team: “{row.note}”</span>}
      </span>
      {row.action && <Button variant="primary" size="sm" onClick={() => setVerifying(true)}>{row.action}</Button>}
      {verifying && <VerifyDialog onClose={() => setVerifying(false)} />}
    </div>
  )
}

/** The "Verify your ID" modal of the listing flow after a publish (drafts section 07). The listing is already live. */
export function VerifyAfterPublish({ onDone }: { onDone: () => void }) {
  const [verifying, setVerifying] = useState(false)
  if (verifying) return <VerifyDialog onClose={onDone} />
  return (
    <Modal icon={ShieldTick} iconTone="success" title="Verify your ID" onClose={onDone}
      actions={(
        <>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onDone}>Not now</Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={() => setVerifying(true)}>Verify</Button>
        </>
      )}>
      Optional. Send a passport, driving licence, voter ID or PAN card and a selfie. A Verified badge shows on your card after our check.
    </Modal>
  )
}
