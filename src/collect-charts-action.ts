import * as path from "path";

import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs-extra";
import * as YAML from "yaml";

type FileStatus = "added" | "modified" | "removed" | "renamed";

interface repoConfig {
  excluded_charts_install: string[];
  excluded_charts_lint: string[];
  excluded_charts_release: string[];
}

async function requestAddedModifiedFiles(
  baseCommit: string,
  headCommit: string,
  githubToken: string,
  requireHeadAheadOfBase: boolean
) {
  const result: string[] = [];
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
    throw new Error(
      `The GitHub API returned ${response.status}, expected 200.`
    );
  }

  // Ensure that the head commit is ahead of the base commit.
  if (requireHeadAheadOfBase && response.data.status !== "ahead") {
    throw new Error(
      `The head commit for this ${github.context.eventName} event is not ahead of the base commit.`
    );
  }

  const responseFiles = response.data.files || [];
  for (const file of responseFiles) {
    const filestatus = file.status as FileStatus;
    if (filestatus === "added" || filestatus === "modified") {
      result.push(file.filename);
    }
  }
  return result;
}

async function requestAllFiles(commit: string, githubToken: string) {
  const result: string[] = [];
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
    throw new Error(
      `The GitHub API returned ${response.status}, expected 200.`
    );
  }

  const responseTreeItems = response.data.tree || [];
  for (const item of responseTreeItems) {
    if (item.type === "blob" && item.path) {
      result.push(item.path);
    }
  }
  return result;
}

async function getRepoConfig(configPath: string) {
  // Ensure that the repo config file exists.
  if (!(await fs.pathExists(configPath))) {
    throw new Error(`${configPath} Does not exist!`);
  }

  const repoConfigRaw = await fs.readFile(configPath, "utf8");
  const yamlConfig = await YAML.parse(repoConfigRaw);

  let repoConfig: repoConfig;
  if (yamlConfig) {
    repoConfig = {
      excluded_charts_install: yamlConfig["excluded-charts-install"] ?? [],
      excluded_charts_lint: yamlConfig["excluded-charts-lint"] ?? [],
      excluded_charts_release: yamlConfig["excluded-charts-release"] ?? [],
    };
  } else {
    repoConfig = {
      excluded_charts_install: [],
      excluded_charts_lint: [],
      excluded_charts_release: [],
    };
  }

  return repoConfig;
}

function getChartYamlFromFile(path: string) {
  const chartYamlFile = fs.readFileSync(path, "utf8");
  return YAML.parse(chartYamlFile);
}

function filterChangedCharts(files: string[], parentFolder: string) {
  const filteredChartFiles = files.filter((file) => {
    const rel = path.relative(parentFolder, file);
    return !rel.startsWith("../") && rel !== "..";
  });

  const changedCharts: string[] = [];
  for (const file of filteredChartFiles) {
    const absoluteParentFolder = path.resolve(parentFolder);
    const absoluteFileDirname = path.resolve(path.dirname(file));
    const relativeFileDirname = absoluteFileDirname.slice(
      absoluteParentFolder.length + 1
    );
    const chartPathParts: string[] = relativeFileDirname.split("/");
    const chartType: string = chartPathParts[0];
    const chartName: string = chartPathParts[1];
    if (chartType && chartName) {
      changedCharts.push(`${chartType}/${chartName}`);
    }
  }

  // Return only unique items
  var result = changedCharts.filter(
    (item, index) => changedCharts.indexOf(item) === index
  );
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
    core.info(
      `Repo configuration: ${JSON.stringify(repoConfig, undefined, 2)}`
    );

    let responseCharts: any;

    if (overrideCharts && overrideCharts !== "[]") {
      responseCharts = YAML.parse(overrideCharts);
    } else {
      const eventName = github.context.eventName;

      let baseCommit: string;
      let headCommit: string;

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
          throw new Error(
            `This action only supports pull requests, pushes and workflow_dispatch,` +
              `${github.context.eventName} events are not supported.`
          );
      }

      if (!headCommit) {
        throw new Error(`No HEAD commit was found to compare to.`);
      }

      let responseFiles: string[];
      if (getAllCharts === "true") {
        responseFiles = await requestAllFiles(headCommit, githubToken);
      } else {
        responseFiles = await requestAddedModifiedFiles(
          baseCommit,
          headCommit,
          githubToken,
          requireHeadAheadOfBase === "true"
        );
      }
      responseCharts = filterChangedCharts(responseFiles, chartsFolder);
    }

    // Determine changed charts
    core.info(`Charts: ${JSON.stringify(responseCharts, undefined, 2)}`);
    core.setOutput("charts", responseCharts);

    // Determine changed Library charts
    const libraryCharts = responseCharts.filter((chart: any) => {
      const chartYaml = getChartYamlFromFile(
        `${chartsFolder}/${chart}/Chart.yaml`
      );
      return chartYaml.type === "library";
    });
    core.info(`Library charts: ${JSON.stringify(libraryCharts, undefined, 2)}`);
    core.setOutput("chartsLibrary", libraryCharts);

    // Determine changed Application charts
    const applicationCharts = responseCharts.filter((chart: any) => {
      const chartYaml = getChartYamlFromFile(
        `${chartsFolder}/${chart}/Chart.yaml`
      );
      return chartYaml.type !== "library";
    });
    core.info(
      `Application charts: ${JSON.stringify(applicationCharts, undefined, 2)}`
    );
    core.setOutput("chartsApplication", applicationCharts);

    // Determine charts to install
    const chartsToInstall = responseCharts.filter(
      (x: string) => !repoConfig.excluded_charts_install.includes(x)
    );
    core.info(
      `Charts to install: ${JSON.stringify(chartsToInstall, undefined, 2)}`
    );
    core.setOutput("chartsToInstall", chartsToInstall);

    // Determine charts to lint
    const chartsToLint = responseCharts.filter(
      (x: string) => !repoConfig.excluded_charts_lint.includes(x)
    );
    core.info(`Charts to lint: ${JSON.stringify(chartsToLint, undefined, 2)}`);
    core.setOutput("chartsToLint", chartsToLint);

    // Determine Library charts to release
    const libraryChartsToRelease = libraryCharts.filter(
      (x: string) => !repoConfig.excluded_charts_release.includes(x)
    );
    core.info(
      `Library charts to release: ${JSON.stringify(
        libraryChartsToRelease,
        undefined,
        2
      )}`
    );
    core.setOutput("chartsLibraryToRelease", libraryChartsToRelease);

    // Determine Application charts to release
    const applicationChartsToRelease = applicationCharts.filter(
      (x: string) => !repoConfig.excluded_charts_release.includes(x)
    );
    core.info(
      `Application charts to release: ${JSON.stringify(
        applicationChartsToRelease,
        undefined,
        2
      )}`
    );
    core.setOutput("chartsApplicationToRelease", applicationChartsToRelease);
  } catch (error) {
    core.setFailed(String(error));
  }
}

async function runWrapper() {
  try {
    await run();
  } catch (error) {
    core.setFailed(`collect-charts action failed: ${error}`);
    console.log(error);
  }
}

void runWrapper();
