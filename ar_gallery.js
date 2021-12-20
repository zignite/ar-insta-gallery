/**
 * @license
 * Copyright (C) Zignite Labs LLC - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium, is strictly prohibited
 *
 * Proprietary and confidential
 * Author: Sunil D Shashidhara, sunil@zignite.io, Dec 2021
 */

let images = [];
const numShow = 10;
let curImgIdx = 0;
let addedObjs = [];

const scene = new THREE.Scene();

function convertToBase64(imgURL, width, height) {
  return new Promise((resolve, reject) => {
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext("2d");
    $("<img/>").attr("src", imgURL).attr("crossorigin", "anonymous").load(function() {
      context.scale(width/this.width,  height/this.height);
      context.drawImage(this, 0, 0);
      return resolve(canvas.toDataURL());
    });
  })
}

async function addImages() {
  images.slice(curImgIdx, curImgIdx+numShow).forEach((image, i) => {
    curImgIdx += 1;

    let b64image = new Image();
    b64image.src = image;
    let texture = new THREE.Texture();
    texture.image = b64image;
    b64image.onload = function () {
        texture.needsUpdate = true;
    };
    texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;

    const materials = [
      new THREE.MeshBasicMaterial({color: 0xffffff}),
      new THREE.MeshBasicMaterial({color: 0xffffff}),
      new THREE.MeshBasicMaterial({color: 0xffffff}), // top
      new THREE.MeshBasicMaterial({color: 0xffffff}),  // bottom
      new THREE.MeshBasicMaterial({map: texture}),  // front - definitely needed
      new THREE.MeshBasicMaterial({map: texture})  // back
    ];

    // Create the cube and add it to the demo scene.
    const imgCube = new THREE.Mesh(new THREE.BoxBufferGeometry(0.5, 0.5, 0.01), materials);
    var x = 0 + 1.5 * Math.cos(2 * Math.PI * i / numShow); 
    var z = 0 + 1.5 * Math.sin(2 * Math.PI * i / numShow);
    imgCube.position.set(x, 0, z);
    imgCube.lookAt(0, 0, 0)
    scene.add(imgCube);
    addedObjs.push(imgCube);
  });
}

async function activateXR() {
  // Add a canvas element and initialize a WebGL context that is compatible with WebXR.
  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  const gl = canvas.getContext("webgl", {xrCompatible: true});

  // Set up the WebGLRenderer, which handles rendering to the session's base layer.
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    preserveDrawingBuffer: true,
    canvas: canvas,
    context: gl
  });
  renderer.autoClear = false;

  // The API directly updates the camera matrices.
  // Disable matrix auto updates so three.js doesn't attempt
  // to handle the matrices independently.
  const camera = new THREE.PerspectiveCamera();
  camera.matrixAutoUpdate = false;

  // Initialize a WebXR session using "immersive-ar".
  const session = await navigator.xr.requestSession("immersive-ar", {requiredFeatures: ['hit-test']});
  session.updateRenderState({
    baseLayer: new XRWebGLLayer(session, gl)
  });

  // A 'local' reference space has a native origin that is located
  // near the viewer's position at the time the session was created.
  const referenceSpace = await session.requestReferenceSpace('local');

  session.addEventListener("select", (event) => {
      addedObjs.forEach((object, i) => {
        scene.remove(object);
      });
      addImages();
  });

  // add first set of images
  addImages();

  // Create a render loop that allows us to draw on the AR view.
  const onXRFrame = (time, frame) => {
    // Queue up the next draw request.
    session.requestAnimationFrame(onXRFrame);

    // Bind the graphics framebuffer to the baseLayer's framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer)

    // Retrieve the pose of the device.
    // XRFrame.getViewerPose can return null while the session attempts to establish tracking.
    const pose = frame.getViewerPose(referenceSpace);
    if (pose) {
      // In mobile AR, we only have one view.
      const view = pose.views[0];

      const viewport = session.renderState.baseLayer.getViewport(view);
      renderer.setSize(viewport.width, viewport.height);

      // Use the view's transform matrix and projection matrix to configure the THREE.camera.
      camera.matrix.fromArray(view.transform.matrix)
      camera.projectionMatrix.fromArray(view.projectionMatrix);
      camera.updateMatrixWorld(true);

      // Render the scene with THREE.WebGLRenderer.
      renderer.render(scene, camera);
    }
  }
  session.requestAnimationFrame(onXRFrame);
}
