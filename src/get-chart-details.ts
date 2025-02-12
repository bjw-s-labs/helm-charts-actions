import * as path from "path";
import * as core from "@actions/core";
import * as fs from "fs";
import * as YAML from "yaml";
import { z } from "zod";

const chartSchema = z.object({
  name: z.string().nonempty(),
  version: z.string().nonempty(),
  type: z.enum(["application", "library"]).optional(),
});

const chartSchemaChangelogExtension = chartSchema.extend({
  annotations: z.object({
    "artifacthub.io/changes": z.string().nonempty(),
  }).required()
})

const changelogSchema = z.array(
  z.object({
    kind: z.enum(["added", "changed", "deprecated", "removed", "fixed", "security"]),
    description: z.string().nonempty(),
    links: z.array(
      z.object({
        name: z.string().nonempty(),
        url: z.string().url().nonempty(),
      }).required()
    ).optional(),
  })
);

function getChartYamlFromFile(path: string) {
  // Ensure that the file exists.
  if (!(fs.existsSync(path))) {
    throw new Error(`${path} does not exist!`);
  }

  const chartYamlFile = fs.readFileSync(path, "utf8");
  return YAML.parse(chartYamlFile);
}

function setOutput(key: string, value: string) {
  core.debug(`output ${key}: ${value}`);
  core.setOutput(key, value);
}

function ValidateObject(schema: z.SomeZodObject, object: any) {
  const result = schema.safeParse( object );

  if (!result.success) {
    result.error.issues.forEach(function(error) {
      core.error(`${error.path.filter((obj) => {return typeof obj === "string"}).join('.')}: ${error.message}`);
    });
    return false;
  }
  return true;
}

async function run() {
  try {
    const chartPath = core.getInput("path", { required: true });
    const validateChartYaml = core.getInput("validateChartYaml") === "true";
    const requireChangelog = core.getInput("requireChangelog") === "true";

    if (!(fs.existsSync(chartPath))) {
      throw new Error(`${chartPath} does not exist!`);
    }

    const chartYamlPath = path.join(chartPath, "Chart.yaml");
    core.info(`Processing chart at ${chartYamlPath}`);

    const chartYaml = getChartYamlFromFile(chartYamlPath);

    let chartSchemaValidator = chartSchema;
    if (requireChangelog) {
      chartSchemaValidator = chartSchemaChangelogExtension;
    }
    if (validateChartYaml && !ValidateObject(chartSchemaValidator, chartYaml)) {
      core.setFailed("Chart.yaml validation failed");
      return;
    }

    let chartName = chartYaml.name;
    let chartVersion = chartYaml.version;
    let chartType = chartYaml.type || 'application';

    let chartChanges = "";
    if ('artifacthub.io/changes' in chartYaml.annotations) {
      chartChanges = YAML.parse(chartYaml.annotations['artifacthub.io/changes'] || '[]');
      if (validateChartYaml && !ValidateObject(changelogSchema, chartChanges)) {
        core.setFailed("Chart changelog validation failed");
        return;
      }
      // Sanitize the chart changes to remove newlines.
      chartChanges = JSON.stringify(chartChanges).replaceAll('\\n',' ');
    }

    setOutput('name', chartName);
    setOutput('version', chartVersion);
    setOutput('type', chartType);
    setOutput('changes', chartChanges);
  } catch (error) {
    core.setFailed(String(error));
  }
}

async function runWrapper() {
  try {
    await run();
  } catch (error) {
    core.setFailed(`fetch-chart-details action failed: ${error}`);
    console.log(error);
  }
}

void runWrapper();
