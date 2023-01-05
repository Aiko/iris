import { Configuration, OpenAIApi } from "openai"
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta"

//! TODO: migrate to Arachne

const configuration = new Configuration({
  apiKey: "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",
})
const openai = new OpenAIApi(configuration);

export default async (directions: string) => {
	const greeting = i18n(RosettaStone.scribe.prompt.greeting)
	const completion = await openai.createCompletion({
		model: "text-davinci-003",
		prompt: `${directions}\nFull Email:\n\n${greeting}`,
	})
	return completion.data.choices[0].text
}
