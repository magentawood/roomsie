import { z } from 'zod'

// Next runs this file before the code of the app. Zod tries eval to parse faster, and the CSP blocks eval (T-52).
z.config({ jitless: true })
