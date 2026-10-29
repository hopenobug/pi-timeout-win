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
command with a configurable prefix (by default `timeout`):

```
<commandPrefix> "${BASH:-sh}" -c '<original command>'
```

`${BASH:-sh}` is expanded by the shell pi already uses to run the command, so the
wrapper never hardcodes a path:

- Git Bash / MSYS2: `$BASH` is that shell's own bash, so a WSL `bash.exe` on `PATH` is
  never picked up.
- busybox-w32 `sh` (or any plain `sh`): there is no `$BASH` and no `/usr/bin/bash`, so
  it falls back to the `sh` on `PATH` — the same shell pi would have used unwrapped.

With the default `commandPrefix` of `timeout -s KILL <timeout>s`, this becomes:

```
timeout -s KILL <timeout>s "${BASH:-sh}" -c '<original command>'
```

`timeout` puts the spawned shell into its own process group and signals the whole group
on expiry, so parent and children are terminated together. `-s KILL` is used instead of
GNU's `-k`: busybox's `timeout` applet has no `-k`, and on Windows a `TERM` grace period
buys nothing since there is no graceful shutdown to wait for. See
[Configuration](#configuration) to change the prefix.

## Configuration

The extension reads the `piTimeoutWin` key in `~/.pi/agent/settings.json` when it
loads. The file is read once at startup, so restart pi after changing it. The
available settings are:

```json
{
  "piTimeoutWin": {
    "enabled": true,
    "commandPrefix": "timeout -s KILL {timeout}s"
  }
}
```

- Every `{timeout}` in the prefix is replaced with the bash tool call's `timeout` (in
  seconds).
- Default: `timeout -s KILL {timeout}s`. Override it to point at a different `timeout`
  binary, or to use GNU coreutils' `-k 5s` / plain `-s TERM` variants if you prefer a
  grace period.
- If `timeout` is not available at all, set `commandPrefix` to `""` — the command is
  still run through the detected shell, just without a timeout wrapper.
- `enabled`: set to `false` to disable the extension entirely — commands pass
  through unwrapped and no other configuration is consulted. Useful for
  temporarily turning the timeout off without uninstalling. Default: `true`.
- If the file is missing, contains invalid JSON, or has no `piTimeoutWin` object, the
  default is used.


### Skipped cases

The command is passed through unwrapped when:

- the platform is not Windows
- the call has no `timeout`, or its value is not a positive number
- the extension is disabled (`enabled: false` in settings)
