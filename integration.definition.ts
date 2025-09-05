import { IntegrationDefinition, z } from "@botpress/sdk";

export default new IntegrationDefinition({
	name: "exchange-rate", // stays lowercase/kebab
	version: "0.1.2", // bump when you change the definition
	title: "Exchange Rate",
	description: "Fetch live currency conversion rate",

	configuration: {
		schema: z.object({
			EXCHANGE_RATE_API_KEY: z
				.string()
				.min(1)
				.describe("API key for https://v6.exchangerateapi.com"),
		}),
	},

	actions: {
		getCurrencyRate: {
			title: "Get currency rate",
			description: "Returns 1 baseCurrency = X targetCurrency",
			input: {
				schema: z.object({
					baseCurrency: z.string().length(3).describe("e.g., USD"),
					targetCurrency: z.string().length(3).describe("e.g., EUR"),
				}),
			},
			output: {
				schema: z.object({
					rate: z.number().describe("1 baseCurrency = X targetCurrency"),
				}),
			},
		},
	},

	channels: {}, // no channels for this integration
	events: {}, // no custom events
});
