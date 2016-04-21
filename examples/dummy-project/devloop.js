'use strict'

let copyFiles = run({
  name: 'copy files',
  sh: `mkdir -p dist; cp -r src/* dist/`,
  watch: ['src/**']
})

let server = runServer({
  httpPort,
  sh: `python -m SimpleHTTPServer ${httpPort}`,
  cwd: `dist`
}).dependsOn(copyFiles)

proxy(server, 8080)
