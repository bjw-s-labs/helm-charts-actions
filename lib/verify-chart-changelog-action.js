"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs-extra"));
const YAML = __importStar(require("yaml"));
const schemas_1 = require("./schemas");
function getChangelogFromYaml(chartYaml) {
    const changelogAnnotation = "artifacthub.io/changes";
    if (chartYaml.annotations) {
        if (chartYaml.annotations[changelogAnnotation]) {
            return chartYaml.annotations[changelogAnnotation];
        }
    }
    return undefined;
}
async function getChartYamlFromRepo(path, ref, token) {
    let result = {};
    const octokit = github.getOctokit(token);
    const chartYamlFile = await octokit.rest.repos.getContent({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        path: `${path}`,
        ref,
    });
    if (chartYamlFile && "content" in chartYamlFile.data) {
        const originalChartYamlContent = Buffer.from(chartYamlFile.data.content, "base64").toString("utf-8");
        result = await YAML.parse(originalChartYamlContent);
    }
    return result;
}
async function getChartYamlFromFile(path) {
    const chartYamlFile = await fs.readFile(path, "utf8");
    return YAML.parse(chartYamlFile);
}
async function checkRefExists(ref, token) {
    const octokit = github.getOctokit(token);
    try {
        await octokit.rest.git.getRef({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            ref,
        });
    }
    catch (error) {
        core.setFailed(`Ref ${ref} was not found for this repository!`);
        return false;
    }
    return true;
}
async function run() {
    var _a;
    try {
        if (github.context.eventName !== "pull_request") {
            core.setFailed("This action can only run on pull requests!");
            return;
        }
        // Gather inputs
        const githubToken = core.getInput("token");
        const chart = core.getInput("chart", { required: true });
        const base = core.getInput("base", { required: false });
        // Verify the base ref exists
        if (base && !(await checkRefExists(base, githubToken))) {
            core.setFailed(`Ref ${base} was not found for this repository!`);
            return;
        }
        // Determine the default branch
        const defaultBranch = (_a = github.context.payload.repository) === null || _a === void 0 ? void 0 : _a.default_branch;
        // Validate the chart
        const chartYamlPath = `${chart}/Chart.yaml`;
        if (!(await fs.pathExists(chartYamlPath))) {
            core.setFailed(`${chart} is not a valid Helm chart folder!`);
            return;
        }
        let originalChartYaml;
        let originalChartChangelog;
        try {
            originalChartYaml = await getChartYamlFromRepo(chartYamlPath, base || `heads/${defaultBranch}`, githubToken);
            originalChartChangelog = getChangelogFromYaml(originalChartYaml);
        }
        catch (error) {
            core.warning(`Could not find original Chart.yaml for ${chart}, assuming this is a new chart.`);
        }
        const updatedChartYaml = await getChartYamlFromFile(chartYamlPath);
        const updatedChartChangelog = getChangelogFromYaml(updatedChartYaml);
        if (!updatedChartChangelog) {
            core.setFailed(`${chartYamlPath} does not contain a changelog!`);
            return;
        }
        // Check if the changelog was updated
        if (originalChartChangelog) {
            if (updatedChartChangelog === originalChartChangelog) {
                core.setFailed(`Chart changelog has not been updated!`);
                return;
            }
        }
        // Validate the changelog entries
        const changelogEntries = YAML.parse(updatedChartChangelog);
        for (const entry of changelogEntries) {
            const validator = (0, schemas_1.validateAgainstJsonSchema)(entry, schemas_1.changelogEntrySchema);
            if (!validator.valid) {
                for (const validationError of validator.errors) {
                    core.setFailed(`${chart} changelog validation failed: ${JSON.stringify(validationError)}`);
                }
            }
        }
    }
    catch (error) {
        core.setFailed(String(error));
    }
}
async function runWrapper() {
    try {
        await run();
    }
    catch (error) {
        core.setFailed(`verify-chart-version action failed: ${error}`);
        console.log(error);
    }
}
void runWrapper();
//# sourceMappingURL=verify-chart-changelog-action.js.map