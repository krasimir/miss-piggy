#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const puppeteer = require("puppeteer");
const recursive = require("recursive-readdir");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;

const runExpectations = require("./expectations");
const { clickByText, clickByXPath, getPageURL, type, delay, getTime, assertInDataLayer } = require("./utils");
const report = require("./report");
const logging = require("./logging");
const { TIMEOUT, SEPARATOR } = require("./constants");

async function runTest() {
  if (scenarios.length > 0) {
    const file = scenarios.shift();
    const filename = path.basename(file);
    const logDir = `${root}/${logDir}/${filename}`;
    const screenshotOptions = (shotName = getTime(), subDir = "") => ({
      path: `${logDir}/${subDir}${shotName}.png`,
      fullPage: true,
    });
    let { steps, expectations, description } = require(file);

    console.log(chalk.cyan(`  Description: ${description}`));
    console.log(chalk.grey(`  File: ${path.basename(file)}`));
    if (!fs.existsSync(`${root}/${logDir}`)) {
      fs.mkdirSync(`${root}/${logDir}`);
    }
    fs.mkdirSync(`${logDir}`);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const context = {
      file: path.basename(file),
      verbose,
      description,
      logDir,
      steps,
      expectations,
      browser,
      page,
      pageLog: [],
      clickByText: clickByText(page),
      clickByXPath: clickByXPath(page),
      getPageURL: getPageURL(page),
      type: type(page),
      delay: delay(page),
      screenshot: (postfix, subDir) => page.screenshot(screenshotOptions(postfix, subDir)),
      waitForNavigation: () => page.waitForNavigation({ timeout: TIMEOUT }),
      assertInDataLayer: assertInDataLayer(page),
      content: () => page.content(),
    };
    const { logBefore, logAfter, logError, summary } = report(context);

    logging(page, context);

    // going over the steps
    (async function processStep(stepIdx = 0) {
      if (stepIdx < steps.length) {
        let step = steps[stepIdx];
        let stepFunc = Array.isArray(step) ? step[1] : step;
        fs.mkdirSync(`${logDir}/${stepIdx}`);

        // running the step
        try {
          await logBefore(stepIdx, context);
          await stepFunc(context);
          await logAfter(stepIdx, context);
        } catch (err) {
          await logError(stepIdx, stepFunc, err, context);
          return runTest();
        }

        // going over the expectations
        try {
          await runExpectations(context, expectations);
        } catch (err) {
          console.log(chalk.red(`Error while running the expectations of ${filename}`));
          console.error(err);
          return runTest();
        }

        // proceed to the next step
        return processStep(stepIdx + 1);
      } else {
        // end of the test
        results.push([file, await summary()]);
        console.log(SEPARATOR);
        await context.browser.close();
        return runTest();
      }
    })();
  } else {
    console.log("  ✨ Results: ");
    results.forEach(([file, result]) => {
      file = file.replace(root, "");
      if (result) {
        console.log(chalk.green(`    ✅ ${file}`));
      } else {
        console.log(chalk.red(`    ❌ ${file}`));
      }
    });
    console.log(SEPARATOR);
  }
}

const root = path.normalize(process.cwd());
const specFile = argv.spec;
const specPattern = argv.specPattern || "spec\\.js$";
const specDir = argv.specDir || `${root}`;
const verbose = argv.verbose || false;
const logDir = argv.logDir || "logs";

let scenarios = [];
const results = [];

recursive(specDir, [(file, stats) => stats.isDirectory() && file.indexOf("node_modules") >= 0], (err, files) => {
  if (argv.spec) {
    scenarios = [path.normalize(root + "/" + specFile)];
  } else {
    scenarios = files.filter((s) => s.match(new RegExp(specPattern, "g")));
  }
  console.log(`
      .)\()()/(.    
    .((()(())())).  
   ((()(''oo'')())) 
  ((()) )(..)( (()))   
  (())). '==' .((())
  '()))''----''((()'
      '        '
      Miss Piggy`);
  console.log(SEPARATOR);
  console.log(
    chalk.magenta(
      `🖥️  Spec files found in ${specDir}:\n${scenarios.map((file) => `  ⚙️ ${file.replace(root, "")}`).join("\n")}`
    )
  );
  console.log(SEPARATOR);
  runTest();
});
