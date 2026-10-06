# pi-timeout-win

Make pi's bash timeouts work better on Windows.

## Background

When a bash call times out, pi kills the process with `taskkill`, but on Windows that
only kills the parent bash process. Child processes started by bash (builds, tests,
downloads, etc.) keep running in the background, potentially holding onto CPU, files,
or ports.

## Installation

```
pi install git:github.com/hopenobug/pi-timeout-win
```

## How it works

This extension intercepts `bash` tool calls on the `tool_call` event and wraps the
command with GNU coreutils' `timeout`:

```
timeout -k 5s <timeout>s bash -c '<original command>'
```

`timeout` puts the spawned bash into its own process group and signals the whole group
on expiry, so parent and children are terminated together; `-k 5` sends `TERM` first
and escalates to `KILL` after 5 seconds.

### Skipped cases

The command is passed through unwrapped when:

- the platform is not Windows
- the command already starts with `timeout ` (avoids double wrapping)
- the call has no `timeout`, or its value is not a positive number
