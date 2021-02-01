<div align="center"><img src="./miss-piggy.jpeg" /></div>

# Miss Piggy - Test runner for [Puppeteer](https://pptr.dev/)

## Quick start

First install the package via

```
> npm install miss-piggy
```

or 

```
> yarn add miss-piggy
```

Then create a scenario file `miss-piggy-scenario.spec.js` with the following content:

```js
module.exports = {
  description: "Verifying miss-piggy's npm package description",
  steps: [
    [
      "Opening miss-piggy GitHub page",
      async (context) => {
        await context.page.goto(`https://github.com/krasimir/miss-piggy`, {
          waitUntil: "domcontentloaded",
        });
      },
    ],
    [
      "Clicking on the package.json file",
      async (context) => {
        await context.clickByText("package.json");
      },
    ],
  ],
  expectations: [
    {
      where: "html",
      value: "Test runner for Puppeteer",
    },
  ],
};
```

And finally run `./node_modules/.bin/miss-piggy --verbose=1`. The result will be:

```
🖥️  Spec files found in /Users/krasimir/Work/Krasimir/misspiggyex:
  ⚙️ /miss-piggy-scenario.spec.js

-----------------------------------------------------------------

  Description: Verifying miss-piggy's npm package description
  File: miss-piggy-scenario.spec.js

  ⚙️ Opening miss-piggy GitHub page
    ⏳ about:blank
    ⌛ https://github.com/krasimir/miss-piggy
    ✅ html: "Test runner for Puppeteer"

  ⚙️ Clicking on the package.json file
    ⏳ https://github.com/krasimir/miss-piggy
    🛠️  clicking on <a class="js-navigation-open link-gray-dark" title="package.json" href="/krasimir/miss-piggy/blob/main/package.json">package.json</a> (total matches: 3)
    ⌛ https://github.com/krasimir/miss-piggy/blob/main/package.json

  📋 Test summary:

  ✅ All 1 expectations for miss-piggy-scenario.spec.js are satisfied.

  The /logs/miss-piggy-scenario.spec.js/report.log file is generated.

-----------------------------------------------------------------

  ✨ Results:
    ✅ /miss-piggy-scenario.spec.js
```

After the execution of the scenarios the runner creates bunch of logs that show you how the step went. In those logs you'll see how the HTML was before and after the step, screenshots, console log messages, errors and requests. Our little example above for example produced:

![log example](./log.example.png)
