const chalk = require("chalk");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;

const { TIMEOUT } = require("./constants");

const xPathExpressionsToHTML = async (elements) => {
  return Promise.all(elements.map(async (el) => el.evaluate((e) => e.outerHTML, el)));
};

const clickByText = (page) => async (text, sel = "*", idx = 0) => {
  const xpath = text.match(/^\/\//) ? text : `//${sel}[contains(text(), '${text}') and not(@disabled)]`;
  return clickByXPath(page)(xpath, idx);
};

const clickByXPath = (page) => async (xpath, idx = 0, eventType = "click") => {
  await page.waitForXPath(xpath, { timeout: TIMEOUT, visible: true });
  const elements = await page.$x(xpath);

  if (elements.length > 0) {
    // un-trusted clicking because the trusted one doesn't always work
    await page.evaluate(
      (e, eventType) => {
        let event = document.createEvent("MouseEvents");
        event.initEvent(eventType, true, true);
        e.dispatchEvent(event);
      },
      elements[idx],
      eventType
    );
    if (argv.verbose) {
      console.log(
        chalk.grey(
          `    🛠️  clicking on ${(await xPathExpressionsToHTML(elements))[idx]} (total matches: ${elements.length})`
        )
      );
    }
  } else {
    throw new Error(`There is no element with text "${text}"`);
  }
};

const type = (page) => async (value, xpath = "//input", idx = 0) => {
  await page.waitForXPath(xpath, { timeout: TIMEOUT, visible: true });
  const elements = await page.$x(xpath);

  if (elements.length > 0) {
    await elements[idx].type(value.toString());
    if (argv.verbose) {
      console.log(
        chalk.grey(
          `    🛠️  typing "${value}" in ${(await xPathExpressionsToHTML(elements))[idx]} (total matches: ${
            elements.length
          })`
        )
      );
    }
  } else {
    throw new Error(`There is no <input> element on the page`);
  }
};

const delay = (page) => (interval) => page.waitForTimeout(interval);

const getTime = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getHours()}-${d.getMinutes()}`;
};

const getPageURL = (page) => () =>
  page.evaluate(function () {
    return location.href;
  });

const assertInDataLayer = (page) => async (value) => {
  return page.evaluate((expectation) => {
    if (Array.isArray(expectation)) {
      let dlArrayItems = dataLayer;
      for (let i = 0; i < expectation.length; i++) {
        const item = expectation[i];
        dlArrayItems = dlArrayItems.filter((dlItem) => {
          if (typeof item === "string") {
            return dlItem[i] === item;
          } else if (typeof item === "object") {
            return Object.keys(item).every((key) => {
              return dlItem[i][key] === item[key];
            });
          }
        });
      }
      return dlArrayItems.length > 0;
    } else if (typeof expectation === "object") {
      let dlArrayItems = dataLayer;
      Object.keys(expectation).forEach((key) => {
        dlArrayItems = dlArrayItems.filter((dlItem) => dlItem[key] === expectation[key]);
      });
      return dlArrayItems.length > 0;
    }
    return false;
  }, value);
};

module.exports = {
  clickByText,
  clickByXPath,
  getPageURL,
  type,
  delay,
  getTime,
  assertInDataLayer,
  xPathExpressionsToHTML,
};
