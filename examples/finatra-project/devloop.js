'use strict'

let npm = run({
  sh: `npm install`,
  watch: 'package.json'
})

let mkdir = run({
  sh: 'mkdir -p target/scala-2.11/classes'
})

let stylus = run({
  name: 'css',
  sh: './node_modules/.bin/stylus src/main/stylus -o target/scala-2.11/classes/',
  watch: 'src/main/stylus/**/*.styl'
}).dependsOn(npm, mkdir)

let webpack = run({
  name: 'javascript',
  sh: './node_modules/.bin/webpack --bail',
  watch: ['src/main/javascript/**/*.js', 'webpack.config.js']
}).dependsOn(npm, mkdir)

let sbt = startSbt({
    sh: 'sbt',
      watch: ['build.sbt']
})

// without a watch, this will only run when build.sbt is updated
let packageDependencies = sbt.run({
  name: 'server deps',
  command: 'assemblyPackageDependency'
})

// copy over resources to target every time they change
let publicResources = sbt.run({
  name: 'public resources',
  command: 'copyResources',
  watch: ['src/main/resources/**']
}).dependsOn(packageDependencies)

let compileServer = sbt.run({
  name: 'scalac',
  command: 'compile',
  watch: ['src/**/*.scala']
}).dependsOn(packageDependencies)

let testServer = sbt.run({
  name: 'test server',
  command: 'test'
}).dependsOn(compileServer)

let server = runServer({
  name: 'server',
  httpPort,
  sh: `java -cp "target/scala-2.11/finatra-assembly-0.1.0-deps.jar${platform == 'win32' ? ';': ':'}target/scala-2.11/classes" com.criteo.finatra.FinatraServerMain -http.port=:${httpPort} -admin.port=:9990`
}).dependsOn(testServer)

proxy(server, 8080).dependsOn(stylus, webpack, publicResources)
