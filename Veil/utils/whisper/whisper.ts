import type Hark from 'hark'
// @ts-ignore
const harker = window.hark as typeof Hark
import scribe from "@Veil/utils/scribe";
import { ref } from '@vue/reactivity'
import Logger from "@Veil/services/roots"
const Log = new Logger("Scribe Voice", {
	bgColor: "#88ddbb", fgColor: "#000000"
})
import { SETTINGS } from "@Veil/utils/rosetta/rosetta"

export {}

const MODEL_FN = "/Veil/utils/whisper/tiny.bin"
const MAX_LENGTH = 120 // seconds
const SAMPLE_RATE = 16 * 1000 // 16kHz
const LANG = SETTINGS.language.slice(0, 2)

// @ts-ignore
let instance: WebAssembly.Instance | null = null
const model_loader = new FileReader()
model_loader.onload = _ => {
	// @ts-ignore
	try { Module.FS_unlink("whisper.bin") } catch {}
	// @ts-ignore
	Module.FS_createDataFile("/", "whisper.bin", new Uint8Array(model_loader.result as ArrayBuffer), true, true)
	// @ts-ignore
	instance = Module.init("whisper.bin") as WebAssembly.Instance
}
model_loader.readAsArrayBuffer(new Blob([await (await fetch(MODEL_FN)).arrayBuffer()]))

export enum ScribeVoiceState {
	Hidden,
	Idle,
	Recording,
	Transcribing,
	Generating
}
export const scribeVoiceState = ref(ScribeVoiceState.Hidden)

// @ts-ignore
window.alert = (text: string) => Log.info("Got without listener:", text)
const transcribe = (audio: Float32Array, lang=LANG): Promise<string> => new Promise((s, _) => {
	if (!instance) return Log.error("Failed to load WASM instance.")
	// @ts-ignore
	const transcribed = (text: string) => {
		text = text.trim().replace(/Thread [0-9]+: /g, "")
		Log.success("Transcribed:", text)
		s(text)
	}
	// @ts-ignore
	window.alert = transcribed
	// @ts-ignore
	window.Module.transcribe_audio(instance, audio, lang, false, 1)
})

export const listen = (): Promise<string> => new Promise(async (s, _) => {
	scribeVoiceState.value = ScribeVoiceState.Idle
	const context = new AudioContext({
		sampleRate: SAMPLE_RATE,
		// @ts-ignore
		channelCount: 1,
		echoCancellation: false,
		autoGainControl:  true,
		noiseSuppression: true,
	})
	const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
	const hark = harker(stream, { play: false, interval: 100, audioContext: context })
	Log.info("Listening for audio...")

	const chunks: BlobPart[] = []
	const mediaRecorder = new MediaRecorder(stream)

	mediaRecorder.ondataavailable = e => chunks.push(e.data)
	mediaRecorder.onstart = () => setTimeout(mediaRecorder.stop, MAX_LENGTH * 1000)
	mediaRecorder.onstop = () => {
		const ding = new Audio("data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA//uQZAUAB1WI0PZugAAAAAoQwAAAEk3nRd2qAAAAACiDgAAAAAAABCqEEQRLCgwpBGMlJkIz8jKhGvj4k6jzRnqasNKIeoh5gI7BJaC1A1AoNBjJgbyApVS4IDlZgDU5WUAxEKDNmmALHzZp0Fkz1FMTmGFl1FMEyodIavcCAUHDWrKAIA4aa2oCgILEBupZgHvAhEBcZ6joQBxS76AgccrFlczBvKLC0QI2cBoCFvfTDAo7eoOQInqDPBtvrDEZBNYN5xwNwxQRfw8ZQ5wQVLvO8OYU+mHvFLlDh05Mdg7BT6YrRPpCBznMB2r//xKJjyyOh+cImr2/4doscwD6neZjuZR4AgAABYAAAABy1xcdQtxYBYYZdifkUDgzzXaXn98Z0oi9ILU5mBjFANmRwlVJ3/6jYDAmxaiDG3/6xjQQCCKkRb/6kg/wW+kSJ5//rLobkLSiKmqP/0ikJuDaSaSf/6JiLYLEYnW/+kXg1WRVJL/9EmQ1YZIsv/6Qzwy5qk7/+tEU0nkls3/zIUMPKNX/6yZLf+kFgAfgGyLFAUwY//uQZAUABcd5UiNPVXAAAApAAAAAE0VZQKw9ISAAACgAAAAAVQIygIElVrFkBS+Jhi+EAuu+lKAkYUEIsmEAEoMeDmCETMvfSHTGkF5RWH7kz/ESHWPAq/kcCRhqBtMdokPdM7vil7RG98A2sc7zO6ZvTdM7pmOUAZTnJW+NXxqmd41dqJ6mLTXxrPpnV8avaIf5SvL7pndPvPpndJR9Kuu8fePvuiuhorgWjp7Mf/PRjxcFCPDkW31srioCExivv9lcwKEaHsf/7ow2Fl1T/9RkXgEhYElAoCLFtMArxwivDJJ+bR1HTKJdlEoTELCIqgEwVGSQ+hIm0NbK8WXcTEI0UPoa2NbG4y2K00JEWbZavJXkYaqo9CRHS55FcZTjKEk3NKoCYUnSQ0rWxrZbFKbKIhOKPZe1cJKzZSaQrIyULHDZmV5K4xySsDRKWOruanGtjLJXFEmwaIbDLX0hIPBUQPVFVkQkDoUNfSoDgQGKPekoxeGzA4DUvnn4bxzcZrtJyipKfPNy5w+9lnXwgqsiyHNeSVpemw4bWb9psYeq//uQZBoABQt4yMVxYAIAAAkQoAAAHvYpL5m6AAgAACXDAAAAD59jblTirQe9upFsmZbpMudy7Lz1X1DYsxOOSWpfPqNX2WqktK0DMvuGwlbNj44TleLPQ+Gsfb+GOWOKJoIrWb3cIMeeON6lz2umTqMXV8Mj30yWPpjoSa9ujK8SyeJP5y5mOW1D6hvLepeveEAEDo0mgCRClOEgANv3B9a6fikgUSu/DmAMATrGx7nng5p5iimPNZsfQLYB2sDLIkzRKZOHGAaUyDcpFBSLG9MCQALgAIgQs2YunOszLSAyQYPVC2YdGGeHD2dTdJk1pAHGAWDjnkcLKFymS3RQZTInzySoBwMG0QueC3gMsCEYxUqlrcxK6k1LQQcsmyYeQPdC2YfuGPASCBkcVMQQqpVJshui1tkXQJQV0OXGAZMXSOEEBRirXbVRQW7ugq7IM7rPWSZyDlM3IuNEkxzCOJ0ny2ThNkyRai1b6ev//3dzNGzNb//4uAvHT5sURcZCFcuKLhOFs8mLAAEAt4UWAAIABAAAAAB4qbHo0tIjVkUU//uQZAwABfSFz3ZqQAAAAAngwAAAE1HjMp2qAAAAACZDgAAAD5UkTE1UgZEUExqYynN1qZvqIOREEFmBcJQkwdxiFtw0qEOkGYfRDifBui9MQg4QAHAqWtAWHoCxu1Yf4VfWLPIM2mHDFsbQEVGwyqQoQcwnfHeIkNt9YnkiaS1oizycqJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");  
		ding.play();
		Log.log("Recorded audio, transcribing...")
		scribeVoiceState.value = ScribeVoiceState.Transcribing
		const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" })

		//? clear out respective variables
		stream.getTracks().map(track => track.stop())
		hark.stop()
		chunks.splice(0, chunks.length)

		const reader = new FileReader()
		reader.onload = () => {
			const buf = new Uint8Array(reader.result as ArrayBuffer)
			context.decodeAudioData(buf.buffer, audioBuffer => {
				const offlineContext = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate)
				const source = offlineContext.createBufferSource()
				source.buffer = audioBuffer
				source.connect(offlineContext.destination)
				source.start(0)

				offlineContext.startRendering().then(async renderedBuffer => {
					const audio = renderedBuffer.getChannelData(0).slice(0, MAX_LENGTH * SAMPLE_RATE)
					Log.info("Audio recorded, size:", audio.length)
					s(await transcribe(audio))
					scribeVoiceState.value = ScribeVoiceState.Hidden
				})
			})
		}
		reader.readAsArrayBuffer(blob);
	}
	mediaRecorder.start()

	hark.on("speaking", () => scribeVoiceState.value = ScribeVoiceState.Recording)
	hark.on("stopped_speaking", () => mediaRecorder.stop())
})

export const scribeVoice = async () => {
	const prompt = await listen()
	scribeVoiceState.value = ScribeVoiceState.Generating
	const email = await scribe(prompt)
	Log.success("Email:\n", email)
	scribeVoiceState.value = ScribeVoiceState.Hidden
}
