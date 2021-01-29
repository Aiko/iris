const path = require('path')

const f = (...fp) => path.resolve(__dirname, ...fp)

module.exports = {
  mode: "development",
  entry: "./app.js",
  module: {
    include: [
      f("src"),
      f("Mouseion")
    ],
    exclude: [
      f("public")
    ]
  },
  target: "electron11.0-main"
}