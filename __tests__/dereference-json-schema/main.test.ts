import * as core from '../../__fixtures__/core.js'
import fs from 'fs'
import $RefParser from '@apidevtools/json-schema-ref-parser'
import * as inputHelper from '../../__fixtures__/dereference-json-schema/inputs-helper.js'
import { ActionInputs } from '../../src/dereference-json-schema/action-inputs.js'
import { jest } from '@jest/globals'

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule(
  '../../src/dereference-json-schema/inputs-helper.js',
  () => inputHelper
)

const { run } = await import('../../src/dereference-json-schema/main.js')

describe('run', () => {
  beforeEach(() => {
    inputHelper.getInputs.mockResolvedValue({
      schemaFile: 'schema.json',
      outputFile: 'output.json',
      allowFileNotFound: false
    } as ActionInputs)

    jest.spyOn(fs, 'existsSync').mockReturnValue(true)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should successfully dereference and write schema file', async () => {
    const mockSchema = { test: 'schema' }
    jest
      .spyOn($RefParser, 'dereference')
      .mockResolvedValueOnce(mockSchema as $RefParser.JSONSchema)
    jest
      .spyOn(fs, 'writeFile')
      .mockImplementation((path, data, callback) => callback(null))

    await run()

    expect($RefParser.dereference).toHaveBeenCalledWith('schema.json')
    expect(fs.writeFile).toHaveBeenCalledWith(
      'output.json',
      JSON.stringify(mockSchema, null, 2),
      expect.any(Function)
    )
    expect(core.info).toHaveBeenCalledWith(
      'Dereferenced JSON schema file to output.json.'
    )
  })

  it('should warn when file not found and allowFileNotFound is true', async () => {
    inputHelper.getInputs.mockResolvedValue({
      schemaFile: 'schema.json',
      outputFile: 'output.json',
      allowFileNotFound: true
    })
    jest.spyOn(fs, 'existsSync').mockReturnValue(false)

    await run()

    expect(core.warning).toHaveBeenCalledWith('schema.json does not exist!')
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('should fail when file not found and allowFileNotFound is false', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false)

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('schema.json does not exist!')
  })

  it('should handle file write errors', async () => {
    const mockError = new Error('Write failed')
    jest
      .spyOn($RefParser, 'dereference')
      .mockResolvedValueOnce({} as $RefParser.JSONSchema)
    jest
      .spyOn(fs, 'writeFile')
      .mockImplementation((path, data, callback) => callback(mockError))

    await run()

    expect(fs.writeFile).toHaveBeenCalled()
    expect(core.setFailed).toHaveBeenCalledWith(
      `Error writing to file: ${mockError.message}`
    )
  })

  it('should handle general errors', async () => {
    const mockError = new Error('Something went wrong')
    inputHelper.getInputs.mockRejectedValue(mockError)

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Something went wrong')
  })
})
