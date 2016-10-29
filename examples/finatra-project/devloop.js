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

let sbtAssembly = sbt.run({
  name: 'assembly',
  command: 'assembly',
  watch: ['src/main/scala/**', 'src/main/resources/**', 'src/test/scala/**', 'src/test/resources/**']
}).dependsOn(webpack, stylus)

let server = runServer({
  httpPort,
  sh: `java -jar -Dlog.service.output=service.log -Dlog.access.output=access.log target/scala-2.11/finatra-assembly-0.1.0.jar -http.port=:${httpPort} -admin.port=:9990`
}).dependsOn(sbtAssembly)

proxy(server, 8080).dependsOn(sbtAssembly)
