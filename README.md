# loop
[![Build Status](https://travis-ci.org/criteo/loop.svg?branch=master)](https://travis-ci.org/criteo/loop)
[![npm version](https://badge.fury.io/js/devloop.svg)](https://badge.fury.io/js/devloop)
[![Dependency Status](https://david-dm.org/criteo/loop.svg)](https://david-dm.org/criteo/loop)
## Awesome dev loop — enhance your web application development workflow

- [Why?](#why)
- [Usage](#usage)
- [Docs](#docs)
- [Examples](#examples)
- [FAQ](#faq)
- [Github](http://github.com/criteo/loop)

### Why?

Working on today's web applications requires managing several build systems. For example you will use `sbt`, `cargo`, `cake`, `go build` or `maven` to compile your backend; `webpack`, `grunt` or `gulp` to build your frontend; `npm` or `bower` to fetch some dependencies; plus a bunch of `sql` or `bash` scripts to reset your data...oh, and you have to restart your server after a change if it does not auto-reload for you.

If you are not using a full-stack integrated web framework that manages all that for you, your development workflow (thus your productivity) probably suffers a lot.

**loop** enhances your workflow by managing all these repetitive steps. It sits in front of your application, and runs all the needed build tasks before starting your server. Then it monitors the filesystem changes, rebuilding and restarting if needed.

Because it is external to your project, it is agnostic to your technology choices: you can use whatever build system and setup you prefer. It just runs your build tasks and monitors the results.

And because everything happens in your browser, you can stay focused on your work: edit your source code, click reload in your browser and see the result!

### Usage

**loop** is a command line tool that needs to be installed from npm.

#### Install globally

```
$ npm install --global devloop
```

And then you can use it in any project, by running the `loop` command.

#### Install locally to a project

If you do not want to install it globally, you can also install a specific version in your project dependencies.

```
$ npm install --save-dev devloop
```

And then use it by running the `node_modules/.bin/loop` command.

#### Run the dev loop

Run the `loop` command in any _looped_ project, ie. a project that contains a `devloop.js` definition file (see the [docs](#docs)). This file defines the tasks needed to run the project in development mode.

```javascript
$ cd my_looped_webapp/
$ loop
=> Now browse to http://localhost:8080
```

You can then point your browser to http://localhost:8080. It will run the build and stream the result to the browser. Once the build is done, your server is started and your application is served.

If you have changed some files in your project, just reload the page in your browser. The necessary build step will be run again.

Pressing `r` in the terminal while **loop** is running will force the server task to restart. Pressing `x` will kill the current build and restart from scratch.

### Docs

The development tasks are described in a file named `devloop.js` located at your project root. This is a javascript file, declaring several "tasks" and their dependencies. There are two mandatory tasks: `proxy`, and `server`.

Therefore, a minimal `devloop.js` file looks like:

```javascript
'use strict'

let server = runServer({
  httpPort,
  sh: `python -m SimpleHTTPServer ${httpPort}`
})

proxy(server, 8080)
```

It starts the reverse proxy on port 8080, and runs the server task before serving the application.

Any task can also declare further dependencies, for example:

```javascript
proxy(server, 8080).dependsOn(webpack, less)
```

In this case the proxy will start serving the application when the server is ready, and the `webpack`and `less` tasks have completed as well.

Finally, tasks can watch the filesystem, and restart themselves if something changes. Of course, if a task restarts, all its dependencies will restart as well:

```javascript
let server = runServer({
  httpPort,
  sh: `java -cp "lib/*" MyServer`,
  watch: 'lib/**'
})
```

Here, as soon as a jar file change in the lib directory, the server will be marked dirty, and will restart at the next page reload. The `httpPort` variable here is injected to the main scope by **loop**, and is set to a random, available TCP port. You are free to use it or not.

##### proxy(serverTask, httpPort)

Starts a reverse proxy (RP) at `httpPort`. The RP will start serving the application as soon the `serverTask` and all its dependencies are ready.

##### run(options)

Runs a task. A task can be any process that can be forked. **loop** waits for the exit status of the process, and decides whether the task was successful or not.

Options:

- `name`: _String_, the task label in the UI.
- `sh`: _String_, the shell command to fork (requires Linux, MacOS, or running on Cygwin).
- `command`: _Array of String_, the command + options to fork (if not using sh).
- `cwd`: _String_, the current directory for the task.
- `env`: _Object_, the environment for the task.
- `watch`: _String or Array of String_, the file patterns to watch.

##### runServer(options)

Starts a _server_ task. A server task is different from a standard task because **loop** does not wait for the process to exit to mark it as successful. Instead, it waits for the http port opened by the server process to be available.

Options:

- `name`: _String_, the task label in the UI.
- `httpPort`: _Number_, the http port on which the server should listen.
- `sh`: _String_, the shell command to fork (requires Linux, MacOS, or running on Cygwin).
- `command`: _Array of String_, the command + options to fork (if not using sh).
- `cwd`: _String_, the current directory for the task.
- `env`: _Object_, the environment for the task.
- `watch`: _String or Array of String_, the file patterns to watch.

##### maven(options)

Basically the same as using `run({sh: 'maven'})` but colorizes the Maven output (the only advantage of using this instead of a plain `run` task).

Options:

- `name`: _String_, the task label in the UI.
- `sh`: _String_, the shell command to fork (requires Linux, MacOS, or running on Cygwin).
- `command`: _Array of String_, the command + options to fork (if not using sh).
- `cwd`: _String_, the current directory for the task.
- `env`: _Object_, the environment for the task.
- `watch`: _String or Array of String_, the file patterns to watch.

##### startSbt(options)

Starts a resident sbt build. This task returns an sbt session that you can use to run further sbt commands. The main advantage of using this instead of the `run` task to run sbt directly, is that the sbt session is kept alive so running the sbt commands is then way faster. Especially for `scalac` commands.

Options:

- `name`: _String_, the task label in the UI.
- `sh`: _String_, the shell command to fork (requires Linux, MacOS, or running on Cygwin).
- `command`: _Array of String_, the command + options to fork (if not using sh).
- `cwd`: _String_, the current directory for the task.
- `env`: _Object_, the environment for the task.
- `watch`: _String or Array of String_, the file patterns to watch.

The returned sbt session allows can then create more sbt tasks using `run` with these options:

- `name`: _String_, the task label in the UI.
- `command`: _String_, the sbt command to run.

##### webpackWatch(options)

Starts webpack in watch mode in the background. The task will then just check that the last webpack run was successful before continuing. _It is way faster than running webpack from scratch each time, but can occasionally miss a webpack build failure because of the lack of real synchronization between the two processes._

By default the command used is `webpack --watch --json`. You can customize it, but it must output its result in JSON and it must be run in watch mode of course.

- `sh`: _String_, the shell command to fork (requires Linux, MacOS, or running on Cygwin).
- `command`: _Array of String_, the command + options to fork (if not using sh).
- `cwd`: _String_, the current directory for the task.
- `env`: _Object_, the environment for the task.
- `watch`: _String or Array of String_, the file patterns to watch.

### Examples

Some example configurations are available in the `examples/` directory:

- **dummy-project**: The 'Hello world' for **loop**; just shows the basics.
- **node-project**: A sample node project, with some frontend assets build with webpack and stylus.
- **java-project**: A sample java project, with some frontend assets build with webpack and stylus.

### FAQ

#### Will loop replace my build system?

Not at all, **loop** is not another build system, it will just run your build systems for you. Think about it as a bot that will run all the commands you usually run yourself in a terminal while you are developing.

#### I use loop, but the build step is too long. My dev workflow was not improved :(

You probably need to split down your build pipeline into smaller parts. Actually, a dev build pipeline is generally different than the one you use to build the distributed version of your project. It does not mean that you have to duplicate your build; you just have to compose it from smaller parts.

#### When loop restarts my server, I'm logged out/my application crashes

Yes, if you use a server that does not support automatic code reload, **loop** will have to restart the server process. But in a well designed application it should not log you out. There are several ways to store the session state outside of the server process (either on the client side or in a datastore which is not tied to the actual server code version). Yes, it will help your development process, but it will also help you at deployment time if you want to run your code on several application servers.

### License

This project is licensed under the Apache 2.0 license.

### Copyright

Copyright © [Criteo](http://labs.criteo.com), 2017.
