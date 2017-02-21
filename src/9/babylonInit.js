// Fork of experiment 8
// Babylon initialization--including the solid particle system and all
// corresponding per-grid-update logic.
// 'frame' = One .fits data frame as stored in `frames` array. Currently
//           must be a square matrix to render properly.
// 'grid'  = A .fits data frame as rendered via Babylon. Contains particles
//           represent .fits "pixels".

import BABYLON from '../../lib/babylon_2-6'
import { avgVol } from '../../lib/audio'

export default function (frames, nFrames) {

  /**************************** Scene ****************************/
  let B = BABYLON
  let canvas = document.getElementById('renderCanvas')
  let engine = new B.Engine(canvas, true)
  let scene = new B.Scene(engine)
  scene.clearColor = new BABYLON.Color3(0.0, 0.0, 0.0);

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
  let size = 38                        // Size of each rendered particle grid
  let updateInterval = 27              // Render loop interval on which to render new grids
  let gridDim = 48                     // Num particles in a grid's row/col
  let gridArea = Math.pow(gridDim, 2)  // NxN size of a fits frame
  let nParticles = gridArea * 20       // Total number of particles in system
  let initY = 20                       // Initial height of new grids
  let finalY = -25                     // Height at which grides fade out
  let rangeY = initY - finalY          // Y range of visible particles

  // Particle model (choose one)
  // let shape = B.MeshBuilder.CreatePolyhedron("tetra", {size: 0.5}, scene)  // Tetrahedron
  let shape = B.MeshBuilder.CreateDisc("t", {tessellation: 3, size: 5}, scene)   // Triangle
  // let shape = B.MeshBuilder.CreateBox("box", { size: 0.7 }, scene)  // Cube

  SPS.addShape(shape, nParticles)
  let mesh = SPS.buildMesh()
  shape.dispose() // Free for GC

  // Configure particle mesh
  mesh.hasVertexAlpha = true  // Enable alpha channel for all particles
  // Set up webcam texture
  let myVideo
  let isAssigned = false
  let videoMaterial = new B.StandardMaterial("texture1", scene)
  videoMaterial.emissiveColor = new B.Color3(1,1,1)
  videoMaterial.wireframe = true

  B.VideoTexture.CreateFromWebCam(scene, function (videoTexture) {
    myVideo = videoTexture
    videoMaterial.diffuseTexture = myVideo
  }, { maxWidth: 256, maxHeight: 256 });

  scene.onBeforeRenderObservable.add(function () {
    if (myVideo !== undefined && isAssigned == false) {
      if (myVideo.video.readyState == 4) {
        mesh.material = videoMaterial;
        isAssigned = true;
      }
    }
  });


  // Set initial properties for all particles. Babylon calls this once.
  // We arrange all particles in F NxN grids, where F is a multiple of N.
  // The order in which we arrange them must match the order in which we
  // update them in updateParticle, so we can accurately "display" the
  // .fits frame image.
  SPS.initParticles = () => {
    let i = 0
    while (i < nParticles) {
      for (let row = 0; row < gridDim; row++) {
        for (let col = 0; col < gridDim; col++) {
          SPS.particles[i].isVisible = false
          // Position
          SPS.particles[i].position.x = ((row / gridDim) - 0.5) * size
          SPS.particles[i].position.z = ((col / gridDim) - 0.5) * size
          SPS.particles[i].position.y = initY
          // Rotation
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
    p.position.y = initY
  }

  // "Render" a new set of particles. Babylon calls this once on every
  // iteration of the render loop before updating all particles.
  // Reads from the passed-in .fits data on a specified graphics
  // frame interval, grabs some unused particles (recycling them if
  // they're currently active) and sets them in motion, simultaneously
  // imbuing them with their corresponding pixel value from the .fits
  // data.
  // If we run out of .fits data frames, we start over with the first one.
  let frameIdx = 0        // Index of next fits frame to render
  let currFrame = {}      // Placeholder for current fits frame
  let elapsedRenders = 0  // Babylon frames (i.e. literal animation frames) rendered counter.
  let nextParticle = 0    // Index of first particle in next available particle grid
  let shade = 0           // Shade for new particles
  let i = 0               // Index for iterating over .fits frames
  let vol = 0             // Placeholder for mic volume
  SPS.beforeUpdateParticles = () => {
    // Sample audio
    vol = avgVol() / 70

    elapsedRenders++
    if (elapsedRenders == updateInterval) {
      // Get next un-rendered .fits frame
      currFrame = frames[frameIdx]
      frameIdx = (frameIdx + 1) % nFrames


      for (i = 0; i < gridArea; i++) {
        if (SPS.particles[nextParticle + i].isVisible == true) {
          console.log('PRE-EMPTIVE RECYCLE')
          SPS.recycleParticle(SPS.particles[nextParticle + i])
        }
        // Normalize to [0, 1]
        shade = (currFrame.frame[i] - currFrame.extent[0]) /
                (currFrame.extent[1] - currFrame.extent[0])

        SPS.particles[nextParticle + i].isVisible = true
        SPS.particles[nextParticle + i].color.a = 0
        SPS.particles[nextParticle + i].fitsVal = shade
      }

      nextParticle += gridArea
      elapsedRenders = 0
      if (nextParticle == nParticles) {
        console.log('RE-USE FIRST GRID')
        nextParticle = 0
      }
    }
  }

  // Update all particle positions. Babylon calls this for every particle
  // on every iteration of the render loop--thus it should be as simple
  // and tight as possible. This is where we implement any per-particle
  // logic.
  // Manipulating particle.uvs lets you choose which part of a larger texture
  // (in this case, a videotexture that holds the webcam feed) to display
  // on the particle. See: http://doc.babylonjs.com/overviews/solid_particle_system#uvs
  // Projecting a video stream onto a cloud of particles may be more
  // appropriately handled with a custom shader but I don't know enough
  // about that stuff yet.
  let uvX;  // Corresponds to particle.uvs.x. Scaled according to particle's position.
  let uvY;  // Corresponds to particle.uvs.y. Scaled according to particle's position.
  let xStep = 1 / 48
  SPS.updateParticle = function (p) {
    if (p.position.y < finalY) {
      this.recycleParticle(p)
    } else if (p.isVisible) {
      // Downward motion
      p.position.y -= 0.1 + (0.08 * p.fitsVal)

      // Audio-reactive rotation
      p.rotation.x += 0.01 + (0.1 * vol)
      p.rotation.y += 0.01 + (0.1 * vol)
      p.rotation.z += 0.01 + (0.1 * vol)

      // Videotexture projection
      // Subtracting the normalized values from 1 shouldn't
      // be necessary--the texture is somehow inverted, and
      // I haven't yet figured out how to correct it directly
      // on the texture. For now, this hack seems to work.
      // See: https://www.babylonjs-playground.com/#2FPT1A#132
      uvX = 1 - ((p.position.x - (-0.5 * size)) / (size))
      uvY = 1 - ((p.position.y - finalY) / rangeY)
      p.uvs.x = uvX
      p.uvs.y = uvY
      // These `step` values are pretty arbitrary;
      // they just change the 'crop frame' size.
      p.uvs.z = uvX + xStep
      p.uvs.w = uvY + 0.1

      if (p.position.y < -20) {
        p.color.a -= 0.05  // Fade out
      } else if (p.color.a < p.fitsVal) {
        p.color.a += 0.05  // Fade in
      }
    }
  }

  SPS.initParticles()
  SPS.setParticles()

  // Animation
  scene.registerBeforeRender(() => {
    light.position = camera.position
    SPS.setParticles()
  })

  // Show FPS, diagnostics.
  // scene.debugLayer.show()

  engine.runRenderLoop(() => scene.render())
}
