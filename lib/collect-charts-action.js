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
const path = __importStar(require("path"));
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs-extra"));
const YAML = __importStar(require("yaml"));
async function requestAddedModifiedFiles(baseCommit, headCommit, githubToken, requireHeadAheadOfBase) {
    const result = [];
    const octokit = github.getOctokit(githubToken);
    core.info(`Base commit: ${baseCommit}`);
    core.info(`Head commit: ${headCommit}`);
    // Use GitHub's compare two commits API.
    const response = await octokit.rest.repos.compareCommits({
        base: baseCommit,
        head: headCommit,
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
    });
    // Ensure that the request was successful.
    if (response.status !== 200) {
        throw new Error(`The GitHub API returned ${response.status}, expected 200.`);
    }
    // Ensure that the head commit is ahead of the base commit.
    if (requireHeadAheadOfBase && response.data.status !== "ahead") {
        throw new Error(`The head commit for this ${github.context.eventName} event is not ahead of the base commit.`);
    }
    const responseFiles = response.data.files || [];
    for (const file of responseFiles) {
        const filestatus = file.status;
        if (filestatus === "added" || filestatus === "modified") {
            result.push(file.filename);
        }
    }
    return result;
}
async function requestAllFiles(commit, githubToken) {
    const result = [];
    const octokit = github.getOctokit(githubToken);
    core.info(`Commit SHA: ${commit}`);
    const response = await octokit.rest.git.getTree({
        tree_sha: commit,
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        recursive: "true",
    });
    // Ensure that the request was successful.
    if (response.status !== 200) {
        throw new Error(`The GitHub API returned ${response.status}, expected 200.`);
    }
    const responseTreeItems = response.data.tree || [];
    for (const item of responseTreeItems) {
        if (item.type === "blob" && item.path) {
            result.push(item.path);
        }
    }
    return result;
}
async function getRepoConfig(configPath) {
    // Ensure that the repo config file exists.
    if (!(await fs.pathExists(configPath))) {
        throw new Error(`${configPath} Does not exist!`);
    }
    const repoConfigRaw = await fs.readFile(configPath, "utf8");
    const yamlConfig = await YAML.parse(repoConfigRaw);
    let repoConfig;
    if (yamlConfig) {
        repoConfig = {
            excluded_charts_install: yamlConfig["excluded-charts-install"] ?? [],
            excluded_charts_lint: yamlConfig["excluded-charts-lint"] ?? [],
            excluded_charts_release: yamlConfig["excluded-charts-release"] ?? [],
        };
    }
    else {
        repoConfig = {
            excluded_charts_install: [],
            excluded_charts_lint: [],
            excluded_charts_release: [],
        };
    }
    return repoConfig;
}
function getChartYamlFromFile(path) {
    const chartYamlFile = fs.readFileSync(path, "utf8");
    return YAML.parse(chartYamlFile);
}
function filterChangedCharts(files, parentFolder) {
    const filteredChartFiles = files.filter((file) => {
        const rel = path.relative(parentFolder, file);
        return !rel.startsWith("../") && rel !== "..";
    });
    const changedCharts = [];
    for (const file of filteredChartFiles) {
        const absoluteParentFolder = path.resolve(parentFolder);
        const absoluteFileDirname = path.resolve(path.dirname(file));
        const relativeFileDirname = absoluteFileDirname.slice(absoluteParentFolder.length + 1);
        const chartPathParts = relativeFileDirname.split("/");
        const chartType = chartPathParts[0];
        const chartName = chartPathParts[1];
        if (chartType && chartName) {
            changedCharts.push(`${chartType}/${chartName}`);
        }
    }
    // Return only unique items
    var result = changedCharts.filter((item, index) => changedCharts.indexOf(item) === index);
    return result;
}
async function run() {
    try {
        const githubToken = core.getInput("token", { required: true });
        const chartsFolder = core.getInput("chartsFolder", { required: true });
        const requireHeadAheadOfBase = core.getInput("requireHeadAheadOfBase", {
            required: false,
        });
        const repoConfigFilePath = core.getInput("repoConfigFile", {
            required: true,
        });
        let getAllCharts = core.getInput("getAllCharts", { required: false });
        const overrideCharts = core.getInput("overrideCharts", { required: false });
        const repoConfig = await getRepoConfig(repoConfigFilePath);
        core.info(`Repo configuration: ${JSON.stringify(repoConfig, undefined, 2)}`);
        let responseCharts;
        if (overrideCharts && overrideCharts !== "[]") {
            responseCharts = YAML.parse(overrideCharts);
        }
        else {
            const eventName = github.context.eventName;
            let baseCommit;
            let headCommit;
            switch (eventName) {
                case "pull_request":
                    baseCommit = github.context.payload.pull_request?.base?.sha;
                    headCommit = github.context.payload.pull_request?.head?.sha;
                    break;
                case "push":
                    baseCommit = github.context.payload.before;
                    headCommit = github.context.payload.after;
                    break;
                case "workflow_dispatch":
                    getAllCharts = "true";
                    baseCommit = "";
                    headCommit = github.context.sha;
                    break;
                default:
                    throw new Error(`This action only supports pull requests, pushes and workflow_dispatch,` +
                        `${github.context.eventName} events are not supported.`);
            }
            if (!headCommit) {
                throw new Error(`No HEAD commit was found to compare to.`);
            }
            let responseFiles;
            if (getAllCharts === "true") {
                responseFiles = await requestAllFiles(headCommit, githubToken);
            }
            else {
                responseFiles = await requestAddedModifiedFiles(baseCommit, headCommit, githubToken, requireHeadAheadOfBase === "true");
            }
            responseCharts = filterChangedCharts(responseFiles, chartsFolder);
        }
        // Determine changed charts
        core.info(`Charts: ${JSON.stringify(responseCharts, undefined, 2)}`);
        core.setOutput("charts", responseCharts);
        // Determine changed Library charts
        const libraryCharts = responseCharts.filter((chart) => {
            const chartYaml = getChartYamlFromFile(`${chartsFolder}/${chart}/Chart.yaml`);
            return chartYaml.type === "library";
        });
        core.info(`Library charts: ${JSON.stringify(libraryCharts, undefined, 2)}`);
        core.setOutput("chartsLibrary", libraryCharts);
        // Determine changed Application charts
        const applicationCharts = responseCharts.filter((chart) => {
            const chartYaml = getChartYamlFromFile(`${chartsFolder}/${chart}/Chart.yaml`);
            return chartYaml.type !== "library";
        });
        core.info(`Application charts: ${JSON.stringify(applicationCharts, undefined, 2)}`);
        core.setOutput("chartsApplication", applicationCharts);
        // Determine charts to install
        const chartsToInstall = responseCharts.filter((x) => !repoConfig.excluded_charts_install.includes(x));
        core.info(`Charts to install: ${JSON.stringify(chartsToInstall, undefined, 2)}`);
        core.setOutput("chartsToInstall", chartsToInstall);
        // Determine charts to lint
        const chartsToLint = responseCharts.filter((x) => !repoConfig.excluded_charts_lint.includes(x));
        core.info(`Charts to lint: ${JSON.stringify(chartsToLint, undefined, 2)}`);
        core.setOutput("chartsToLint", chartsToLint);
        // Determine Library charts to release
        const libraryChartsToRelease = libraryCharts.filter((x) => !repoConfig.excluded_charts_release.includes(x));
        core.info(`Library charts to release: ${JSON.stringify(libraryChartsToRelease, undefined, 2)}`);
        core.setOutput("chartsLibraryToRelease", libraryChartsToRelease);
        // Determine Application charts to release
        const applicationChartsToRelease = applicationCharts.filter((x) => !repoConfig.excluded_charts_release.includes(x));
        core.info(`Application charts to release: ${JSON.stringify(applicationChartsToRelease, undefined, 2)}`);
        core.setOutput("chartsApplicationToRelease", applicationChartsToRelease);
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
        core.setFailed(`collect-charts action failed: ${error}`);
        console.log(error);
    }
}
void runWrapper();
//# sourceMappingURL=collect-charts-action.js.map