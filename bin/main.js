#!/usr/bin/env node

'use strict'

global.__isDebug = process.argv[2] == '--debug'
global.__debug = function() {
  __isDebug && console.log.apply(this, arguments)
  return true
}
global.__projectPath = process.cwd()

const tasks = require('../lib/tasks'),
      watcher = require('../lib/watcher'),
      load = require('../lib/load').load

load('devloop.js')
