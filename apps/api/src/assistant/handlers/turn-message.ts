import type { RouterInput } from '@roomsie/contract'

/** The message of one typed turn to a model: the last question of the assistant and the text, never the full chat (PD7a). */
export const turnMessage = ({ text, lastQuestion }: Pick<RouterInput, 'text' | 'lastQuestion'>) =>
  `${lastQuestion ? `Last question of the assistant: ${lastQuestion}\n` : ''}Message of the person: ${text}`
