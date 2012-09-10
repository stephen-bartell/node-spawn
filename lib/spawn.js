var child = require('child_process')
  , events = require('events')
  , crypto = require('crypto')
  , util = require('util')

// uid stolen from connect.js/lib/utils.js.
function uid (len) {
  return crypto.randomBytes(Math.ceil(len * 3 / 4))
    .toString('base64')
    .slice(0, len);
};

function hOP (obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}


module.exports = function (options) {
  return new Spawn(options)
}

function Spawn (options) {
  var self = this

  var getOptions = function () {
    // inherit standard issue defaults.
    var _opts = util._extend({}, self.defaults)

    // overide where applicable 
    if (hOP(options, 'env')) _opts.env = options.env 
    if (hOP(options, 'cwd')) _opts.cwd = options.cwd 
    if (hOP(options, 'cmd')) _opts.cmd = options.cmd
    if (hOP(options, 'args')) _opts.args = options.args
    if (hOP(options, 'restarts')) _opts.restarts = options.restarts
    if (hOP(options, 'restartDelay')) _opts.restartDelay = options.restartDelay
    if (hOP(options, 'onStdout')) _opts.onStdout = options.onStdout
    if (hOP(options, 'onStderr')) _opts.onStderr = options.onStderr

    // setup Spawn-specific defaults
    _opts._timesStarted = 0    // how many times has this options has run
    _opts._startAt = 0         // when was the last time this options ran
    _opts._kill = false

    return _opts
  }

  // container for all active scripts.
  this.running = []

  // setup defaults to maybe be used by all scripts.
  this.defaults = { 
      env: null
    , cwd: null
    , args: []
    , restarts: 0         // -1: inf, 0: none, 0+ : multiple
    , restartDelay: 500   // milliseconds
    , onStdout: util.log
    , onStderr: util.error
    }

  this.options = getOptions()
  this.id = this.options.id = uid(6)
}

// inherit the eventemitter
util.inherits(Spawn, events.EventEmitter)


Spawn.prototype.start = function () {
  var self = this

  run.bind(self.options)()
  return self

  //
  //  Start helper functions
  //

  // calculate spin up delay, if there is any.
  function getDelay (options) {
    var now = new Date().getTime()

    // if this is a 1st run, initialize _startAt.
    if (!options._startAt) options._startAt = now

    var diff = now - options._startAt

    // maybe _startAt is in the future, make sure that wont screw things up.
    if (diff < 0) diff = 0

    var delay = options.restartDelay - diff

    return (delay < 0) ? 0 : delay
  }

  function run (cb) {
    var options = this

    var spawnOpts = { 
        cwd: options.cwd
      , env: options.env
      , detached: false
      }

    try { 
      var _spawn = child.spawn(options.cmd, options.args, spawnOpts)
    } catch (er) {
      self.emit('fail', er)
      return
    }

    // store the spawn
    self.running.push(_spawn)

    // remember some info
    options._startAt = new Date().getTime()
    options._timesStarted++
    self.emit('start', options)

    //
    // setup event handlers.
    //
    _spawn.stdout.on('data', function (data) {
      options.onStdout(data)
    })

    _spawn.stderr.on('data', function (data) {
      options.onStderr(data)
    })

    _spawn.on('exit', function (code) {
      // remove dead spawn.
      var dead = self.running.pop()
      dead = undefined // encourage gc

      // setup controls
      var doRestart = false
      if (options._kill) {
        // do nothing, doRestart will remain false.

      } else if (!options.restarts) {
        self.emit('dead', 'no more restarts', options)

      } else if (options.restarts < 0) {
        doRestart = true

      } else if (options.restarts > 0 && options._timesStarted < options.restarts) {
        doRestart = true
      }

      // act on controls
      if (doRestart) {
        self.emit('restart', options)
        setTimeout(run.bind(options), getDelay(options))
      }
    })
  }
}


//
//  `start` a script once.  Once its dies, it dies.
//
Spawn.prototype.once = function () {
  this.options.restarts = 0
  this.start()
  return this
}

//
//  Keep a script alive for as long as this `Spawn` is around.
//
Spawn.prototype.forever = function () {
  this.options.restarts = -1
  this.start()
  return this
}


//
//  Kill the script.
//
Spawn.prototype.kill = function () {
  this.options._kill = true
  if (!this.running.length) {
    return
  }
  this.running.forEach(function (script) {
    script.kill()
  }) 
}