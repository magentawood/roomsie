import { z } from 'zod'

const positiveInt = (value: number) => z.coerce.number().int().positive().default(value)

/** The limits of PD9. The first values are guesses: the team revises them with the data (PC-10, T-21). */
export const limitSettings = z.object({
  VISITOR_TURN_CAP: positiveInt(5),
  /** The wall comes at this many typed turns also before results show. */
  VISITOR_TURN_BACKSTOP: positiveInt(15),
  VISITOR_SESSIONS_PER_DEVICE: positiveInt(10),
  VISITOR_SESSIONS_PER_IP: positiveInt(100),
  VISITOR_SESSIONS_PER_IP_RANGE: positiveInt(500),
  TYPED_TURNS_PER_MINUTE: positiveInt(10),
}).transform((s) => ({
  turnCap: s.VISITOR_TURN_CAP,
  turnBackstop: s.VISITOR_TURN_BACKSTOP,
  sessionsPerDevice: s.VISITOR_SESSIONS_PER_DEVICE,
  sessionsPerIp: s.VISITOR_SESSIONS_PER_IP,
  sessionsPerIpRange: s.VISITOR_SESSIONS_PER_IP_RANGE,
  typedTurnsPerMinute: s.TYPED_TURNS_PER_MINUTE,
}))
export type LimitSettings = z.output<typeof limitSettings>
