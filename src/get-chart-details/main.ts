import * as path from 'path'
import * as core from '@actions/core'
import fs from 'fs'
import * as inputHelper from './inputs-helper.js'
import { HelmChart } from './helmchart.js'

export async function run() {
  try {
    const inputs = await inputHelper.getInputs()

    if (!fs.existsSync(inputs.path)) {
      if (!inputs.allowChartToNotExist) {
        core.setFailed(`${inputs.path} does not exist!`)
        return
      }
      core.warning(`${inputs.path} does not exist!`)
      return
    }

    const chartYamlPath = path.join(inputs.path, 'Chart.yaml')
    core.info(`Processing chart at ${chartYamlPath}`)

    const chart = HelmChart.loadFromYamlFile(chartYamlPath)
    if (inputs.validateChartYaml) {
      const result = chart.validate(inputs.requireChangelog)
      if (!result.success) {
        core.setFailed('Chart.yaml validation failed')
        result.errors?.forEach(function (error) {
          core.error(error)
        })
        return
      }
    }

    core.setOutput('name', chart.name)
    core.setOutput('version', chart.version)
    core.setOutput('type', chart.type)
    core.setOutput(
      'changes',
      chart.changelog.length > 0
        ? JSON.stringify(chart.changelog).replaceAll('\\n', ' ')
        : ''
    )
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
