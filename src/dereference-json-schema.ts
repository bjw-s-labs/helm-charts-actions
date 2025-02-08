import * as core from "@actions/core";
import * as fs from "fs-extra";
import $RefParser from "@apidevtools/json-schema-ref-parser";

async function run() {
  try {
    const schemaFile = core.getInput("schemaFile", { required: true });
    const outputFile = core.getInput("outputFile", { required: true });;

    if (!(await fs.pathExists(schemaFile))) {
      core.setFailed(`${schemaFile} does not exist!`);
      return;
    }

    let parser = new $RefParser();
    let schema = await parser.dereference(schemaFile);

    await fs.writeFile(outputFile, JSON.stringify(schema, null, 2), 'utf8')

    core.info(`Dereferenced JSON schema file to ${outputFile}.`);
  } catch (error) {
    core.setFailed(String(error));
  }
}

async function runWrapper() {
  try {
    await run();
  } catch (error) {
    core.setFailed(`dereference-json-schema action failed: ${error}`);
    console.log(error);
  }
}

void runWrapper();
