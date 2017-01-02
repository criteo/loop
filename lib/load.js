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
      platform = require('process').platform,
      webpackWatch = require('./webpack').webpackWatch

exports.load = function(devFile) {
  findFreePort(httpPort => {
    let defPath = path.join(__projectPath, devFile),
    defCtx = {
      __filename: devFile,
      __dirname: __projectPath,
      require: require('require-like')(defPath),
      console,
      platform,
      proxy,
      run,
      runServer,
      maven,
      startSbt,
      loadJson,
      httpPort,
      webpackWatch
    },
    def = __debug('Loading %s', defPath) && fileSystem.readFileSync(defPath)
    vm.runInNewContext(def, defCtx, defPath)
  })
}
