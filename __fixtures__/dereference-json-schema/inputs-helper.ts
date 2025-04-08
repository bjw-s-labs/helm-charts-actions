import { jest } from '@jest/globals'

export const getInputs =
  jest.fn<
    typeof import('../../src/dereference-json-schema/inputs-helper.js').getInputs
  >()
