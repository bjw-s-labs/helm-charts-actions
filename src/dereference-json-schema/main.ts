import * as core from '@actions/core'
import fs from 'fs'
import * as inputHelper from './inputs-helper.js'
import $RefParser from '@apidevtools/json-schema-ref-parser'

export async function run() {
  try {
    const inputs = await inputHelper.getInputs()

    if (!fs.existsSync(inputs.schemaFile)) {
      if (inputs.allowFileNotFound) {
        core.warning(`${inputs.schemaFile} does not exist!`)
      } else {
        core.setFailed(`${inputs.schemaFile} does not exist!`)
      }
      return
    }

    const schema = await $RefParser.dereference(inputs.schemaFile)
    fs.writeFile(inputs.outputFile, JSON.stringify(schema, null, 2), (err) => {
      if (err) {
        core.setFailed(`Error writing to file: ${err.message}`)
        return
      }
    })

    core.info(`Dereferenced JSON schema file to ${inputs.outputFile}.`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
