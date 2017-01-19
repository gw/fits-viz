// Babylon initialization--including the solid particle system and all
// corresponding per-frame-update logic.

export default function (fitsFrames, nFrames) {
  // Initialize basic scene elements
  let B = BABYLON
  let canvas = document.getElementById('renderCanvas')
  let engine = new B.Engine(canvas, true)
  let scene = new BABYLON.Scene(engine)

  // Set up the camera
  let camera = new BABYLON.ArcRotateCamera("camera1",  0, 0, 0, new BABYLON.Vector3(0, 0, -0), scene)
  camera.setPosition(new BABYLON.Vector3(0, 10, -50))
  camera.attachControl(canvas, true)

  // Set up lighting
  let pl = new BABYLON.PointLight("pl", new BABYLON.Vector3(0, 0, 0), scene)
  pl.diffuse = new BABYLON.Color3(1, 1, 1)
  pl.intensity = 1.0

  // Basic parameters
  let fact = 50 			// cube size
  let updateInterval = 50  // Frame interval to add spawn new particles
  let fitsFrameSide = 48
  let fitsFrameArea = Math.pow(fitsFrameSide, 2)  // NxN size of a fits frame
  let nParticles = fitsFrameArea * 20 // Total number of particles
  let initY = 20  // Initial height of particl

  // Set up the particle model
  // let shape = BABYLON.MeshBuilder.CreatePolyhedron("tetra", {size: 0.5}, scene)  // Tetrahedron
  // let shape = BABYLON.MeshBuilder.CreateDisc("t", {tessellation: 3}, scene)   // Triangle
  let shape = BABYLON.MeshBuilder.CreateBox("box", { size: 0.7 }, scene)  // Cube

  // Create and configure the solid particle system
  let SPS = new BABYLON.SolidParticleSystem('SPS', scene)
  SPS.addShape(shape, nParticles)
  let mesh = SPS.buildMesh()
  mesh.hasVertexAlpha = true  // Enable alpha channel for all particles
  shape.dispose()

  // Set initial properties for all particles. Babylon calls this once.
  // We arrange all particles in F NxN grids, where F is a multiple of N.
  // The order in which we arrange them must match the order in which we
  // update them in updateParticle, so we can accurately "display" the
  // FITS data.
  SPS.initParticles = function () {
    let i = 0
    while (i < nParticles) {
      for (let row = 0; row < fitsFrameSide; row++) {
        for (let col = 0; col < fitsFrameSide; col++) {
          SPS.particles[i].isVisible = false
          SPS.particles[i].position.x = ((row / fitsFrameSide) - 0.5) * fact
          SPS.particles[i].position.z = ((col / fitsFrameSide) - 0.5) * fact
          SPS.particles[i].position.y = initY
          SPS.particles[i].rotation.x = 90
          SPS.particles[i].rotation.x = Math.random() * 3.15
          SPS.particles[i].rotation.y = Math.random() * 3.15
          SPS.particles[i].rotation.z = Math.random() * 1.5
          i++
        }
      }
    }
  }

  // Reset a particle's position to its original height.
  SPS.recycleParticle = function (particle) {
    particle.isVisible = false
    particle.position.y = initY
  }

  // "Render" a new set of particles. Babylon calls this once on every
  // iteration of the render loop before updating all particles.
  // Reads from the passed-in .fits data on a specified graphics
  // frame interval, grabs some unused particles (recycling them if
  // they're currently active) and sets them in motion, simultaneously
  // imbuing them with their corresponding pixel value from the .fits
  // data.
  // If we run out of .fits data frames, we start over with the first one.
  let fitsFrameIdx = 0  // Index of next fits frame to render
  let currFitsFrame = []  // Placeholder for current fits frame
  SPS.vars.elapsedFrames = 0  // Babylon frames rendered counter
  SPS.vars.nextParticle = 0  // Index of first particle in next available frame-sized group
  SPS.vars.shade = 0        // Shade for new particles
  SPS.beforeUpdateParticles = function () {
    SPS.vars.elapsedFrames++
    if (SPS.vars.elapsedFrames == updateInterval) {
      // Get next un-rendered fits frame
      console.log('at frame: ', fitsFrameIdx)
      currFitsFrame = fitsFrames[fitsFrameIdx]
      fitsFrameIdx = (fitsFrameIdx + 1) % nFrames

      currFitsFrame.frame.forEach(function (val, i) {
        if (SPS.particles[SPS.vars.nextParticle + i].isVisible == true) {
          console.log('PRE-EMPTIVE RECYCLE')
          SPS.recycleParticle(SPS.particles[SPS.vars.nextParticle + i])
        }
        // Normalize to [0, 1]
        SPS.vars.shade = (val - currFitsFrame.extent[0]) /
                         (currFitsFrame.extent[1] - currFitsFrame.extent[0])

        SPS.particles[SPS.vars.nextParticle + i].isVisible = true
        SPS.particles[SPS.vars.nextParticle + i].color.r = SPS.vars.shade
        SPS.particles[SPS.vars.nextParticle + i].color.g = SPS.vars.shade
        SPS.particles[SPS.vars.nextParticle + i].color.b = SPS.vars.shade
        SPS.particles[SPS.vars.nextParticle + i].color.a = 0
        SPS.particles[SPS.vars.nextParticle + i].fitsVal = SPS.vars.shade
      })

      SPS.vars.nextParticle += fitsFrameArea
      SPS.vars.elapsedFrames = 0
      if (SPS.vars.nextParticle == nParticles) {
        console.log('reset')
        SPS.vars.nextParticle = 0
      }
    }
  }

  // Update all particle positions. Babylon calls this for every particle
  // on every iteration of the render loop--thus it should be as simple
  // and tight as possible. This is where we implement any per-particle
  // physics.
  SPS.updateParticle = function (p) {
    if (p.position.y < -25) {
      this.recycleParticle(p)
    } else if (p.isVisible) {
      p.position.y -= 0.3   // Downward motion
      p.rotation.x += 0.01  // Rotate slightly
      p.rotation.z += 0.01
      if (p.position.y < -20) {
        p.color.a -= 0.05  // Fade out
      } else if (p.color.a < p.fitsVal) {
        p.color.a += 0.05  // Fade in
      }
    }
  }

  SPS.initParticles()
  SPS.setParticles()

  // Our particles aren't changing textures after init.
  SPS.computeParticleTexture = false

  // Animation
  scene.registerBeforeRender(function() {
    pl.position = camera.position
    SPS.setParticles()
  })

  // Show FPS, diagnostics.
  scene.debugLayer.show()

  engine.runRenderLoop(function () {
    scene.render()
  })
}
