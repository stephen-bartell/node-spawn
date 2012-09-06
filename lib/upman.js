var child = require('child_process')
  , events = require('eventemitter2')
  , uuid = require('node-uuid')
  , util = require('util')

function hOP (obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}


module.exports = function (options) {
  return new Upman(options)
}

util.inherits(Upman, events.EventEmitter2)

function Upman (options) {

  // initialize EventEmitter2
  events.EventEmitter2.call 
    ( this
    , { wildcard: true
      , delimiter: '::'
      }
    )

  // container for all active children
  this.running = {}

  // setup defaults to maybe be used by all scripts.
  this.defaults = 
    { env: null
    , cwd: null
    , args: []
    , restarts: 0         // -1: inf, 0: none, 0+ : multiple
    , restartDelay: 500   // milliseconds
    , onStdout: util.log
    , onStderr: util.error
    }
}


Upman.prototype.intakeScript = function (script) {
  var self = this

  // inherit standard issue defaults.
  var opts = util._extend({}, self.defaults)

  // overide defaults if theyre defined. 
  if (hOP(script, 'env')) opts.env = script.env 
  if (hOP(script, 'cwd')) opts.cwd = script.cwd 
  if (hOP(script, 'cmd')) opts.cmd = script.cmd
  if (hOP(script, 'args')) opts.args = script.args
  if (hOP(script, 'restarts')) opts.restarts = script.restarts
  if (hOP(script, 'restartDelay')) opts.restartDelay = script.restartDelay
  if (hOP(script, 'onStdout')) opts.onStdout = script.onStdout
  if (hOP(script, 'onStderr')) opts.onStderr = script.onStderr

  // setup script-specific defaults
  opts._timesStarted = 0    // how many times has this script has run
  opts._startAt = 0         // when was the last time this script ran

  return opts
}


Upman.prototype.start = function (opts) {
  var self = this

  // calculate spin up delay, if there is any.
  function getDelay (opts) {
    var now = new Date().getTime()

    // if this is a 1st run, initialize _startAt.
    if (!opts._startAt) opts._startAt = now

    var diff = now - opts._startAt

    // maybe _startAt is in the future, make sure that wont screw things up.
    if (diff < 0) diff = 0

    var delay = opts.restartDelay - diff

    return (delay < 0) ? 0 : delay
  }

  var spawn = function () {
    var opts = this

    var spawnOpts = { cwd: opts.cwd
                    , env: opts.env
                    , detached: false
                    }

    var c = child.spawn ( opts.cmd
                        , opts.args
                        , spawnOpts
                        )

    // remember spawn time.
    opts._startAt = new Date().getTime()
    opts._timesStarted++
    self.emit([opts.id, 'start'])

    //
    // setup event handlers.
    //
    c.stdout.on('data', function (data) {
      opts.onStdout(data)
    })

    c.stderr.on('data', function (data) {
      opts.onStderr(data)
    })

    c.on('exit', function (code) {
      //
      // setup controls
      //
      var doRestart = false

      if (!opts.restarts) {
        self.emit([opts.id, 'dead'], 'no more restarts', opts)

      } else if (opts.restarts < 0) {
        doRestart = true

      } else if (opts.restarts > 0 && opts._timesStarted < opts.restarts) {
        doRestart = true

      }

      //
      // act on controls
      //
      if (doRestart) {
        self.emit([opts.id, 'restart'], opts)
        setTimeout(spawn.bind(opts), getDelay(opts))
      }
    })

    // self.emit([opts.id, 'started'], opts)
  }

  spawn.bind(opts)()
}


Upman.prototype.spin = function (scripts) {
  var self = this

  scripts.forEach(function (script) {
    var opts = self.intakeScript(script)

    opts.id = uuid.v1()

    if (!opts.cmd) { 
      return self.emit('spinError'
                      , new Error('i need a command!')
                      , opts
                      )
    }

    self.start(opts)
  })
}


Upman.prototype.get = function (id) {
  if (hOP(this.running, id)) {
    return this.running(id)
  } else {
    return null
  }
}


Upman.prototype.kill = function (id) {

}


Upman.prototype.restart = function (id) {

}

var upman = new Upman()
var prog = upman.spin([{
    cwd: '/Users/stephen/Dropbox/git/node-upman/'
  , cmd: 'echo'
  , args: ['hey biatch!']
  , restarts: 5
  , restartDelay: 100
}])

// upman.on('*::started', function (opts) {console.log(opts)})
upman.on('*::start', function (opts) {console.log(opts)})
