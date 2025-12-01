// ----------------------
// Configurable (existing) variables moved to top
// ----------------------
let BG_COLOR = 0;                 
let CONFIDENCE_THRESHOLD = 0.07;  
let LINE_COLOR = '#00ff00';       
let LINE_THICKNESS = 2;         
let DOT_COLOR = '#00ff00';        
let DOT_SIZE = 25;                
let TEXT_COLOR = '#ffffff';       
let TEXT_SIZE_PX = 18;            
let COORD_SCALE = 0.25;           
let LABEL_GAP = 5;                
// ----------------------

// NEW: toggle for showing/hiding skeleton lines
let showLines = true;

// NEW: toggle for showing/hiding the webcam video
let showVideo = false;

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

function preload() {
  bodyPose = ml5.bodyPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // createCapture with callback to capture intrinsic size when available
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
  // Compute UI scaling factor based on window size vs reference size
  uiScale = Math.min(windowWidth / REF_WIDTH, windowHeight / REF_HEIGHT);

  background(BG_COLOR);

  // Figure out intrinsic video size each frame (in case it becomes available later)
  if (video && video.elt && video.elt.videoWidth && video.elt.videoHeight) {
    vidW = video.elt.videoWidth;
    vidH = video.elt.videoHeight;
  }

  // ---------------------------------------------------------
  // Compute cover-fit video draw rectangle (no warping)
  // ---------------------------------------------------------
  const canvasAR = width / height;
  const videoAR = vidW / vidH || 1;

  let drawW, drawH, offsetX, offsetY;
  if (videoAR > canvasAR) {
    // Video is wider than canvas -> fit height, crop sides
    drawH = height;
    drawW = height * videoAR;
  } else {
    // Video is taller (or equal) -> fit width, crop top/bottom
    drawW = width;
    drawH = width / videoAR;
  }
  offsetX = (width - drawW) / 2;
  offsetY = (height - drawH) / 2;

  // scale factors from video pixel space -> drawn canvas rectangle
  const sx = drawW / vidW;
  const sy = drawH / vidH;

  push();
  translate(width, 0);
  scale(-1, 1);

  // -------------------------
  // NEW: Only draw video if enabled
  // -------------------------
  if (showVideo) {
    image(video, offsetX, offsetY, drawW, drawH);
  } else {
    // Fill the area where video would have been, to ensure full black
    fill(0);
    noStroke();
    rect(0, 0, width, height);
  }

  // -----------------------
  // DRAW CONNECTION LINES (mapped)
  // -----------------------
  if (showLines) {
    for (let i = 0; i < poses.length; i++) {
      let pose = poses[i];
      for (let j = 0; j < connections.length; j++) {
        let pointAIndex = connections[j][0];
        let pointBIndex = connections[j][1];
        let pointA = pose.keypoints[pointAIndex];
        let pointB = pose.keypoints[pointBIndex];

        // raw pose coordinates (video pixel space)
        let rawAx = pointA.x ?? pointA.position?.x;
        let rawAy = pointA.y ?? pointA.position?.y;
        let rawBx = pointB.x ?? pointB.position?.x;
        let rawBy = pointB.y ?? pointB.position?.y;
        let aConf = pointA.confidence ?? pointA.score ?? 0;
        let bConf = pointB.confidence ?? pointB.score ?? 0;

        if (aConf > CONFIDENCE_THRESHOLD && bConf > CONFIDENCE_THRESHOLD &&
            rawAx != null && rawAy != null && rawBx != null && rawBy != null) {

          // map into drawn video rectangle (canvas pixel space)
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

  // -----------------------
  // DRAW DOTS (mapped)
  // -----------------------
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < pose.keypoints.length; j++) {
      let keypoint = pose.keypoints[j];

      let rawX = keypoint.x ?? keypoint.position?.x;
      let rawY = keypoint.y ?? keypoint.position?.y;
      let kConf = keypoint.confidence ?? keypoint.score ?? 0;

      if (kConf > CONFIDENCE_THRESHOLD && rawX != null && rawY != null) {
        // mapped canvas coordinates (inside mirrored context)
        let kx = offsetX + rawX * sx;
        let ky = offsetY + rawY * sy;

        fill(DOT_COLOR);
        noStroke();
        circle(kx, ky, DOT_SIZE * uiScale);
      }
    }
  }

  pop(); // restore normal coordinate system for upright text

  // ----------------------------
  // Draw coordinate labels (upright), using mapped coords
  // ----------------------------
  fill(TEXT_COLOR);
  textSize(TEXT_SIZE_PX * uiScale);
  textAlign(LEFT, CENTER);

  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < pose.keypoints.length; j++) {
      let keypoint = pose.keypoints[j];

      let rawX = keypoint.x ?? keypoint.position?.x;
      let rawY = keypoint.y ?? keypoint.position?.y;
      let kConf = keypoint.confidence ?? keypoint.score ?? 0;

      if (kConf > CONFIDENCE_THRESHOLD && rawX != null && rawY != null) {
        // mapped canvas coords (same as used above)
        let mappedX = offsetX + rawX * sx;
        let mappedY = offsetY + rawY * sy;

        // mirrored on-screen X where dot visually appears
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

  // NEW: toggle webcam visibility
  if (key === 'b' || key === 'B') {
    showVideo = !showVideo;
  }
}