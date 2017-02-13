// App entry point

import '../../lib/fits'  // Creates window.astro
import config from '../config'
import fitsInit from './fitsInit'

document.addEventListener("DOMContentLoaded", function () {
  fitsInit(config.fitsFilename)
})
