'use strict'

const tasks = require('./tasks'),
      spawn = require('child_process').spawn,
      ansi = require('ansi_up'),
      lineStream = require('./utils').lineStream,
      parseCommandLine = require('./utils').parseCommandLine,
      randomstring = require('randomstring'),
      path = require('path')

// Deprecated, use webpack instead
exports.webpackWatch = (def) => {
  if(def.sh) def.command = ['sh', '-c', def.sh]
  if(!def.command) def.command = ['webpack --watch --json']
  let cmd = parseCommandLine(def.command)
  let webpackSession = tasks.create(
    def.name || 'webpack',
    def.cwd || __projectPath,
    function(out, success, error) {
      if(!this.daemon) {
        this.daemon = {}
        this.daemon.process = spawn(cmd[0], cmd.slice(1), {cwd: this.cwd, env: def.env || process.env})
        this.daemon.lines = lineStream(this.daemon.process.stdout)
        this.daemon.jsonBuffer = ''
        this.daemon.nextCallback = null
        this.daemon.lastResult = null
        this.daemon.lines.on('line', (_, text, html) => {
          this.daemon.jsonBuffer = this.daemon.jsonBuffer + text
          if(text == '}') {
            try {
              this.daemon.lastResult = JSON.parse(this.daemon.jsonBuffer)
              this.daemon.nextCallback && this.daemon.nextCallback(this.daemon.lastResult)
            }
            catch(e) {}
            this.daemon.jsonBuffer = ''
            this.daemon.nextCallback = null
          }
          else {
            this.daemon.lastResult = null
          }
        })
        this.daemon.waitNextResult = (cb) => {
          if(this.daemon.lastResult) {
            cb(this.daemon.lastResult)
          }
          else {
            this.daemon.nextCallback = cb
          }
        }
      }
      this.daemon.waitNextResult(result => {
        if(result.errors.length) {
          out(result.errors[0], result.errors[0])
          error()
        } else {
          success()
        }
      })
    },
    function() {
    },
    def.watch
  )
  return webpackSession
}

exports.webpack = (def) => {
  let compilerInstance = null;
  let compiler = () => {
    if(!compilerInstance) {
      const localWebpack = require.resolve(path.join(process.cwd(), "node_modules", "webpack", "lib", "webpack.js"));
      let config = require(require.resolve(path.join(process.cwd(), def.config || 'webpack.config.js')));
      let webpack = require(localWebpack);
      compilerInstance = webpack(config);
    }
    return compilerInstance;
  };
  return tasks.create(
    def.name || 'webpack',
    def.cwd || __projectPath,
    (out, success, error) => {
      out('Running webpack...\n');
      compiler().run((err, stats) => {
        out(ansi.ansi_to_html(
          stats.toString({
            chunks: false,
            colors: true
          }).replace('<', '&lt;'), 
          {use_classes: true}
        ))
        if(stats.compilation.errors && stats.compilation.errors.length) {
          error()
        } else {
          success()
        }
      })
    },
    () => {},
    def.watch
  )
}
