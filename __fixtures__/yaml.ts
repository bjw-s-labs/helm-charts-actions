import type * as YAML from 'yaml'
import { jest } from '@jest/globals'

export const parse = jest.fn<typeof YAML.parse>()
