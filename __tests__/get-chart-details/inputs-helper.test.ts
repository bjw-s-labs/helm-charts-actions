import * as core from '../../__fixtures__/core.js'
import { ActionInputs } from '../../src/get-chart-details/action-inputs.js'
import { jest } from '@jest/globals'

jest.unstable_mockModule('@actions/core', () => core)

const { getInputs } = await import(
  '../../src/get-chart-details/inputs-helper.js'
)

describe('inputs', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('throws an error when required inputs are not set', async () => {
    await expect(getInputs()).rejects.toThrow('path input is required!')
  })

  it('sets defaults', async () => {
    core.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'path':
          return 'test'
        default:
          return ''
      }
    })

    const settings: ActionInputs = await getInputs()
    expect(settings).toBeTruthy()
    expect(settings.path).toBe('test')
    expect(settings.allowChartToNotExist).toBe(false)
    expect(settings.validateChartYaml).toBe(false)
    expect(settings.requireChangelog).toBe(false)
  })

  it('can be configured', async () => {
    core.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'path':
          return 'test'
        case 'allowChartToNotExist':
          return 'true'
        case 'validateChartYaml':
          return 'true'
        case 'requireChangelog':
          return 'true'
        default:
          return ''
      }
    })

    const settings: ActionInputs = await getInputs()
    expect(settings).toBeTruthy()
    expect(settings.path).toBe('test')
    expect(settings.allowChartToNotExist).toBe(true)
    expect(settings.validateChartYaml).toBe(true)
    expect(settings.requireChangelog).toBe(true)
  })
})
