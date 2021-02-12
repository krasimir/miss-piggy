module.exports = {
  description: "Verifying that I'm saying the age of my blog",
  steps: [
    async (context) => {
      await context.page.goto(`https://krasimirtsonev.com/blog`, {
        waitUntil: "domcontentloaded",
      });
    },
    async (context) => {
      await context.clickByText("Stats");
      await context.waitForNavigation();
    },
  ],
  expectations: [
    {
      pageURLPattern: /blog\/stats$/,
      items: [
        {
          where: "html",
          value: /This blog is (\d+) years old/,
        },
      ],
    },
  ],
};
