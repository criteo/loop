'use strict'

const fileSystem = require('fs'),
      path = require('path'),
      vm = require('vm'),
      proxy = require('./proxy').proxy,
      run = require('./base').run,
      runServer = require('./base').runServer,
      startSbt = require('./sbt').startSbt,
      maven = require('./maven').maven,
      loadJson = require('./utils').loadJson,
      findFreePort = require('./utils').findFreePort,
      platform = require('process').platform

exports.load = function(devFile) {
  findFreePort(httpPort => {
    let defCtx = {
      __filename: devFile,
      __dirname: __projectPath,
      require,
      console,
      platform,
      proxy,
      run,
      runServer,
      maven,
      startSbt,
      loadJson,
      httpPort
    },
    defPath = path.join(__projectPath, devFile),
    def = __debug('Loading %s', defPath) && fileSystem.readFileSync(defPath)
    vm.runInNewContext(def, defCtx, defPath)
  })
}
