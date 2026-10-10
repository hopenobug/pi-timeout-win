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
command with a configurable prefix (by default GNU coreutils' `timeout`):

```
# use /usr/bin/bash to avoid using WSL bash
<commandPrefix> /usr/bin/bash -c '<original command>'
```

With the default `commandPrefix` of `timeout -k 5s <timeout>s`, this becomes:

```
timeout -k 5s <timeout>s /usr/bin/bash -c '<original command>'
```

`timeout` puts the spawned bash into its own process group and signals the whole group
on expiry, so parent and children are terminated together; `-k 5` sends `TERM` first
and escalates to `KILL` after 5 seconds. See [Configuration](#configuration) to change
the prefix.

## Configuration

The extension reads the `piTimeoutWin` key in `~/.pi/agent/settings.json` when it
loads. The file is read once at startup, so restart pi after changing it. The only
setting is `commandPrefix`, the prefix prepended to every wrapped command:

```json
{
  "piTimeoutWin": {
    "commandPrefix": "timeout -k 5s {timeout}s"
  }
}
```

- Every `{timeout}` in the prefix is replaced with the bash tool call's `timeout` (in
  seconds).
- Default: `timeout -k 5s {timeout}s`. Override it to change the kill-after grace
  period (`-k 5s`) or to point at a different `timeout` binary.
- If the file is missing, contains invalid JSON, or has no `piTimeoutWin` object, the
  default is used.


### Skipped cases

The command is passed through unwrapped when:

- the platform is not Windows
- the call has no `timeout`, or its value is not a positive number
