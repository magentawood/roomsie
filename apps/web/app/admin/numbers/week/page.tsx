import { numberTabs, SubjectPage } from '../../../../components/admin/admin-page'
import { ProductNumbers } from '../../../../components/admin/product-numbers'

export default function NumbersWeekPage() {
  return (
    <SubjectPage role="moderator" title="Product numbers" tabs={numberTabs} intro="The 7 whole days that end yesterday, against the 7 days before them. The numbers count the analytics events, and no event holds the text of a person.">
      <ProductNumbers period="week" />
    </SubjectPage>
  )
}
