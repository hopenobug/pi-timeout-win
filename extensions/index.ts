import type { ExtensionAPI, ToolCallEventResult } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const UNSAFE = /[^A-Za-z0-9_@%+=:,./-]/;
const DEFAULT_COMMAND_PREFIX = "timeout -k 5s {timeout}s";

interface Config {
	commandPrefix?: string;
	enabled?: boolean;
}

function loadConfig(): Config {
	const configPath = join(getAgentDir(), "settings.json");
	try {
		const raw = JSON.parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
		if (raw.piTimeoutWin && typeof raw.piTimeoutWin === "object") {
			return raw.piTimeoutWin as Config;
		}
	} catch {
	}
	return {};
}

export function shellQuote(arg: string): string {
  if (arg.length === 0) return "''";

  if (!UNSAFE.test(arg)) return arg;

  return "'" + arg.split("'").join("'\"'\"'") + "'";
}

export default function (pi: ExtensionAPI) {
	if (process.platform != "win32") return;

	const config = loadConfig();
	if (typeof config.enabled === "boolean" && !config.enabled) return;

	const commandPrefix = config.commandPrefix ?? DEFAULT_COMMAND_PREFIX;

	pi.on("tool_call", (event, ctx): ToolCallEventResult | undefined => {
		if (event.toolName !== "bash") return undefined;

		const input = event.input as { command?: string; timeout?: number } | undefined;
   		if (!input || typeof input.command !== "string") return;

		const command = input.command;
		if (typeof command !== "string") return undefined;

		const t = input.timeout;
		if (typeof t != "number" || t <= 0) {
			return undefined;
		}

		input.command = `${commandPrefix.replaceAll("{timeout}", String(t))} /usr/bin/bash -c ${shellQuote(command)}`;
		return undefined;
	});
}
