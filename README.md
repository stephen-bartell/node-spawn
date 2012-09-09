node-spawn
==========

A thin wrapper around `child_process.spawn` which provides restarts.

## API ##

### Spawn(options) ###

Constructor. Sets the stage for the child process.

__Arguments__

Options - Object - (req)

* cmd - String - (req) Current working directory of the child process
* env - Object - (opt) Environment key-value pairs 
* cwd - Object - (opt) Absolute working directory of the child process
* args - Array - (opt) List of string arguments
* restarts - Integer - (opt) After death, how many times to restart
* * -1: forever
* * 0: no restarts
* * x: restart x-times 
* restartDelay - Decimal - (opt) Delay between restarts
* onStdout - Function - (opt) callback for child.stdout
* onSterr - Function - (opt) callback for child.stderr

__Defaults__


__Example__

```js
// simple example

spawn = Spawn({
    cmd: 'echo'
  , args: ['i love pancakes!']
})
```

```js
// make sure to use absolute path

spawn = Spawn({
    cmd: 'ilove.sh'
  , args: ['pancakes!']
  , cwd: '/Users/steve/git/scripts'
})
```

---------------------------------------

### start ###

Start the cmd with the options provided.

__Arguments__

None

---------------------------------------

### once ###

Convenience function.  Overides `options.restarts` to `0`. Runs command exactly once no matter the options passed into the constructor.

---------------------------------------

### forever  ###

Convenience function. Overides `options.restarts` to `-1`. Runs command indefinitely no matter the options passed into the constructor.

---------------------------------------

### kill ###

Shut down the child and dont let it restart.







