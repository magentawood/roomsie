'use client'

import { useState, type SVGProps } from 'react'
import { HelpCircle } from '@untitledui/icons'
import { profileSections } from '../../lib/profile-form'
import { Button } from '../ui/button'
import { Modal } from '../ui/modal'

/** The icon of a secondary button is grey in the designs, under a darker label. */
const GreyHelpCircle = ({ className = '', ...props }: SVGProps<SVGSVGElement> & { size?: number }) =>
  <HelpCircle {...props} className={`${className} text-fg-quaternary`} />

/**
 * "Help" of the card on Profile and Settings. The designs link it to no screen, so it tells what each part of the profile
 * does and who sees it, in the words of the helpers of the page (PD16).
 */
export function ProfileHelp() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" size="sm" iconTrailing={GreyHelpCircle} onClick={() => setOpen(true)}>Help</Button>
      {open && (
        <Modal icon={HelpCircle} iconTone="neutral" place="wide" title="How your profile works" onClose={() => setOpen(false)}
          actions={<Button variant="primary" size="md" className="flex-1" onClick={() => setOpen(false)}>Got it</Button>}>
          <span className="flex flex-col gap-3">
            <span>Your profile is the card that other people see. It shows in their results when your name, age, who is moving, areas and budget are complete.</span>
            <span className="flex flex-col gap-2">
              {Object.values(profileSections).map(({ title, helper }) => (
                <span key={title}><span className="font-medium text-secondary">{title}:</span> {helper}</span>
              ))}
            </span>
            <span>Your gender, religion and community never show on your card. A photo saves at once. Save keeps the other changes.</span>
          </span>
        </Modal>
      )}
    </>
  )
}
