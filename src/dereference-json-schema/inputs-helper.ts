import * as core from '@actions/core'
import { ActionInputs } from './action-inputs.js'

export async function getInputs(): Promise<ActionInputs> {
  const result = {} as unknown as ActionInputs

  const schemaFile = core.getInput('schemaFile', { required: true }) || ''
  const outputFile = core.getInput('outputFile', { required: true }) || ''
  const allowFileNotFound =
    core.getInput('allowFileNotFound', { required: true }) === 'true'

  if (schemaFile == '') {
    throw new Error('schemaFile input is required!')
  }
  if (outputFile == '') {
    throw new Error('outputFile input is required!')
  }

  result.schemaFile = schemaFile
  result.outputFile = outputFile
  result.allowFileNotFound = allowFileNotFound

  return result
}
