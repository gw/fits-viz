// Stateful set of functions for analysing microphone data
// via the Web Audio API.

let ctx = new AudioContext()
let analyser
let soundData  // Buffer for sampled audio data
let sum        // Buffer for sum of sampled audio frequencies

export default function initMic (opts, callback) {
  // Get user permission to use their mic
  navigator.mediaDevices.getUserMedia({audio: true, video: false})
    .then((stream) => {
      let mic = ctx.createMediaStreamSource(stream)

      // Create the analyser
      analyser = ctx.createAnalyser()
      analyser.fftSize = opts.fftSize || 32
      analyser.smoothingTimeConstant = opts.smoothingTimeConstant || 0.6

      mic.connect(analyser)

      soundData = new Uint8Array(analyser.fftSize)

      callback()
    })
}

// Get a scaled value for the current mic input volume.
// Scaled based on the values of analyser.minDecibels and .maxDecibels.
export function avgVol () {
  analyser.getByteFrequencyData(soundData)
  sum = soundData.reduce(add)
  return sum / soundData.length
}

function add (a, b) { return a + b }
