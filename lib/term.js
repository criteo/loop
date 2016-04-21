'use strict'

const term = require('terminal-kit').terminal,
      EventEmitter = require("events").EventEmitter,
      tasks = require('./tasks'),
      terminal = require( 'terminal-kit' ).terminal

let exit = () => {
  tasks.all.forEach(x => x.kill())
  process.exit()
}

exports.term = function(proxy) {
  console.log('=> Now browse to http://localhost:%s', proxy.port)
  proxy.server.termEvents.on('start', port => console.log('\n----- starting server...'))
  proxy.server.termEvents.on('log', txt => term(txt))

  terminal.grabInput()

  term.on('key', function(key, matches, data) {
    if(key === 'CTRL_C') {
      exit()
    }
    else if(key === 'r' || key === 'R') {
      proxy.server.dirty()
      terminal.red('Reload server...\n')
    }
    else if(key === 'x' || key === 'X') {
      tasks.all.forEach(x => x.dirty())
      terminal.red('Restart build...\n')
    }
  })
}
