// ----------------------
// Configurable (existing) variables
// ----------------------
let BG_COLOR = 0;                 
let CONFIDENCE_THRESHOLD = 0.09;  
let LINE_COLOR = '#00ff00';       
let LINE_THICKNESS = 1.9;         
let DOT_COLOR = '#00ff00';        
let DOT_SIZE = 25;                
let TEXT_COLOR = '#F5F5F5';       
let TEXT_SIZE_PX = 19;            
let COORD_SCALE = 0.25;           
let LABEL_GAP = 7;                
// ----------------------

// toggle for showing/hiding skeleton lines
let showLines = true;

// toggle for showing/hiding the webcam video (black by default)
let showVideo = false;

// NEW: toggle grid visibility
let showGrid = false;

// Reference width/height for scaling
const REF_WIDTH = 1920;
const REF_HEIGHT = 1080;
let uiScale = 1;

let video;
let bodyPose;
let poses = [];
let connections;

// Video intrinsic size
let vidW = 640;
let vidH = 480;


// ----------------------------------
// Draw Grid (mirrored inside video transform)
// ----------------------------------
function drawGrid() {
  stroke(100);
  strokeWeight(1 * uiScale);
  noFill();

  const spacing = 100 * uiScale;

  for (let x = 0; x < width; x += spacing) {
    line(x, 0, x, height);
  }
  for (let y = 0; y < height; y += spacing) {
    line(0, y, width, y);
  }
}


function preload() {
  bodyPose = ml5.bodyPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  video = createCapture(VIDEO, () => {
    if (video && video.elt) {
      vidW = video.elt.videoWidth || vidW;
      vidH = video.elt.videoHeight || vidH;
    }
  });
  video.hide();

  bodyPose.detectStart(video, gotPoses);
  connections = bodyPose.getSkeleton();
}


function draw() {
  uiScale = Math.min(windowWidth / REF_WIDTH, windowHeight / REF_HEIGHT);

  background(BG_COLOR);

  if (video && video.elt && video.elt.videoWidth && video.elt.videoHeight) {
    vidW = video.elt.videoWidth;
    vidH = video.elt.videoHeight;
  }

  // Compute cover-fit rect
  const canvasAR = width / height;
  const videoAR = vidW / vidH || 1;

  let drawW, drawH, offsetX, offsetY;
  if (videoAR > canvasAR) {
    drawH = height;
    drawW = height * videoAR;
  } else {
    drawW = width;
    drawH = width / videoAR;
  }
  offsetX = (width - drawW) / 2;
  offsetY = (height - drawH) / 2;

  const sx = drawW / vidW;
  const sy = drawH / vidH;

  // MIRRORED DRAW CONTEXT
  push();
  translate(width, 0);
  scale(-1, 1);

  // webcam or black
  if (showVideo) {
    image(video, offsetX, offsetY, drawW, drawH);
  } else {
    fill(0);
    noStroke();
    rect(0, 0, width, height);
  }

  // ---- draw grid if enabled ----
  if (showGrid) {
    drawGrid();
  }

  // ---- draw lines ----
  if (showLines) {
    for (let i = 0; i < poses.length; i++) {
      let pose = poses[i];
      for (let j = 0; j < connections.length; j++) {
        let aIdx = connections[j][0];
        let bIdx = connections[j][1];
        let A = pose.keypoints[aIdx];
        let B = pose.keypoints[bIdx];

        let rawAx = A.x ?? A.position?.x;
        let rawAy = A.y ?? A.position?.y;
        let rawBx = B.x ?? B.position?.x;
        let rawBy = B.y ?? B.position?.y;
        let aConf = A.confidence ?? A.score ?? 0;
        let bConf = B.confidence ?? B.score ?? 0;

        if (aConf > CONFIDENCE_THRESHOLD && bConf > CONFIDENCE_THRESHOLD) {
          let ax = offsetX + rawAx * sx;
          let ay = offsetY + rawAy * sy;
          let bx = offsetX + rawBx * sx;
          let by = offsetY + rawBy * sy;

          stroke(LINE_COLOR);
          strokeWeight(LINE_THICKNESS * uiScale);
          line(ax, ay, bx, by);
        }
      }
    }
  }

  // ---- draw dots ----
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < pose.keypoints.length; j++) {
      let k = pose.keypoints[j];

      let rawX = k.x ?? k.position?.x;
      let rawY = k.y ?? k.position?.y;
      let kConf = k.confidence ?? k.score ?? 0;

      if (kConf > CONFIDENCE_THRESHOLD) {
        let kx = offsetX + rawX * sx;
        let ky = offsetY + rawY * sy;

        fill(DOT_COLOR);
        noStroke();
        circle(kx, ky, DOT_SIZE * uiScale);
      }
    }
  }

  pop(); // restore upright orientation


  // ----------------------------
  // coordinate label drawing
  // ----------------------------
  fill(TEXT_COLOR);
  textSize(TEXT_SIZE_PX * uiScale);
  textAlign(LEFT, CENTER);

  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < pose.keypoints.length; j++) {
      let k = pose.keypoints[j];

      let rawX = k.x ?? k.position?.x;
      let rawY = k.y ?? k.position?.y;
      let kConf = k.confidence ?? k.score ?? 0;

      if (kConf > CONFIDENCE_THRESHOLD) {
        let mappedX = offsetX + rawX * sx;
        let mappedY = offsetY + rawY * sy;

        let screenX = width - mappedX;
        let screenY = mappedY;

        let labelX = screenX + (DOT_SIZE * 0.6 + LABEL_GAP) * uiScale;
        let labelY = screenY;

        let scaledX = Math.round(screenX * COORD_SCALE);
        let scaledY = Math.round(screenY * COORD_SCALE);

        let labelText = `${scaledX}, ${scaledY}`;
        let textW = textWidth(labelText);
        let textH = TEXT_SIZE_PX * uiScale;

        let padX = 6 * uiScale;
        let padY = 4 * uiScale;

        noFill();
        stroke(TEXT_COLOR);
        strokeWeight(1 * uiScale);
        rect(labelX - padX / 2, labelY - textH / 2 - padY / 2, textW + padX, textH + padY);

        noStroke();
        fill(TEXT_COLOR);
        text(labelText, labelX, labelY);
      }
    }
  }
}


function gotPoses(results) {
  poses = results;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}


// ----------------------------------
// toggle fullscreen on mouse click
// ----------------------------------
function mouseClicked() {
  const fs = fullscreen();
  fullscreen(!fs);

  setTimeout(() => {
    resizeCanvas(windowWidth, windowHeight);
  }, 60);
}


// ----------------------------------
// keyboard shortcuts
// ----------------------------------
function keyPressed() {
  if (key === 'h' || key === 'H') {
    showLines = !showLines;
  }

  if (key === 'b' || key === 'B') {
    showVideo = !showVideo;
  }

  // NEW: toggle grid
  if (key === 'g' || key === 'G') {
    showGrid = !showGrid;
  }
}