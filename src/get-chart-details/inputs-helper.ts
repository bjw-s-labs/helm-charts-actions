import * as core from '@actions/core'
import type { ActionInputs } from './action-inputs.js'

export async function getInputs(): Promise<ActionInputs> {
  const result = {} as unknown as ActionInputs

  const chartPath = core.getInput('path', { required: true }) || ''
  const allowChartToNotExist = core.getInput('allowChartToNotExist') === 'true'
  const validateChartYaml = core.getInput('validateChartYaml') === 'true'
  const requireChangelog = core.getInput('requireChangelog') === 'true'

  if (chartPath === '') {
    throw new Error('path input is required!')
  }

  result.path = chartPath
  result.allowChartToNotExist = allowChartToNotExist
  result.validateChartYaml = validateChartYaml
  result.requireChangelog = requireChangelog

  return result
}
