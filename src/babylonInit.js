// Babylon initialization--including the solid particle system and all
// corresponding per-grid-update logic.
// 'frame' = One .fits data frame. Currently must be a square matrix.
// 'grid'  = A .fits data frame as rendered via Babylon.

export default function (frames, nFrames) {

  /**************************** Scene ****************************/
  let B = BABYLON
  let canvas = document.getElementById('renderCanvas')
  let engine = new B.Engine(canvas, true)
  let scene = new B.Scene(engine)

  // Camera
  let camera = new B.ArcRotateCamera("camera1",  0, 0, 0, new B.Vector3(0, 0, -0), scene)
  camera.setPosition(new B.Vector3(0, 10, -50))
  camera.attachControl(canvas, true)

  // Light
  let light = new B.PointLight("light", new B.Vector3(0, 0, 0), scene)
  light.diffuse = new B.Color3(1, 1, 1)
  light.intensity = 1.0


  /**************************** SPS ****************************/
  let SPS = new B.SolidParticleSystem('SPS', scene)

  // Basic parameters
  let size = 50                                      // Size of each rendered particle grid
  SPS.vars.updateInterval = 25                       // Render loop interval on which to render new grids
  SPS.vars.gridDim = 48                              // Num particles in a grid's row/col
  SPS.vars.gridArea = Math.pow(SPS.vars.gridDim, 2)  // NxN size of a fits frame
  SPS.vars.nParticles = SPS.vars.gridArea * 20       // Total number of particles in system
  SPS.vars.initY = 25                                // Initial height of new grids

  // Particle model (choose one)
  // let shape = B.MeshBuilder.CreatePolyhedron("tetra", {size: 0.5}, scene)  // Tetrahedron
  // let shape = B.MeshBuilder.CreateDisc("t", {tessellation: 3}, scene)   // Triangle
  let shape = B.MeshBuilder.CreateBox("box", { size: 0.7 }, scene)  // Cube

  SPS.addShape(shape, SPS.vars.nParticles)
  let mesh = SPS.buildMesh()
  mesh.hasVertexAlpha = true  // Enable alpha channel for all particles
  shape.dispose() // Free for GC

  // Set initial properties for all particles. Babylon calls this once.
  // We arrange all particles in F NxN grids, where F is a multiple of N.
  // The order in which we arrange them must match the order in which we
  // update them in updateParticle, so we can accurately "display" the
  // .fits frame image.
  SPS.initParticles = () => {
    let i = 0
    while (i < SPS.vars.nParticles) {
      for (let row = 0; row < SPS.vars.gridDim; row++) {
        for (let col = 0; col < SPS.vars.gridDim; col++) {
          SPS.particles[i].isVisible = false
          SPS.particles[i].position.x = ((row / SPS.vars.gridDim) - 0.5) * size
          SPS.particles[i].position.z = ((col / SPS.vars.gridDim) - 0.5) * size
          SPS.particles[i].position.y = SPS.vars.initY
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
  SPS.recycleParticle = (p) => {
    p.isVisible = false
    p.position.y = SPS.vars.initY
  }

  // "Render" a new set of particles. Babylon calls this once on every
  // iteration of the render loop before updating all particles.
  // Reads from the passed-in .fits data on a specified graphics
  // frame interval, grabs some unused particles (recycling them if
  // they're currently active) and sets them in motion, simultaneously
  // imbuing them with their corresponding pixel value from the .fits
  // data.
  // If we run out of .fits data frames, we start over with the first one.
  SPS.vars.frameIdx = 0        // Index of next fits frame to render
  SPS.vars.currFrame = []      // Placeholder for current fits frame
  SPS.vars.elapsedRenders = 0  // Babylon frames (i.e. literal animation frames) rendered counter.
  SPS.vars.nextParticle = 0    // Index of first particle in next available particle grid
  SPS.vars.shade = 0           // Shade for new particles
  SPS.beforeUpdateParticles = () => {
    SPS.vars.elapsedRenders++
    if (SPS.vars.elapsedRenders == SPS.vars.updateInterval) {
      // Get next un-rendered fits frame
      console.log('at frame: ', SPS.vars.frameIdx)
      SPS.vars.currFrame = frames[SPS.vars.frameIdx]
      SPS.vars.frameIdx = (SPS.vars.frameIdx + 1) % nFrames

      SPS.vars.currFrame.frame.forEach((val, i) => {
        if (SPS.particles[SPS.vars.nextParticle + i].isVisible == true) {
          console.log('PRE-EMPTIVE RECYCLE')
          SPS.recycleParticle(SPS.particles[SPS.vars.nextParticle + i])
        }
        // Normalize to [0, 1]
        SPS.vars.shade = (val - SPS.vars.currFrame.extent[0]) /
                         (SPS.vars.currFrame.extent[1] - SPS.vars.currFrame.extent[0])

        SPS.particles[SPS.vars.nextParticle + i].isVisible = true
        SPS.particles[SPS.vars.nextParticle + i].color.r = SPS.vars.shade
        SPS.particles[SPS.vars.nextParticle + i].color.g = SPS.vars.shade
        SPS.particles[SPS.vars.nextParticle + i].color.b = SPS.vars.shade
        SPS.particles[SPS.vars.nextParticle + i].color.a = 0
        SPS.particles[SPS.vars.nextParticle + i].fitsVal = SPS.vars.shade
      })

      SPS.vars.nextParticle += SPS.vars.gridArea
      SPS.vars.elapsedRenders = 0
      if (SPS.vars.nextParticle == SPS.vars.nParticles) {
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
      // p.position.y -= 0.4 * p.fitsVal // Crazy slurping
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
  scene.registerBeforeRender(() => {
    light.position = camera.position
    SPS.setParticles()
  })

  // Show FPS, diagnostics.
  scene.debugLayer.show()

  engine.runRenderLoop(() => scene.render())
}
