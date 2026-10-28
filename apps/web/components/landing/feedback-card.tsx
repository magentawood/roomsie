'use client'

import { useEffect, useId, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import { noContent } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { SignInWall } from '../shell/sign-in-wall'
import { Button } from '../ui/button'
import { inputClass } from '../ui/field'

/** A guest gets the sign-in wall, and the feedback goes after the sign-in (T-23a). */
export function FeedbackCard({ className = '' }: { className?: string }) {
  const id = useId()
  const { user, loading } = useAuth()
  const [text, setText] = useState('')
  const [wall, setWall] = useState(false)
  const [empty, setEmpty] = useState(false)
  const send = useMutation({
    mutationFn: (as: User) => api(as, '/v1/feedback', noContent, { method: 'POST', body: { text } }),
    onSuccess: () => setText(''),
  })
  useEffect(() => {
    if (!user || !wall) return
    setWall(false)
    send.mutate(user)
  }, [user, wall, send])

  return (
    <form className={className} onSubmit={(e) => {
      e.preventDefault()
      if (!text.trim()) setEmpty(true)
      else if (user) send.mutate(user)
      else setWall(true)
    }}>
      <label htmlFor={id} className="text-lg font-medium text-secondary md:text-xl md:text-tertiary">Feedback</label>
      <textarea id={id} maxLength={2000} value={text} placeholder="Enter your feedback"
        onChange={(e) => { send.reset(); setEmpty(false); setText(e.target.value) }} className={`${inputClass} h-40 resize-y`} />
      {empty && <p role="alert" className="text-sm text-error-primary">Write your feedback first.</p>}
      {send.isError && <p role="alert" className="text-sm text-error-primary">{errorText(send.error)}</p>}
      {send.isSuccess && <p role="status" className="text-sm text-fg-success">Thanks. We read each message.</p>}
      <span>
        <Button type="submit" variant="primary" size="sm" disabled={send.isPending || loading}>Share Feedback</Button>
      </span>
      {wall && !user && <SignInWall onClose={() => setWall(false)} />}
    </form>
  )
}
