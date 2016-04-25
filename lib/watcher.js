'use strict'

const util = require('util'),
      tasks = require('./tasks'),
      path = require('path'),
      minimatch = require('minimatch'),
      chokidar = require('chokidar');

let watchHandler = filename => {
  __debug('File changed: %s', filename)
  tasks.all.forEach(task => {
    task.checkDirty(path.relative(__projectPath, filename))
  })
}

__debug('Watching file changes in %s', __projectPath)
chokidar.watch(__projectPath)
  .on('add', watchHandler)
  .on('change', watchHandler)
  .on('unlink', watchHandler)
  .on('addDir', watchHandler)
  .on('unlinkDir', watchHandler)

exports.watch = function(task, watchFiles) {
  if(util.isFunction(watchFiles)) {
    return watchFiles
  }
  else {
    let patterns = (
      (watchFiles ? (util.isArray(watchFiles) ? watchFiles : [watchFiles]) : []).map(x => x.toString())
    )
    return (filename) => {
      for(let i=0; i<patterns.length; i++) {
        if(filename && minimatch(filename, task.cwd == __projectPath ? patterns[i] : path.join(task.cwd, patterns[i]))) {
          if(task.changedFiles && task.changedFiles.indexOf(filename) < 0) {
            task.changedFiles.push(filename)
          }
          return true
        }
      }
      return false
    }
  }
}
