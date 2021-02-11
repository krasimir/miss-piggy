const fs = require("fs");
const chalk = require("chalk");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;

function printValue({ value, where, matchedHTMLElements }) {
  let str = "";
  if (value instanceof RegExp) {
    str = String(value);
  } else if (typeof value === "object") {
    str = JSON.stringify(value);
  } else if (matchedHTMLElements) {
    return matchedHTMLElements.map((v) => `in ${where}: ${v}`).join("\n");
  } else {
    str = value;
  }
  return `in ${where}: ${str}`;
}

module.exports = function report(context) {
  const { steps, logDir, page, pageLog, file, description, expectations } = context;

  const savePageLog = (stepIdx, t) => {
    fs.writeFileSync(
      `${logDir}/${stepIdx}/log.${t}.json`,
      JSON.stringify(
        pageLog.filter(({ type }) => type === t),
        null,
        2
      )
    );
  };
  const logBefore = async (stepIdx, context) => {
    if (argv.verbose) {
      console.log(chalk.grey(`    ❯ ${await context.getPageURL()}`));
    }
    await context.screenshot(`before`, `${stepIdx}/`);
    fs.writeFileSync(`${logDir}/${stepIdx}/before.html`, await page.content());
  };
  const logAfter = async (stepIdx, context) => {
    if (argv.verbose) {
      console.log(chalk.grey(`    ❮ ${await context.getPageURL()}`));
    }
    let stepDesc = `  ⚙️ step ${stepIdx + 1}/${steps.length}`;
    console.log(stepDesc);
    await context.screenshot(`after`, `${stepIdx}/`);
    fs.writeFileSync(`${logDir}/${stepIdx}/after.html`, await page.content());
    savePageLog(stepIdx, "console");
    savePageLog(stepIdx, "pageerror");
    savePageLog(stepIdx, "error");
    savePageLog(stepIdx, "response");
    savePageLog(stepIdx, "request");
  };
  const logError = async (stepIdx, step, err, context) => {
    console.log(chalk.red(`#${stepIdx}: ${await context.getPageURL()}`));
    console.log(chalk.red(`step: ${step.toString()}`));
    console.error(err);
    await context.screenshot(`error`, `${stepIdx}/`);
    fs.writeFileSync(`${logDir}/${stepIdx}/error.html`, await page.content());
    fs.writeFileSync(`${logDir}/${stepIdx}/log.all.json`, JSON.stringify(pageLog, null, 2));
    savePageLog(stepIdx, "console");
    savePageLog(stepIdx, "pageerror");
    savePageLog(stepIdx, "error");
    savePageLog(stepIdx, "response");
    savePageLog(stepIdx, "request");
  };
  const summary = async () => {
    let testResult = true;
    const toFile = [`# ${file}\n`, `${description}\n`];
    const missedExpectations = expectations.filter(({ exercised }) => !exercised);
    const log = (str, colorFunc = chalk.white) => {
      console.log(colorFunc(str));
      toFile.push(str);
    };

    console.log(`  📋 Test summary:`);

    context.report.forEach(({ pageURL, ok, nope }) => {
      log(`  ${pageURL}`, chalk.grey);
      if (ok.length === 0 && nope.length === 0) {
        log(`    no expectations for this page`, chalk.grey);
      }
      ok.forEach((str) => log(`    ${str}`));
      nope.forEach((str) => log(`    ${str}`));
      if (nope.length > 0) {
        testResult = false;
      }
    });

    if (missedExpectations.length > 0) {
      testResult = false;
      log(`  Expectations that are not exercised:`, chalk.grey);
      missedExpectations.forEach((exp) => {
        log(`    ❌ at "${exp.at}" - ${printValue(exp)}`, chalk.red);
      });
    }

    fs.writeFileSync(`${logDir}/report.log`, toFile.join("\n"));
    console.log(chalk.grey(`\n  The ${logDir.replace(context.root, "")}/report.log file is generated.`));

    return testResult;
  };

  return {
    savePageLog,
    logBefore,
    logAfter,
    logError,
    summary,
  };
};
