import type * as fs from 'fs'
import { jest } from '@jest/globals'

export const existsSync = jest.fn<typeof fs.existsSync>()
export const readFileSync = jest.fn<typeof fs.readFileSync>()
