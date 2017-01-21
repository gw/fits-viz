// App entry point

import '../../lib/fits'  // Creates window.astro
import fitsInit from './fitsInit'

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById('fitsFile').addEventListener('change', function () {
    fitsInit(this.files[0])
  }, false)
})
