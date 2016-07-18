'use strict'

const EventEmitter = require("events").EventEmitter,
      http = require('http'),
      ansi = require('ansi_up'),
      fileSystem = require('fs'),
      net = require('net')

exports.parseCommandLine = function(command) {
  return Array.isArray(command) ? command : command.toString().split(/\s+/).reduce((cmd, t) => {
    let last = cmd.slice(-1).length && cmd.slice(-1)[0]
    if(/^'/.test(last)) {
      let x = [cmd.pop(), t].join(' '),
          m = /^'(.*)'$/.exec(x)
      cmd.push(m ? m[1] : x)
    }
    else if(/^"/.test(last)) {
      let x = [cmd.pop(), t].join(' '),
          m = /^"(.*)"$/.exec(x)
      cmd.push(m ? m[1] : x)
    }
    else {
      cmd.push(t)
    }
    return cmd
  }, [])
}

exports.lineStream = function(stream, prompt) {
  let lines = new EventEmitter(),
      buffer = '',
      promptPattern = prompt || /.*/

  stream.on('data', data => {
    buffer += data.toString()
    while(buffer.indexOf('\n') > -1) {
      let line = buffer.substring(0, buffer.indexOf('\n'))
      buffer = buffer.substring(buffer.indexOf('\n') + 1)
      lines.emit('line', line, ansi.ansi_to_text(line), ansi.ansi_to_html(line.replace('<', '&lt;'), {use_classes: true}))
    }
    if(promptPattern.test(ansi.ansi_to_text(buffer))) {
      lines.emit('prompt', buffer)
    }
  })

  lines.clear = () => {
    buffer = ''
  }

  return lines
}

exports.checkHttp = function(port, callback) {
  let req = http.request(
    {
      hostname: 'localhost',
      port,
      path: '/',
      method: 'GET'
    },
    () => callback(true)
  )
  req.on('error', e => {
    if(e.code == 'ECONNREFUSED') {
      callback(false)
    }
    else callback(true)
  })
  req.end()
}

exports.waitHttpPortAvailable = function(port, onAvailable, timeout, interval) {
  var start = process.hrtime()[0]
  var check = function() {
    if(timeout && process.hrtime()[0] - start > timeout) {
      onAvailable(false)
    }
    else {
      setTimeout(() => {
        exports.checkHttp(port, (result) => {
          result ? check() : onAvailable(true)
        })
      }, interval || 100)
    }
  }
  check()
}

exports.waitHttpPortReady = function(port, onReady, timeout, interval) {
  var start = process.hrtime()[0]
  var poller = {
    running: true,
    check: function() {
      if(!this.running) return
      if(timeout && process.hrtime()[0]-start > timeout) {
        onReady(false)
      }
      else {
        setTimeout(() => {
          exports.checkHttp(port, (result) => {
            result ? onReady(true) : this.check()
          })
        }, interval || 100)
      }
    },
    cancel: function() {
      this.running = false
    }
  }
  poller.check()
  return poller
}

exports.loadJson = function(path) {
  return JSON.parse(fileSystem.readFileSync(path))
}

let portrange = 45032
exports.findFreePort = function(onPortFound) {
  let port = portrange
  portrange += 1

  let server = net.createServer()
  server.listen(port, err => {
    server.once('close', () => onPortFound(port))
    server.close()
  })
  server.on('error', err => exports.findFreePort(onPortFound))
}
