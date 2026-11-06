import { redirect } from 'next/navigation'
import { savedHref } from '../../lib/saved'

/** Saved is a tab of Listings now, so an old link to it opens that tab. */
export default function SavedPage() {
  redirect(savedHref.places)
}
