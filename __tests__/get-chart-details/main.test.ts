import * as core from '../../__fixtures__/core.js'
import fs from 'fs'
import * as inputHelper from '../../__fixtures__/get-chart-details/inputs-helper.js'
import {
  HelmChart,
  HelmChartValidationResult
} from '../../src/get-chart-details/helmchart.js'
import { ActionInputs } from '../../src/get-chart-details/action-inputs.js'
import { jest } from '@jest/globals'

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule(
  '../../src/get-chart-details/inputs-helper.js',
  () => inputHelper
)

const { run } = await import('../../src/get-chart-details/main.js')

describe('run', () => {
  let mockChart: HelmChart

  beforeEach(() => {
    inputHelper.getInputs.mockResolvedValue({
      path: 'test',
      allowChartToNotExist: false,
      validateChartYaml: true
    } as ActionInputs)

    jest.spyOn(fs, 'existsSync').mockReturnValue(true)

    mockChart = {
      name: 'test-chart',
      type: 'application',
      version: '1.0.0',
      annotations: {},
      changelog: [
        {
          type: 'added',
          description: 'Added new feature'
        }
      ],
      validate: jest
        .fn<typeof HelmChart.prototype.validate>()
        .mockReturnValueOnce({
          success: true,
          errors: []
        } as HelmChartValidationResult)
    } as HelmChart
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should set outputs when chart exists and validation passes', async () => {
    jest.spyOn(HelmChart, 'loadFromYamlFile').mockReturnValueOnce(mockChart)

    await run()

    expect(core.setOutput).toHaveBeenCalledWith('name', 'test-chart')
    expect(core.setOutput).toHaveBeenCalledWith('version', '1.0.0')
    expect(core.setOutput).toHaveBeenCalledWith('type', 'application')
    expect(core.setOutput).toHaveBeenCalledWith(
      'changes',
      JSON.stringify(mockChart.changelog).replaceAll('\\n', ' ')
    )
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('should set outputs when chart exists and validation passes with empty changelog', async () => {
    mockChart.changelog = []
    jest.spyOn(HelmChart, 'loadFromYamlFile').mockReturnValueOnce(mockChart)

    await run()

    expect(core.setOutput).toHaveBeenCalledWith('name', 'test-chart')
    expect(core.setOutput).toHaveBeenCalledWith('version', '1.0.0')
    expect(core.setOutput).toHaveBeenCalledWith('type', 'application')
    expect(core.setOutput).toHaveBeenCalledWith('changes', '')
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('should handle validation failures with errors', async () => {
    mockChart.version = ''
    mockChart.validate = jest
      .fn<typeof HelmChart.prototype.validate>()
      .mockReturnValueOnce({
        success: false,
        errors: ['Invalid version', 'Missing description']
      } as HelmChartValidationResult)

    jest.spyOn(HelmChart, 'loadFromYamlFile').mockReturnValueOnce(mockChart)

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Chart.yaml validation failed')
    expect(core.error).toHaveBeenCalledWith('Invalid version')
    expect(core.error).toHaveBeenCalledWith('Missing description')
  })

  it('should not set the workflow as failed when there is no chart and allowChartToNotExist is set', async () => {
    inputHelper.getInputs.mockResolvedValueOnce({
      path: 'test',
      allowChartToNotExist: true
    } as ActionInputs)
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false)

    await run()

    expect(core.warning).toHaveBeenCalled()
    expect(core.setFailed).not.toHaveBeenCalled()
    expect(core.setOutput).not.toHaveBeenCalled()
  })

  it('should set the workflow as failed when there is no chart and allowChartToNotExist is not set', async () => {
    inputHelper.getInputs.mockResolvedValueOnce({
      path: 'test',
      allowChartToNotExist: false
    } as ActionInputs)
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false)

    const errorMessage = 'test does not exist!'

    await run()

    expect(core.warning).not.toHaveBeenCalled()
    expect(core.setFailed).toHaveBeenCalledTimes(1)
    expect(core.setFailed).toHaveBeenCalledWith(errorMessage)
    expect(core.setOutput).not.toHaveBeenCalled()
  })

  it('should handle errors when loading chart', async () => {
    jest.spyOn(HelmChart, 'loadFromYamlFile').mockImplementation(() => {
      throw new Error('Failed to load chart')
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Failed to load chart')
  })
})
