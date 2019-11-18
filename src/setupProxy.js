const proxy = require("http-proxy-middleware");

module.exports = function(app) {
  app.use(
    "/heroku-git",
    proxy({
      target: "https://git.heroku.com",
      changeOrigin: true,
      pathRewrite: {
        "^/heroku-git": "/" // remove base path
      }
    })
  );
};
