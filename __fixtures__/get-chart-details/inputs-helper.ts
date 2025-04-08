import { jest } from '@jest/globals'

export const getInputs =
  jest.fn<
    typeof import('../../src/get-chart-details/inputs-helper.js').getInputs
  >()
