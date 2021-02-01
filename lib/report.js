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
    return matchedHTMLElements.map((v) => `   → ${where} ${v}`).join("\n");
  } else {
    str = value;
  }
  return `   → ${where} ${str}`;
}

module.exports = function report(context) {
  const { steps, logDir, page, pageLog, file, description, expectations } = context;
  const resolved = () => expectations.filter(({ resolvedAt }) => !!resolvedAt).length;

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
    let stepDesc = `\n  ⚙️ step ${stepIdx + 1}/${steps.length} (Resolved: ${resolved()}/${expectations.length})`;
    if (Array.isArray(context.steps[stepIdx])) {
      stepDesc = `\n  ⚙️ ${context.steps[stepIdx][0]}`;
    }
    console.log(stepDesc);
    if (argv.verbose) {
      console.log(chalk.grey(`    🌐 ${await context.getPageURL()}`));
    }
    await context.screenshot(`before`, `${stepIdx}/`);
    fs.writeFileSync(`${logDir}/${stepIdx}/before.html`, await page.content());
  };
  const logAfter = async (stepIdx, context) => {
    if (argv.verbose) {
      console.log(chalk.grey(`    🌐 ${await context.getPageURL()}`));
    }
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
    let testResult;
    const unresolvedExpectations = expectations.filter(({ resolvedAt }) => !resolvedAt);
    const reportLog = [`# ${file}\n\n`, `${description}\n\n`, "## Expectations\n\n"];
    const sortExpectations = (a, b) => {
      const w1 = a.where.toUpperCase();
      const w2 = b.where.toUpperCase();
      if (w1 > w2) return -1;
      if (w1 < w2) return 1;
      return 0;
    };

    console.log(`\n  📋 Test summary:\n`);
    if (unresolvedExpectations.length > 0) {
      testResult = false;
      console.log(
        chalk.red(
          `  There are ${chalk.white(unresolvedExpectations.length)} unmet expectations out of ${chalk.white(
            expectations.length
          )}`
        )
      );
      unresolvedExpectations.forEach(({ where, value }) => {
        console.log(chalk.red(`    ❌ in ${where}: ${value}`));
      });
    } else {
      testResult = true;
      console.log(chalk.green(`  ✅ All ${chalk.white(expectations.length)} expectations for ${file} are satisfied.`));
    }

    // by url
    reportLog.push("👉 By URL");
    const byURL = expectations.reduce((res, expectation) => {
      const { resolvedAt } = expectation;
      if (resolvedAt) {
        resolvedAt.forEach((url) => {
          const storage = res.find((item) => item[0] === url);
          if (storage) {
            storage[1].push(expectation);
          } else {
            res.push([url, [expectation]]);
          }
        });
      }
      return res;
    }, []);
    byURL.forEach(([url, exps]) => reportLog.push(`\n\n🌐 ${url}\n${exps.map(printValue).join("\n")}`));

    // resolved expectations
    reportLog.push("\n\n👉 Resolved");
    expectations.sort(sortExpectations).forEach((expectation) => {
      const { where, resolvedAt } = expectation;
      if (resolvedAt) {
        reportLog.push(`\n\n${resolvedAt.join("\n")}\n${printValue(expectation)}\n   (${where})`);
      }
    });

    // unresolved expectations
    reportLog.push("\n\n👉 Unresolved");
    unresolvedExpectations.sort(sortExpectations).forEach((expectation) => {
      reportLog.push(`\n\n${printValue(expectation)}`);
    });

    fs.writeFileSync(`${logDir}/report.log`, reportLog.join(""));
    console.log(chalk.grey(`\n  The ${logDir}/report.log file is generated.`));

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
