// App entry point

import '../lib/fits'  // Creates window.astro
import init from './babylonInit'  // Creates window.astro

document.addEventListener("DOMContentLoaded", function(event) {
  let filePath = 'aored_When_2016.2.29_22.9.29_poldm_phase.fits';
  let nFrames = 50; // Number of .fits data frames to load
  let frames = [];  // Container for loaded .fits data frames
  let nLoaded = 0;  // Number of .fits data frames loaded so far
  let extent;       // [min, max] of an array

  // Initialize a new FITS File object
  let fits = new astro.FITS(filePath, function() {
    let du = this.getDataUnit();
    du.getFrames(0, nFrames, function (frame, opts) {
      nLoaded++;
      console.log('got frame');
      frames.push({
        extent: du.getExtent(frame),
        frame: frame
      });
      if (nLoaded == nFrames) {
        init(frames, nFrames);
      }
    });
  });
})
