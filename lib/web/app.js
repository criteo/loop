// -- Main events stream
const events = Rx.Observable.create(observer => {
  window.buildEvent = (e) => {
    observer.onNext(e)
  }
  window.buildEnd = (result) => {
    observer.onNext({build: result})
    observer.onCompleted()
  }
}).replay(); events.connect()

// -- Debug mode
let isDebug = false
events.filter(x => x.isDebug != undefined).subscribe(e => isDebug = e.isDebug)

// -- Global progress
events.filter(x => x.ts != undefined).subscribe(e => progress(e))

// -- Tasks streams
const tasks = events.groupBy(e => e.task)

tasks.subscribe(task => {
  task.filter(e => e.state == 'start').filter(t => !t.label.startsWith('__')).take(1).subscribe(t => {
    let taskUI = createTask(t),
        logs = task.filter(e => e.state == 'running').pluck('log')

    logs.take(1).subscribe(_ => taskUI.running())
    logs.subscribe(e => taskUI.log(e))

    task.filter(e => e.state == 'success').take(1).subscribe(_ => taskUI.success())
    task.filter(e => e.state == 'error').take(1).subscribe(_ => taskUI.failure())
  })
})

// -- Build
events.filter(x => x.build != undefined).pluck('build').subscribe(result => {
  if(result) {
    if(!isDebug) document.location.reload()
  }
  else {
    $(document.body).addClass('failure')
    $('ul#tabs li:not(.failure)').remove()
    reflowTabs()
  }
})

// -- UI
let icon = function(name) {
  let icon = $('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"></svg>')
  icon.append($(`#icons #icon-${name}`).clone())
  return icon
}

let reflowTabs = function() {
  let $tabs = $('ul#tabs li').toArray(),
      tabsWidth = $tabs.map(t => $(t).outerWidth()).reduce((a,b) => a + b, 0),
      vpWidth = $(document.body).width(),
      tabsLeft = Math.ceil((vpWidth - tabsWidth) / 2),
      selected = null,
      $focus = $('#focus')

  $tabs.reduce((x, t) => {
    let $t = $(t)
    $t.offset({left: x}).css('opacity', 1)
    if($t.is('.selected')) {
      selected = {
        left: x,
        width: $t.outerWidth()
      }
    }
    return x + $t.outerWidth()
  }, tabsLeft)

  if(selected) {
    $focus.width(selected.width).offset({left: selected.left})
  }
}

$(window).resize(reflowTabs)

let expectedTimes = [],
    startTimes = [],
    runningTimes = [],
    completed = [],
    lastOne = 0,
    progress = e => {

  if(e.plan) {
    e.plan.forEach(t => expectedTimes[t.id] = t.runningTime || (t.label.indexOf('__') == 0 ? 1000 : 10000))
  }
  else if(e.task != undefined) {
    startTimes[e.task] || (startTimes[e.task] = e.ts)
    runningTimes[e.task] = e.ts - startTimes[e.task]
    if(e.state == 'success') completed[e.task] = true
  }

  let total = expectedTimes.reduce((a,b) => a + b, 0),
      done = runningTimes.reduce((d,a,i) => {
        if(completed[i]) {
          return d + (expectedTimes[i] || 0)
        }
        else {
          return d + Math.min((runningTimes[i] || 0), (expectedTimes[i] || 0) * .9)
        }
      }, 0),
      progress = Math.round(done / total * 100) / 100

  if(progress > lastOne) {
    $('div#progress').css('transform', 'scaleX(' + progress + ')')
    lastOne = progress
  }
}

let autoSelect = true,
    createTask = function(task) {

  let $tab = $('<li>').append(task.label).append(icon('pending')),
      $console = $('<pre>')

  $tab.appendTo($('ul#tabs'))
  $console.appendTo($('section#console'))

  let select = () => {
    $('ul#tabs li.selected, section#console pre.selected').removeClass('selected')
    $tab.addClass('selected')
    $console.addClass('selected')
    setTimeout(_ => reflowTabs(), 0)
  }

  let setIcon = (name) => {
    $('svg', $tab).remove() && $tab.append(icon(name))
    return $tab
  }

  let running = () => {
    setIcon('running').addClass('running')
    autoSelect && select()
  }

  let success = () => {
    setIcon('success').removeClass('running').addClass('success')
    setTimeout(_ => {
      let stillRunning = $('ul#tabs li.running').data('api')
      stillRunning && stillRunning.select()
    }, 1000)
  }

  let failure = () => {
    setIcon('failure').removeClass('running').addClass('failure')
    select()
  }

  let log = (str) => {
    $console.append(str).scrollTop(9999999999)
  }

  if(!$('ul#tabs li.selected').size()) select()
  reflowTabs()

  $tab.click(_ => {
    autoSelect = false
    select()
  })

  let api = {
    select,
    running,
    success,
    failure,
    log
  }

  $tab.data('api', api)
  return api
}
