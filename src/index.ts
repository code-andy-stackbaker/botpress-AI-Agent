import * as bp from ".botpress";
import { z } from "zod";

// Narrow the 3rd-party API response with zod for runtime safety
const Ok = z.object({
	result: z.literal("success"),
	conversion_rate: z.number(),
});
const Err = z.object({ result: z.literal("error"), "error-type": z.string() });
const ApiResponse = z.union([Ok, Err]);

type Ctx = { configuration: { EXCHANGE_RATE_API_KEY?: string } };
type Input = { baseCurrency: string; targetCurrency: string };
type Logger = {
	forBot(): { info(msg: string): void; error(msg: string): void };
};

export default new bp.Integration({
	// Called when the integration instance is added to a bot
	register: async ({ logger }: { logger: Logger }) => {
		logger.forBot().info("[exchange-rate] register() called");
	},

	// Called when the integration instance is removed from a bot
	unregister: async ({ logger }: { logger: Logger }) => {
		logger.forBot().info("[exchange-rate] unregister() called");
	},

	// Implementation must expose the same action names as the definition
	actions: {
		async getCurrencyRate({
			ctx,
			input,
			logger,
		}: {
			ctx: Ctx;
			input: Input;
			logger: Logger;
		}): Promise<{ rate: number }> {
			const apiKey = ctx.configuration.EXCHANGE_RATE_API_KEY;
			if (!apiKey) {
				logger.forBot().error("[exchange-rate] Missing EXCHANGE_RATE_API_KEY");
				// Use RuntimeError so Studio shows a nice error message
				throw new (await import("@botpress/sdk")).RuntimeError(
					"Missing EXCHANGE_RATE_API_KEY"
				);
			}

			const base = input.baseCurrency.toUpperCase();
			const target = input.targetCurrency.toUpperCase();
			const url = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${base}/${target}`;

			logger
				.forBot()
				.info(`[exchange-rate] Fetching ${base}->${target} via ${url}`);

			let json: unknown;
			try {
				const res = await fetch(url);
				if (!res.ok) {
					logger
						.forBot()
						.error(`[exchange-rate] HTTP ${res.status} from upstream`);
					throw new Error(`HTTP ${res.status}`);
				}
				json = await res.json();
			} catch (e: any) {
				logger.forBot().error(`[exchange-rate] Network error: ${String(e)}`);
				throw new (await import("@botpress/sdk")).RuntimeError(
					"Failed to reach ExchangeRate API"
				);
			}

			const parsed = ApiResponse.safeParse(json);
			if (!parsed.success) {
				logger
					.forBot()
					.error(
						`[exchange-rate] Unexpected API shape: ${JSON.stringify(
							parsed.error.issues
						)}`
					);
				throw new (await import("@botpress/sdk")).RuntimeError(
					"Unexpected response from ExchangeRate API"
				);
			}

			const data = parsed.data;
			if (data.result === "error") {
				logger
					.forBot()
					.error(`[exchange-rate] API error: ${data["error-type"]}`);
				throw new (await import("@botpress/sdk")).RuntimeError(
					`ExchangeRate API error: ${data["error-type"]}`
				);
			}

			logger
				.forBot()
				.info(
					`[exchange-rate] Rate ${base}->${target} = ${data.conversion_rate}`
				);
			return { rate: data.conversion_rate };
		},
	},

	channels: {}, // leave empty unless you implement a message channel
	handler: async () => {
		/* no-op: not using inbound webhooks/channels */
	},
});
