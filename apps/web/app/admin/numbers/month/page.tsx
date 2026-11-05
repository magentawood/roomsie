import { numberTabs, SubjectPage } from '../../../../components/admin/admin-page'
import { ProductNumbers } from '../../../../components/admin/product-numbers'

export default function NumbersMonthPage() {
  return (
    <SubjectPage role="moderator" title="Product numbers" tabs={numberTabs} intro="The 30 whole days that end yesterday, against the 30 days before them. The numbers count the analytics events, and no event holds the text of a person.">
      <ProductNumbers period="month" />
    </SubjectPage>
  )
}
