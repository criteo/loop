'use strict'

let npm = run({
  sh: `npm install`,
  watch: 'package.json'
})

let mkdir = run({
  sh: 'mkdir -p dist'
})

let stylus = run({
  name: 'css',
  sh: './node_modules/.bin/stylus app/stylus -o dist/',
  watch: 'app/**/*.styl'
}).dependsOn(npm, mkdir)

let webpack = run({
  name: 'javascript',
  sh: './node_modules/.bin/webpack --bail',
  watch: ['app/**/*.js', 'webpack.config.js']
}).dependsOn(npm, mkdir)

let server = runServer({
  httpPort,
  sh: `node server.js ${httpPort}`,
  watch: 'server.js'
}).dependsOn(npm)

proxy(server, 8080).dependsOn(stylus, webpack)
