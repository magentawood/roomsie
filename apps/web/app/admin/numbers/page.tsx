import { numberTabs, SubjectPage } from '../../../components/admin/admin-page'
import { ProductNumbers } from '../../../components/admin/product-numbers'

export default function NumbersTodayPage() {
  return (
    <SubjectPage role="moderator" title="Product numbers" tabs={numberTabs} intro="Today until now, against yesterday until the same time. The numbers count the analytics events, and no event holds the text of a person.">
      <ProductNumbers period="today" />
    </SubjectPage>
  )
}
