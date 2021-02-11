const expect = require("expect");
const url = require("url");

const { xPathExpressionsToHTML } = require("./utils");

function printValue(value) {
  if (value instanceof RegExp) {
    return String(value);
  }
  return JSON.stringify(value);
}

async function runExpectations(context, expectations) {
  const pageURL = await context.getPageURL();
  const { pathname } = url.parse(pageURL);

  const pageReport = { pageURL, ok: [], nope: [] };
  const pageExpectations = expectations.filter((exp) => !exp.at || pageURL.match(exp.at) || pathname.match(exp.at));

  context.report.push(pageReport);

  for (let i = 0; i < pageExpectations.length; i++) {
    const expectation = pageExpectations[i];

    const { where, value } = expectation;
    let testResult;

    expectation.exercised = true;

    async function assert(func) {
      try {
        await func();
        testResult = `✅ ${where}: ${printValue(value)}`;
        if (context.verbose) {
          console.log(`    ${testResult}`);
        }
        pageReport.ok.push(testResult);
        return true;
      } catch (err) {
        testResult = `❌ ${where}: ${printValue(value)}`;
        if (context.verbose) {
          console.log(`    ${testResult}`);
        }
        pageReport.nope.push(testResult);
      }
      return false;
    }

    if (where === "dataLayer") {
      await assert(async () => expect(await context.assertInDataLayer(value)).toEqual(true));
    } else if (where === "url") {
      const currentURL = await context.getPageURL();
      const r = value instanceof RegExp ? value : new RegExp(value);
      await assert(() => expect(currentURL.match(r)).not.toEqual(null));
    } else if (where === "html") {
      if (typeof value === "string") {
        if (value.match(/^\/\//)) {
          // xpath
          const expressions = await context.page.$x(value);
          const res = await assert(() => expect(expressions.length > 0).toEqual(true));
          if (res) {
            expectation.matchedHTMLElements = await xPathExpressionsToHTML(expressions);
          }
        } else {
          // raw text search
          const pageContent = await context.content();
          await assert(() => expect(pageContent.indexOf(value) >= 0).toEqual(true));
        }
      } else if (value instanceof RegExp) {
        // raw text search by using regexp
        const pageContent = await context.content();
        await assert(() => expect(pageContent.match(value)).not.toEqual(null));
      }
    } else if (where === "request") {
      const foundRequest = context.pageLog.find(({ type, method, url }) => {
        const urlMatch = url
          ? value.url instanceof RegExp
            ? url.match(value.url)
            : url.indexOf(value.url) >= 0
          : false;
        return type === "request" && method === value.method && urlMatch;
      });
      await assert(() => expect(!!foundRequest).toEqual(true));
    }
  }
}

module.exports = runExpectations;
