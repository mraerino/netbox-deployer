const webpack = require("webpack");

require("dotenv").config();

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      HEROKU_APP_SECRET: JSON.stringify(process.env.HEROKU_APP_SECRET)
    })
  ]
};
