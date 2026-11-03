import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { deployRefusal } from './goals'

describe('the minutes of a deploy (T-50)', () => {
  it('names the route that the old API does not have yet, and leaves a goal that is not found as it is', () => {
    expect(deployRefusal(new ApiError(404, { message: 'Route POST:/v1/goals/x/close not found', error: 'Not Found', statusCode: 404 }))).toMatch(/few minutes/)
    expect(deployRefusal(new ApiError(404, { error: 'not found' }))).toBeNull()
    expect(deployRefusal(new ApiError(409, { error: 'Close the goal first.' }))).toBeNull()
  })
})
