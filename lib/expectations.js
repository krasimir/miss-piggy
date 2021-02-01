const expect = require("expect");

const { xPathExpressionsToHTML } = require("./utils");

function printValue(value) {
  if (value instanceof RegExp) {
    return String(value);
  }
  return JSON.stringify(value);
}

async function runExpectations(context, expectations) {
  for (let i = 0; i < expectations.length; i++) {
    const expectation = expectations[i];

    if (expectation.resolvedAt && !expectation.keep) continue;

    const { where, value } = expectation;

    async function assert(func) {
      try {
        await func();
        if (!expectation.resolvedAt) expectation.resolvedAt = [];
        expectation.resolvedAt.push(await context.getPageURL());
        console.log(`    ✅ ${where}: ${printValue(value)}`);
        return true;
      } catch (err) {
        // ignoring the error
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
