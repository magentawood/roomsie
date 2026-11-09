'use client'

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Flag01, MessageXCircle } from '@untitledui/icons'
import { uuidv7 } from 'uuidv7'
import { needsDetail, noContent, reportDetailLimit, type ReportBody } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { queryKeys, useConversations, useOutgoingRequests } from '../../lib/queries'
import { joinsLister, notInterestedLabels, notInterestedText, reasonLabels, reviewTimes, type ReportChoice } from '../../lib/reports'
import { Button } from '../ui/button'
import { ChoiceChips } from '../ui/choice'
import { TextArea } from '../ui/field'
import { Modal } from '../ui/modal'

export type PersonTarget = { profileId: string; firstName: string }

/**
 * The report of a listing or of a person (PD18), with "Not interested" under the reasons (PD17). "Not interested" files no
 * report: the chat leaves the Messages of both people. A listing offers it only when a chat or a request joins the user and
 * its lister. `onRemoved`: after a "Not interested", in place of the confirmation of the modal, as a thread goes to Messages.
 */
export function ReportSheet({ target, onClose, onRemoved }: { target: { listingId: string } | PersonTarget; onClose: () => void; onRemoved?: () => void }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const outgoing = useOutgoingRequests()
  const conversations = useConversations()
  const [choice, setChoice] = useState<ReportChoice | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  // ADR-0015: the id comes from the first tap, so a retry files no second report.
  const id = useRef<string | null>(null)
  const send = useMutation({ mutationFn: (body: ReportBody) => api(user, '/v1/reports', noContent, { method: 'POST', body }) })

  const sheet = 'listingId' in target
    ? {
        title: 'Report this listing', intro: 'Pick one reason. The lister is not told who reported.', ids: { listingId: target.listingId }, name: 'the lister',
        reasons: reasonLabels('listing'),
        notInterested: !!outgoing.data && !!conversations.data && joinsLister(outgoing.data.requests, conversations.data.conversations, target.listingId),
        keys: [queryKeys.listing(target.listingId), queryKeys.saved('places')],
      }
    : {
        title: 'What’s the issue?', intro: `Pick one reason. ${target.firstName} is not told who reported.`, ids: { profileId: target.profileId }, name: target.firstName,
        reasons: reasonLabels('person'), notInterested: true, keys: [queryKeys.person(target.profileId), queryKeys.saved('people')],
      }
  // The id of a "Not interested" comes from its first tap too.
  const removeId = useRef<string | null>(null)
  const remove = useMutation({
    mutationFn: () => api(user, '/v1/not-interested', noContent, { method: 'POST', body: { id: (removeId.current ??= uuidv7()), ...sheet.ids } }),
    onSuccess: () => {
      onRemoved?.()
      for (const queryKey of [queryKeys.conversations, ['requests'], ...sheet.keys]) void queryClient.invalidateQueries({ queryKey })
    },
  })

  if (remove.isSuccess && !onRemoved) {
    return (
      <Modal icon={MessageXCircle} title="Removed from your messages" onClose={onClose} actions={<Button variant="secondary" size="md" className="flex-1" onClick={onClose}>Done</Button>}>
        {`You and ${sheet.name} can’t message each other now.`}
      </Modal>
    )
  }
  if (send.isSuccess) {
    // A report can hide the listing or the card, so the detail and Saved load again after the thanks.
    const done = () => {
      sheet.keys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }))
      onClose()
    }
    return (
      <Modal icon={Flag01} title="Thanks for the report" onClose={done} actions={<Button variant="secondary" size="md" className="flex-1" onClick={done}>Done</Button>}>
        {reviewTimes}
      </Modal>
    )
  }
  const notInterested = choice === 'not_interested'
  const ready = choice !== null && (notInterested || !needsDetail(choice) || detail !== null)
  const failed = notInterested ? remove : send
  return (
    <Modal title={sheet.title} place="wide" onClose={onClose}
      actions={(
        <>
          <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" size="md" className="flex-1" disabled={!ready || send.isPending || remove.isPending}
            onClick={() => (choice === 'not_interested' ? remove.mutate() : send.mutate({ id: (id.current ??= uuidv7()), ...sheet.ids, reason: choice!, detail }))}>
            {notInterested ? 'Confirm' : 'Submit report'}
          </Button>
        </>
      )}>
      <div className="flex flex-col gap-4 pb-6">
        <p className="mb-1">{sheet.intro}</p>
        <ChoiceChips label="Reason" labels={sheet.reasons} value={notInterested ? null : choice} onChange={setChoice} required />
        {/* Its own group under the reasons, as it files no report. One choice of the two groups stays picked. */}
        {sheet.notInterested && <ChoiceChips label="Not a report" labels={notInterestedLabels} value={notInterested ? choice : null} onChange={setChoice} />}
        {notInterested
          ? <p>{notInterestedText(sheet.name)}</p>
          : (
              <>
                <TextArea label="Tell us more" value={detail} onChange={setDetail} maxLength={reportDetailLimit} size="sm" className="h-24.5 py-2.75! lg:h-13"
                  hint={choice && needsDetail(choice) ? 'Required for Other.' : 'Optional.'} />
                <p>{reviewTimes}</p>
              </>
            )}
        {failed.isError && <p role="alert" className="text-error-primary">{errorText(failed.error)}</p>}
      </div>
    </Modal>
  )
}
