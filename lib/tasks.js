'use strict'

const util = require('util'),
      watcher = require('./watcher'),
      EventEmitter = require("events").EventEmitter,
      taskIds = (function* taskIds() {
        let id = 0
        while(true) yield id++
      })()

exports.all = new Set()

exports.create = function(label, cwd, execute, kill, watch) {
  var task = {
    label,
    cwd,
    id: taskIds.next().value,
    parents: [],
    children: [],
    ready: false,
    running: false,
    lastRun: undefined,
    buildBuffer: [],
    events: null,
    execute(buildEvents) {
      __debug('[%s] Execute', this.id)
      if(!this.running) {
        let start = Date.now()
        this.events = new EventEmitter()
        this.events.on('progress', e => buildEvents.emit('progress', e))
        this.buildBuffer = []
        this.ready = false
        let progress = e => {
          this.buildBuffer.push(e)
          this.events.emit('progress', e)
        }
        this.running = new Promise(
          (resolve, reject) => {
            progress({task: this.id, state: 'start', label: this.label, ts: Date.now()})
            kill.call(this)
            __debug('[%s] Killed', this.id)
            execute.call(this,
              (msg) => progress({task: this.id, state: 'running', log: msg && msg.toString(), ts: Date.now()}),
              () => {
                resolve()
                progress({task: this.id, state: 'success', ts: Date.now()})
                this.lastRun = Date.now() - start
              },
              () => {
                reject()
                progress({task: this.id, state: 'error', ts: Date.now()})
              }
            )
            __debug('[%s] Run', this.id)
          }
        ).then(() => {
          this.ready = true
          this.running = false
        }).catch(e => {
          this.ready = false
          this.running = false
          return Promise.reject(e)
        })
      }
      else {
        __debug('[%s] Already running, reemiting %s events', this.id, this.buildBuffer.length)
        this.buildBuffer.forEach(e => buildEvents.emit('progress', e))
      }
      return this.running
    },
    dependsOn(other) {
      Array.prototype.slice.call(arguments).forEach(x => {
        this.parents.push(x)
        x.children.push(this)
      })
      return this
    },
    checkDirty(filename) {
      this.watcher(filename) && this.dirty()
    },
    kill: function() {
      kill.call(this)
    },
    dirty: function() {
      __debug('[%s] Is dirty', this.id)
      this.ready = false
      this.running = false
      this.children.forEach(task => task.dirty())
    }
  }
  __debug('Created task [%s]: %s', task.id, task.label)
  task.watcher = watcher.watch(task, watch)
  exports.all.add(task)
  return task
}

exports.run = function(task, events) {
  if(task.ready) {
    return Promise.resolve()
  } else {
    return Promise.all(task.parents.map(parentTask => {
      return exports.run(parentTask, events)
    })).then(() => {
      return task.execute(events)
    }).then(() => {
      __debug('[%s] Success', task.id)
    }).catch(e => {
      __debug('[%s] Failed with %s', task.id, e)
      if(e) process.nextTick(() => { throw e })
      return Promise.reject(e)
    })
  }
}
