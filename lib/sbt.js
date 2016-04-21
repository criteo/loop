'use strict'

const tasks = require('./tasks'),
      spawn = require('child_process').spawn,
      lineStream = require('./utils').lineStream,
      parseCommandLine = require('./utils').parseCommandLine,
      randomstring = require('randomstring')

exports.startSbt = (def) => {
  if(def.sh) def.command = ['sh', '-c', def.sh]
  if(!def.command) def.command = ['sbt']
  let cmd = parseCommandLine(def.command)
  let promptToken = randomstring.generate(8),
      sbtSession = tasks.create(
        'sbt',
        def.cwd || __projectPath,
        function(out, success, error) {
          __debug('[SBT] Start')
          this.process = spawn(cmd[0], cmd.slice(1), {cwd: this.cwd, env: def.env || process.env})
          this.process.stderr.on('data', out)
          this.lines = lineStream(this.process.stdout, new RegExp(promptToken + '>'))
          this.lines.on('line', (_, text, html) => {
            if(this.pendingCommand) {
              this.pendingCommand.out(text, html)
            }
            else {
              out(text + '\n', html + '\n')
            }
          })
          this.lines.on('prompt', () => {
            if(this.pendingCommand) {
              this.pendingCommand.finish()
              this.pendingCommand = null
            }
            this.triggerNext()
          })
          this.pushCommand(
            'set shellPrompt := (_ => "' + promptToken + '" + ">")',
            (text, html) => {
              if(text.indexOf('[') == 0) out(html + '\n')
              if(text.indexOf('Project loading failed') == 0) {
                error()
              }
            },
            success
          )
        },
        function() {
          this.process && this.process.kill('SIGTERM')
        },
        def.watch
      )
  sbtSession.commandQueue = []
  sbtSession.pushCommand = function(command, out, finish) {
    this.commandQueue.push({command, out, finish})
    this.triggerNext()
  }
  sbtSession.triggerNext = function() {
    if(!this.pendingCommand && this.commandQueue.length) {
      this.pendingCommand = this.commandQueue.pop()
      this.lines.clear()
      __debug('[SBT] Run %s', this.pendingCommand.command)
      this.process.stdin.write(this.pendingCommand.command + '\n')
    }
  }
  sbtSession.run = function(def) {
    return tasks.create(
      def.name || def.command,
      sbtSession.cwd,
      function(out, success, error) {
        let seenError = false
        sbtSession.pushCommand(
          def.command,
          (text, html) => {
            if(text.indexOf('[') == 0) out(html + '\n')
            if(text.indexOf('[error]') == 0) seenError = true
          },
          () => {
            seenError ? error() : success()
          }
        )
      },
      function() {
        // Can't kill an SBT command this way
      },
      def.watch
    ).dependsOn(sbtSession)
  }
  return sbtSession
}
