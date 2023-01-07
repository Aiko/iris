import { Configuration, OpenAIApi } from "openai"
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta"

//! TODO: migrate to Arachne

const configuration = new Configuration({
  apiKey: "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",
})
const openai = new OpenAIApi(configuration);

const DEFAULT_PARAMS = {
  "model": "text-davinci-002",
  "temperature": 0.7,
  "max_tokens": 256,
  "top_p": 1,
  "frequency_penalty": 0,
  "presence_penalty": 0
}

const query = async (params = {}) => {
  const params_ = { ...DEFAULT_PARAMS, ...params };
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + String("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")
    },
    body: JSON.stringify(params_)
  };
  const response = await fetch('https://api.openai.com/v1/completions', requestOptions);
  const data = await response.json();
  return data.choices[0].text as string;
}

export default async (directions: string, context: string="", recipient: string="") => {
	const greeting = i18n(RosettaStone.scribe.prompt.greeting)
	const completion = await query({
		model: "text-davinci-003",
		prompt: (context && recipient) ?
			`In reply to:\n${context}\n\nWrite an email to ${recipient}:\n${directions}\n\nFull Email:\n\n${greeting}`
			: `Write an email:\n${directions}\n\nFull Email:\n\n${greeting}`,
	})
	return greeting + completion
	// return completion.data.choices[0].text
}
