import babylonInit from './babylonInit'  // Creates window.astro
import audioInit from '../../lib/audio'  // Creates window.astro

export default function (fileObj) {
  let nFrames = 100 // Number of .fits data frames to load
  let frames = []  // Container for loaded .fits data frames
  let nLoaded = 0  // Number of .fits data frames loaded so far
  let extent       // [min, max] of values in a frame

  // Initialize a new FITS File object
  let fits = new astro.FITS(fileObj, function() {
    let dataUnit = this.getDataUnit()
    dataUnit.getFrames(0, nFrames, function (frame, opts) {
      nLoaded++
      console.log('got frame')
      frames.push({
        extent: dataUnit.getExtent(frame),
        frame: frame
      })
      if (nLoaded == nFrames) {
        audioInit({}, () => babylonInit(frames, nFrames))
      }
    })
  })
}
