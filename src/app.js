// App entry point

import '../lib/fits'  // Creates window.astro
import fitsInit from './fitsInit'

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById('fitsFile').addEventListener('change', function (e) {
    let file = e.currentTarget.files[0]
    fitsInit(file)
  })
})
