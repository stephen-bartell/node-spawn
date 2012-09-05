var child = require('child_process')
  , EventEmitter = require('eventemitter2').EventEmitter2
  , uuid = require('uuid')
  , util = require('util')

function hOP = function (obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}


module.exports = function (options) {
  return new Supervisor(options)
}


util.inherits(Supervisor, EventEmitter)

function Supervisor (options) {
  EventEmitter.apply(this,  { wildcard: true
                            , delimiter: '::'
                            }
  )

  this.running = {}

  // configure defaults
  this.defaults = {
      env: null
    , cwd: null
    , bin: null
    , path: null
    , delay: null         // start now
    , restarts: null      // -1: inf, 0: none, 0+ : multiple
    , restartDelay: 500   // milliseconds
    , _restarted: 0
    , _lastStart: 0
    , onStdout: util.log
    , onStderr: util.error
    }
}


function intakeScript (script) {
  var self = this

  // setup defaults
  var opts = util._extend({}, self.defaults)

  // maybe override opts
  if (hOP(script, 'env')) opts.env = script.env 
  if (hOP(script, 'cwd')) opts.cwd = script.cwd 
  if (hOP(script, 'bin')) opts.bin = script.bin
  if (hOP(script, 'path')) opts.path = script.path
  if (hOP(script, 'delay')) opts.delay = script.delay
  if (hOP(script, 'restarts')) opts.restarts = script.restarts
  if (hOP(script, 'restartDelay')) opts.restartDelay = script.restartDelay
  if (hOP(script, 'onStdout')) opts.onStdout = script.onStdout
  if (hOP(script, 'onStderr')) opts.onStderr = script.onStderr

  return opts
}


function start = function (opts) {
  var self = this
  var opts = {cwd: opts.cwd, env: opts.env}

  function getDelay (opts) {
    var time = new Date().getTime()
    var delay = opts.restartDelay - (time - opts._lastStart)
    return (delay < 0) ? 0 : delay
  }

  function spawn () {
    var opts = this

    var c = child.spawn(opts.cmd, [opts.path], {
        cwd: opts.cwd
      , env: opts.env
      , detached: false
    })

    c.stdout.on('data', function (data) {
      opts.onStdout(data)
    })

    c.stderr.on('data', function (data) {
      opts.onStderr(data)
    })

    c.on('exit', function (code) {
      if (!opts.restarts) {
        return self.emit([opts.id, 'dead'], 'no more restarts', opts)

      } else if (opts.restarts < 0) {
        self.emit([opts.id, 'restarting', opts])
        var delay = getDelay(opts)
        setTimeout(spqwn.bind(opts), delay)

      } else if (opts.restarts > 0 && opts._restarted <= opts.restarts) {


      }
    })

  }



  return c
}


Supervisor.prototype.spin = function (scripts) {
  var self = this
  var running = []

  scripts.forEach(function (script) {
    var opts = intakeScript(script)
    opts.id = uuid.v1()

    if (!opts.bin || !opts.path) { 
      return self.emit('spinError'
                      , new Error('no bin or path specified')
                      , opts
                      )
    }

    running.push(start(opts))
  })
  return running

}


Supervisor.prototype.get = function (id) {
  if (hOP(this.running, id)) {
    return this.running(id)
  } else {
    return null
  }
}


Supervisor.prototype.kill = function (id) {

}


Supervisor.prototype.restart = function (id) {

}
