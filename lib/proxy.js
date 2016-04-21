'use strict'

const http = require('http'),
      httpProxy = require('http-proxy'),
      EventEmitter = require("events").EventEmitter,
      tasks = require('./tasks'),
      waitHttpPortReady = require('./utils').waitHttpPortReady,
      term = require('./term').term,
      fileSystem = require('fs'),
      path = require('path'),
      babel = require('babel-core'),
      stylus = require('stylus')

exports.proxy = function(serverTask, port) {
  if(!serverTask.httpPort) throw new Error('Not a serverTask')
  let task = tasks.create(
    `__PROXY:${serverTask.httpPort}`,
    __projectPath,
    function(out, success, error) {
      this.poller = waitHttpPortReady(serverTask.httpPort, result => {
        if(result) {
          success()
        }
        else {
          serverTask.dirty()
          error()
        }
      }, 1)
    },
    function() {
      this.poller && this.poller.cancel()
    }
  ).dependsOn(serverTask)
  task.port = port
  task.server = serverTask

  let proxyServer = httpProxy.createProxyServer({})

  task.buildBuffer = []
  task.buildEvents = null
  task.pendingBuild = null
  task.build = function(responseEvents) {
    if(!this.pendingBuild) {
      this.buildBuffer = []
      this.buildEvents = new EventEmitter()

      let cleanState = () => {
        this.buildEvents.removeAllListeners('progress')
        this.pendingBuild = null
        this.buildBuffer = null
        this.buildEvents = null
      }

      this.pendingBuild = tasks.run(task, this.buildEvents).then(cleanState).catch(_ => {
        cleanState()
        return Promise.reject()
      })

      this.buildEvents.on('progress', e => this.buildBuffer.push(e))
      this.buildEvents.emit('progress', {
        plan: Array.from(tasks.all).filter(t => !t.ready).map(x => {
          return {
            id: x.id,
            label: x.label,
            runningTime: x.lastRun
          }
        }),
        isDebug: __isDebug,
        ts: Date.now()
      })
    }

    this.buildBuffer.forEach(e => responseEvents.emit('progress', e))
    this.buildEvents.on('progress', e => responseEvents.emit('progress', e))

    return this.pendingBuild
  }

  let BYPASS = '/~~~---~~~/'
  http.createServer(function(req, res) {
    proxyServer.once('error', e => {
      __debug('Proxy error', e)
      res.end()
    })

    if(req.url.startsWith(BYPASS)) {
      let resource = req.url.substring(BYPASS.length)
      res.write(loadUIResource(resource))
      res.end()
    }
    else {
      if(task.ready) {
        proxyServer.web(req, res, { target: ('http://localhost:' + serverTask.httpPort) })
      } else {
        res.writeHead(200, {
          'Content-Type': 'text/html'
        })
        res.write(buildUI())

        let buildEvents = new EventEmitter()
        buildEvents.on('progress', function(e) {
          res.write(`<script>buildEvent(${JSON.stringify(e)})</script>`)
        })

        // Go!
        task.build(buildEvents).then(() => {
          res.write('<script>buildEnd(true)</script>')
          res.end()
        }).catch(e => {
          res.write('<script>buildEnd(false)</script>')
          res.end()
        })
      }
    }

  }).listen(port)

  let loadUIResource = (res) => {
    let f = path.join(__dirname, `web/${res}`)
    try {
      return fileSystem.readFileSync(f)
    }
    catch(e) {
      console.log(`Resource not found ${f}`)
      return ''
    }
  }

  let _UICache = null; let buildUI = () => {
    if(_UICache) {
      return _UICache
    }
    else {
      let html = fileSystem.readFileSync(path.join(__dirname, 'web/index.html')).toString()
      // Include JS
      html = html.replace(/<script src="([^"]+)".*?(version="([^"]+)")?><\/script>/g, (_, url, __, version) => {
        let code = ''
        if(version == 'es2015') {
          code = babel.transformFileSync(path.join(__dirname, 'web/' + url), {presets: ['es2015']}).code
        }
        else {
          code = fileSystem.readFileSync(path.join(__dirname, 'web/' + url))
        }
        return `<script>${code}</script>`
      })
      // Include CSS
      html = html.replace(/<link rel="stylesheet" type="text\/css" href="([^"]+)">/g, (_, url) => {
        let css = fileSystem.readFileSync(path.join(__dirname, 'web/' + url)).toString()
        if(url.endsWith('.styl')) {
          css = stylus(css).render()
        }
        return `<style>${css}</style>`
      })
      if(!__isDebug) {
        _UICache = html
      }
      return html
    }
  }

  term(task)
  return task
}
