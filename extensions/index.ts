import type { ExtensionAPI, ToolCallEventResult } from "@earendil-works/pi-coding-agent";

const UNSAFE = /[^A-Za-z0-9_@%+=:,./-]/;

export function shellQuote(arg: string): string {
  if (arg.length === 0) return "''";

  if (!UNSAFE.test(arg)) return arg;

  return "'" + arg.split("'").join("'\"'\"'") + "'";
}

export default function (pi: ExtensionAPI) {
	if (process.platform != "win32") return;

	pi.on("tool_call", (event, ctx): ToolCallEventResult | undefined => {
		if (event.toolName !== "bash") return undefined;

		const input = event.input as { command?: string; timeout?: number } | undefined;
   		if (!input || typeof input.command !== "string") return;

		const command = input.command;
		if (typeof command !== "string") return undefined;

		const stripped = command.trimStart();

		const t = input.timeout;
		if (stripped.startsWith("timeout ") || typeof t != "number" || t <= 0) {
			return undefined;
		}
		input.command = `timeout -k 5s ${t}s bash -c ${shellQuote(command)}`;
		return undefined;
	});
}
