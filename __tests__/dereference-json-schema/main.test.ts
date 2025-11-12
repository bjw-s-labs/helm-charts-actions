import * as core from '../../__fixtures__/core.js'
import fs from 'node:fs'
import path from 'node:path'
import * as inputHelper from '../../__fixtures__/dereference-json-schema/inputs-helper.js'
import { ActionInputs } from '../../src/dereference-json-schema/action-inputs.js'
import { jest } from '@jest/globals'

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule(
  '../../src/dereference-json-schema/inputs-helper.js',
  () => inputHelper
)
const { run } = await import('../../src/dereference-json-schema/main.js')

const fixturesDir = path.join(
  process.cwd(),
  '__fixtures__/dereference-json-schema/schemas'
)
const schemaWithRefs = path.join(fixturesDir, 'schema-with-refs.json')
const simpleSchema = path.join(fixturesDir, 'simple-schema.json')

describe('run', () => {
  let outputFile: string
  let writeFileSpy: jest.SpiedFunction<typeof fs.writeFile>

  beforeEach(() => {
    outputFile = path.join(process.cwd(), `test-output-${Date.now()}.json`)

    // Mock writeFile to prevent actual file writes but capture the data
    writeFileSpy = jest
      .spyOn(fs, 'writeFile')
      .mockImplementation((path, data, callback) => {
        callback(null)
      })
  })

  afterEach(() => {
    jest.resetAllMocks()
    // Clean up any output files if they were created
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile)
    }
  })

  it('should successfully dereference a schema with $ref references', async () => {
    inputHelper.getInputs.mockResolvedValue({
      schemaFile: schemaWithRefs,
      outputFile,
      allowFileNotFound: false
    } as ActionInputs)

    await run()

    expect(writeFileSpy).toHaveBeenCalledWith(
      outputFile,
      expect.any(String),
      expect.any(Function)
    )

    // Parse the written data to verify dereferencing worked
    const writtenData = JSON.parse(writeFileSpy.mock.calls[0][1] as string)

    // Verify that $ref references have been dereferenced
    expect(writtenData.properties.user).toBeDefined()
    expect(writtenData.properties.user.$ref).toBeUndefined()
    expect(writtenData.properties.user.type).toBe('object')
    expect(writtenData.properties.user.properties.name).toBeDefined()
    expect(writtenData.properties.user.properties.age).toBeDefined()

    expect(writtenData.properties.homeAddress).toBeDefined()
    expect(writtenData.properties.homeAddress.$ref).toBeUndefined()
    expect(writtenData.properties.homeAddress.type).toBe('object')
    expect(writtenData.properties.homeAddress.properties.street).toBeDefined()
    expect(writtenData.properties.homeAddress.properties.city).toBeDefined()

    expect(core.info).toHaveBeenCalledWith(
      `Dereferenced JSON schema file to ${outputFile}.`
    )
  })

  it('should successfully handle a schema without references', async () => {
    inputHelper.getInputs.mockResolvedValue({
      schemaFile: simpleSchema,
      outputFile,
      allowFileNotFound: false
    } as ActionInputs)

    await run()

    expect(writeFileSpy).toHaveBeenCalledWith(
      outputFile,
      expect.any(String),
      expect.any(Function)
    )

    const writtenData = JSON.parse(writeFileSpy.mock.calls[0][1] as string)
    expect(writtenData.properties.id).toBeDefined()
    expect(writtenData.properties.value).toBeDefined()

    expect(core.info).toHaveBeenCalledWith(
      `Dereferenced JSON schema file to ${outputFile}.`
    )
  })

  it('should warn when file not found and allowFileNotFound is true', async () => {
    const nonExistentFile = path.join(fixturesDir, 'does-not-exist.json')
    inputHelper.getInputs.mockResolvedValue({
      schemaFile: nonExistentFile,
      outputFile,
      allowFileNotFound: true
    } as ActionInputs)

    await run()

    expect(core.warning).toHaveBeenCalledWith(
      `${nonExistentFile} does not exist!`
    )
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('should fail when file not found and allowFileNotFound is false', async () => {
    const nonExistentFile = path.join(fixturesDir, 'does-not-exist.json')
    inputHelper.getInputs.mockResolvedValue({
      schemaFile: nonExistentFile,
      outputFile,
      allowFileNotFound: false
    } as ActionInputs)

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      `${nonExistentFile} does not exist!`
    )
  })

  it('should handle file write errors', async () => {
    const mockError = new Error('Write failed')
    writeFileSpy.mockImplementation((path, data, callback) =>
      callback(mockError)
    )

    inputHelper.getInputs.mockResolvedValue({
      schemaFile: simpleSchema,
      outputFile,
      allowFileNotFound: false
    } as ActionInputs)

    await run()

    expect(writeFileSpy).toHaveBeenCalled()
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
