'use strict'

const tasks = require('./tasks'),
      spawn = require('child_process').spawn,
      lineStream = require('./utils').lineStream,
      parseCommandLine = require('./utils').parseCommandLine,
      waitHttpPortReady = require('./utils').waitHttpPortReady,
      waitHttpPortAvailable = require('./utils').waitHttpPortAvailable,
      EventEmitter = require("events").EventEmitter,
      util = require('util')

exports.run = (def) => {
  if(def.sh) {
    if(util.isFunction(def.sh)) {
      def.command = (changedFiles) => ['sh', '-c', def.sh(changedFiles)]
    } else {
      def.command = ['sh', '-c', def.sh]
    }
  }
  const dynamicCmd = util.isFunction(def.command)
  let cmd = dynamicCmd ? [] : parseCommandLine(def.command)
  return tasks.create(
    def.name || def.sh || cmd.join(' '),
    def.cwd || __projectPath,
    function(out, success, error, changedFiles) {
      if(dynamicCmd) {
        cmd = parseCommandLine(def.command(changedFiles))
      }
      this.process = spawn(cmd[0], cmd.slice(1), {cwd: this.cwd, env: def.env || process.env})
      lineStream(this.process.stdout).on('line', (_, __, html) => out(html + '\n'))
      lineStream(this.process.stderr).on('line', (_, __, html) => out(html + '\n'))
      this.process.on('exit', code => {
        if(code == 0) {
          success()
        } else {
          error()
        }
      })
    },
    function() {
      this.process && this.process.kill('SIGTERM')
    },
    def.watch
  )
}

exports.runServer = (def) => {
  if(def.sh) def.command = ['sh', '-c', def.sh]
  let cmd = parseCommandLine(def.command)
  let task = tasks.create(
    def.name || 'server',
    def.cwd || __projectPath,
    function(out, success, error) {
      waitHttpPortAvailable(def.httpPort, (result) => {
        if(result) {
          this.termEvents.emit('start', def.httpPort)
          this.process = spawn(cmd[0], cmd.slice(1), {cwd: this.cwd, env: def.env || process.env})
          let log = (raw, text, html) => {
            this.termEvents.emit('log', raw + '\n')
            out(html + '\n')
          }
          lineStream(this.process.stdout).on('line', log)
          lineStream(this.process.stderr).on('line', log)
          let poller = waitHttpPortReady(def.httpPort, result => (result ? success : error)())
          this.process.on('exit', status => {
            poller.cancel()
            error()
            this.dirty()
          })
        } else {
          out('Address already in use, port ' + def.httpPort)
          error()
        }
      }, 5)
    },
    function() {
      this.process && this.process.kill('SIGTERM')
    },
    def.watch
  )
  task.httpPort = def.httpPort
  task.termEvents = new EventEmitter()
  return task
}
