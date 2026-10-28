import { shareCard, shareCardSize } from '../../components/blog/share-card'

export const size = shareCardSize
export const alt = 'The rent questions, answered: the Roomsie blog'

export default function Image() {
  return shareCard('The rent questions, answered', null)
}
