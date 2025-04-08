import * as core from '../../__fixtures__/core.js'
import { ActionInputs } from '../../src/dereference-json-schema/action-inputs.js'
import { jest } from '@jest/globals'

jest.unstable_mockModule('@actions/core', () => core)

const { getInputs } = await import(
  '../../src/dereference-json-schema/inputs-helper.js'
)

describe('inputs', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('throws an error when required schemaFile input is not set', async () => {
    await expect(getInputs()).rejects.toThrow('schemaFile input is required!')
  })

  it('throws an error when required outputFile input is not set', async () => {
    core.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'schemaFile':
          return 'test'
        default:
          return ''
      }
    })
    await expect(getInputs()).rejects.toThrow('outputFile input is required!')
  })

  it('sets defaults', async () => {
    core.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'schemaFile':
          return 'test'
        case 'outputFile':
          return 'test'
        default:
          return ''
      }
    })

    const settings: ActionInputs = await getInputs()
    expect(settings).toBeTruthy()
    expect(settings.schemaFile).toBe('test')
    expect(settings.outputFile).toBe('test')
    expect(settings.allowFileNotFound).toBe(false)
  })

  it('can be configured', async () => {
    core.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'schemaFile':
          return 'test'
        case 'outputFile':
          return 'test'
        case 'allowFileNotFound':
          return 'true'
        default:
          return ''
      }
    })

    const settings: ActionInputs = await getInputs()
    expect(settings).toBeTruthy()
    expect(settings.schemaFile).toBe('test')
    expect(settings.outputFile).toBe('test')
    expect(settings.allowFileNotFound).toBe(true)
  })
})
