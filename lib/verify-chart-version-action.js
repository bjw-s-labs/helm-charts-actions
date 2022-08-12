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
const semver = __importStar(require("semver"));
const YAML = __importStar(require("yaml"));
async function run() {
    var _a;
    try {
        if (github.context.eventName !== "pull_request") {
            core.setFailed("This action can only run on pull requests!");
            return;
        }
        const githubToken = core.getInput("token");
        const chart = core.getInput("chart", { required: true });
        const base = core.getInput("base", { required: false });
        const chartYamlPath = `${chart}/Chart.yaml`;
        const defaultBranch = (_a = github.context.payload.repository) === null || _a === void 0 ? void 0 : _a.default_branch;
        const octokit = github.getOctokit(githubToken);
        if (!(await fs.pathExists(chartYamlPath))) {
            core.setFailed(`${chart} is not a valid Helm chart folder!`);
            return;
        }
        if (base) {
            try {
                await octokit.rest.git.getRef({
                    owner: github.context.repo.owner,
                    repo: github.context.repo.repo,
                    ref: base,
                });
            }
            catch (error) {
                core.setFailed(`Ref ${base} was not found for this repository!`);
                return;
            }
        }
        let originalChartYamlFile;
        let originalChartVersion;
        try {
            originalChartYamlFile = await octokit.rest.repos.getContent({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                path: `${chartYamlPath}`,
                ref: base || `heads/${defaultBranch}`,
            });
        }
        catch (error) {
            core.warning(`Could not find original Chart.yaml for ${chart}, assuming this is a new chart.`);
        }
        if (originalChartYamlFile && "content" in originalChartYamlFile.data) {
            const originalChartYamlContent = Buffer.from(String(originalChartYamlFile.data.content), "base64").toString("utf-8");
            const originalChartYaml = await YAML.parse(originalChartYamlContent);
            originalChartVersion = originalChartYaml.version;
        }
        const updatedChartYamlContent = await fs.readFile(chartYamlPath, "utf8");
        const updatedChartYaml = await YAML.parse(updatedChartYamlContent);
        if (!updatedChartYaml.version) {
            core.setFailed(`${chartYamlPath} does not contain a version!`);
            return;
        }
        const updatedChartVersion = updatedChartYaml.version;
        if (!semver.valid(updatedChartVersion)) {
            core.setFailed(`${updatedChartVersion} is not a valid SemVer version!`);
            return;
        }
        if (originalChartVersion) {
            if (updatedChartVersion === originalChartVersion) {
                core.setFailed(`Chart version has not been updated!`);
                return;
            }
            if (!semver.gt(updatedChartVersion, originalChartVersion)) {
                core.setFailed(`Updated chart version ${updatedChartVersion} is < ${originalChartVersion}!`);
                return;
            }
            core.info(`Old chart version: ${originalChartVersion}`);
        }
        core.info(`New chart version: ${updatedChartVersion}`);
        core.info(`New chart version verified succesfully.`);
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
//# sourceMappingURL=verify-chart-version-action.js.map