module.exports = function logging(page, context) {
  page
    .on("console", (message) =>
      context.pageLog.push({
        type: "console",
        message: message.type().substr(0, 3).toUpperCase(),
        text: message.text(),
      })
    )
    .on("pageerror", ({ message }) => context.pageLog.push({ type: "console", message }))
    .on("error", ({ message }) => context.pageLog.push({ type: "error", message }))
    .on("response", (response) =>
      context.pageLog.push({ type: "response", status: response.status(), url: response.url() })
    )
    .on("request", (request) =>
      context.pageLog.push({
        type: "request",
        method: request.method(),
        url: request.url(),
        postData: request.postData() ? request.postData() : null,
      })
    )
    .on("requestfailed", (request) =>
      context.pageLog.push({ errorText: request.failure().errorText, url: request.url() })
    );
};
