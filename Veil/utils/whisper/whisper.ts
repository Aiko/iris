import type Hark from 'hark'
// @ts-ignore
const harker = window.hark as typeof Hark
import Logger from "@Veil/services/roots"
const Log = new Logger("Whisper", {
	bgColor: "#88ddbb", fgColor: "#000000"
})

export {}

const MODEL_FN = "/Veil/utils/whisper/tiny.bin"
const MAX_LENGTH = 120 // seconds
const SAMPLE_RATE = 16 * 1000 // 16kHz
const LANG = "en"

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

const transcribe = (audio: Float32Array, lang=LANG) => {
	if (!instance) return Log.error("Failed to load WASM instance.")
	// @ts-ignore
	const ret = Module.full_default(instance, audio, lang, false) as string
	Log.success("Transcribed:", ret)
	return ret
}

export const listen = () => new Promise(async (s, _) => {
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
		Log.log("Recorded audio, transcribing...")
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

				offlineContext.startRendering().then(renderedBuffer => {
					const audio = renderedBuffer.getChannelData(0).slice(0, MAX_LENGTH * SAMPLE_RATE)
					Log.info("Audio recorded, size:", audio.length)
					s(transcribe(audio))
				})
			})
		}
		reader.readAsArrayBuffer(blob);
	}
	mediaRecorder.start()

	hark.on("stopped_speaking", () => mediaRecorder.stop())
})
