'use client'

import { ModeratorPage } from '../../../components/admin/moderator-page'
import { SiteDetailsForm } from '../../../components/admin/site-details-form'

export default function SiteDetailsPage() {
  return (
    <ModeratorPage title="Site details" backHref="/admin" intro="The links and details of the landing page. An empty field hides its part.">
      <SiteDetailsForm />
    </ModeratorPage>
  )
}
