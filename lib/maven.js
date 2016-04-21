'use strict'

const tasks = require('./tasks'),
      spawn = require('child_process').spawn,
      lineStream = require('./utils').lineStream,
      ansi = require('ansi_up'),
      parseCommandLine = require('./utils').parseCommandLine,
      terminal = require('terminal-kit').terminal

exports.maven = (def) => {
  if(def.sh) def.command = ['sh', '-c', def.sh]
  let cmd = parseCommandLine(def.command)
  return tasks.create(
    def.name || 'maven',
    def.cwd || __projectPath,
    function(out, success, error) {
      this.process = spawn(cmd[0], cmd.slice(1), {cwd: this.cwd, env: def.env || process.env})
      let colorize = line => {
        let color = (txt, f) => ansi.ansi_to_html(f(txt), {use_classes: true})
        if(line.indexOf('[WARNING]') == 0) {
          return color(line, terminal.str.yellow)
        }
        else if(line.indexOf('[INFO]') == 0) {
          return line
        }
        else if(line.indexOf('[ERROR]') == 0) {
          return color(line, terminal.str.red)
        }
        else {
          return color(line, terminal.str.black)
        }
      }
      lineStream(this.process.stdout).on('line', (_, text, __) => out(colorize(text) + '\n'))
      lineStream(this.process.stderr).on('line', (_, text, __) => out(colorize(text) + '\n'))
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
