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
