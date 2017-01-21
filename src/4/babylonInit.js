// Babylon initialization--including the solid particle system and all
// corresponding per-grid-update logic.
// 'frame' = One .fits data frame as stored in `frames` array. Currently
//           must be a square matrix to render properly.
// 'grid'  = A .fits data frame as rendered via Babylon. Contains particles
//           represent .fits "pixels".

export default function (frames, nFrames) {

  /**************************** Scene ****************************/
  let B = BABYLON
  let canvas = document.getElementById('renderCanvas')
  let engine = new B.Engine(canvas, true)
  let scene = new B.Scene(engine)
  scene.clearColor = new B.Color3(0.0, 0.0, 0.0);

  // Camera
  let camera = new B.ArcRotateCamera("camera1",  0, 0, 0, new B.Vector3(0, 0, -0), scene)
  camera.setPosition(new B.Vector3(0, 10, -50))
  camera.attachControl(canvas, true)

  // Light
  let light = new B.PointLight("light", new B.Vector3(0, 0, 0), scene)
  light.diffuse = new B.Color3(1, 1, 1)
  light.intensity = 0.7


  /**************************** SPS ****************************/
  let SPS = new B.SolidParticleSystem('SPS', scene)

  // Basic parameters
  let size = 30                        // Size of each rendered particle grid
  let updateInterval = 5               // Render loop interval on which to render new grids
  let gridDim = 48                     // Num particles in a grid's row/col
  let gridArea = Math.pow(gridDim, 2)  // NxN size of a fits frame
  let nClones = 25                     // Number of cloned SPSs
  let initY = 25                       // Height of topmost grid

  // Particle model (choose one)
  // let shape = B.MeshBuilder.CreatePolyhedron("tetra", {size: 0.5}, scene)  // Tetrahedron
  let shape = B.MeshBuilder.CreateDisc("t", {tessellation: 3, size: 2}, scene)   // Triangle
  // let shape = B.MeshBuilder.CreateBox("box", { size: 1 }, scene)  // Cube

  SPS.addShape(shape, gridArea)
  let mesh = SPS.buildMesh()
  mesh.hasVertexAlpha = true  // Enable alpha channel for all particles
  shape.dispose() // Free for GC

  // Set initial properties for all particles. Babylon calls this once.
  // We arrange all particles in a gridDim x gridDim x nGrids rect prism.
  // The order in which we arrange them must match the order in which we
  // update them in updateParticle, so we can accurately "display" the
  // .fits frame image.
  SPS.initParticles = () => {
    let i = 0
    for (let x = 0; x < gridDim; x++) {    // Width
      for (let z = 0; z < gridDim; z++) {  // Depth
        SPS.particles[i].position.x = ((x / gridDim) - 0.5) * size
        SPS.particles[i].position.y = initY
        SPS.particles[i].position.z = ((z / gridDim) - 0.5) * size
        SPS.particles[i].rotation.x = Math.random() * 3.15
        SPS.particles[i].rotation.y = Math.random() * 3.15
        SPS.particles[i].rotation.z = Math.random() * 1.5
        i++
      }
    }
  }

  // Get the next .fits frame to render. Babylon calls this once on every
  // iteration of the render loop before updating all particles.
  // If we run out of .fits data frames, we start over with the first one.
  let frameIdx = 0        // Index of next fits frame to render
  let currFrame = {}      // Placeholder for current fits frame
  let elapsedRenders = 0  // Babylon frames (i.e. literal animation frames) rendered counter.
  let shade = 0           // Shade for new particles
  let i = 0               // Index for iterating over .fits frames
  SPS.beforeUpdateParticles = () => {
    elapsedRenders++
    if (elapsedRenders == updateInterval) {
      // Get next .fits frame
      // console.log('FRAME: ', frameIdx)
      currFrame = frames[frameIdx]
      frameIdx = (frameIdx + 1) % nFrames

      for (i = 0; i < gridArea; i++) {
        // Normalize to [0, 1]
        shade = (currFrame.frame[i] - currFrame.extent[0]) /
                (currFrame.extent[1] - currFrame.extent[0])

        SPS.particles[i].color.r = shade
        SPS.particles[i].color.g = shade
        SPS.particles[i].color.b = shade
        SPS.particles[i].color.a = shade - 0.1
        SPS.particles[i].fitsVal = shade
      }
      elapsedRenders = 0
    }
  }

  // Update all particle positions. Babylon calls this for every particle
  // on every iteration of the render loop--thus it should be as simple
  // and tight as possible. This is where we implement any per-particle
  // physics.
  SPS.updateParticle = function (p) {
    p.rotation.x += 0.01
    p.rotation.z += 0.01
  }

  for (let i = 1; i < nClones; i++) {
    let clone = mesh.createInstance('clone_' + i)
    clone.position.y -= (i / nClones) * 30
    clone.hasVertexAlpha = true
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
