// ----------------------
// Configurable (existing) variables moved to top
// ----------------------
let BG_COLOR = 0;                 
let CONFIDENCE_THRESHOLD = 0.07;  
let LINE_COLOR = '#00ff00';       
let LINE_THICKNESS = 1.5          
let DOT_COLOR = '#00ff00';        
let DOT_SIZE = 20;                
let TEXT_COLOR = '#ffffff';       
let TEXT_SIZE_PX = 14;            
let COORD_SCALE = 0.25;           
let LABEL_GAP = 5;                
// ----------------------

// NEW: toggle for showing/hiding skeleton lines
let showLines = true;

let video;
let bodyPose;
let poses = [];
let connections;

function preload() {
  bodyPose = ml5.bodyPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  bodyPose.detectStart(video, gotPoses);
  connections = bodyPose.getSkeleton();
}

function draw() {
  background(BG_COLOR);

  push();
  translate(width, 0);
  scale(-1, 1);

  image(video, 0, 0, width, height);

  // -----------------------
  // DRAW CONNECTION LINES
  // -----------------------
  if (showLines) {   // ← NEW conditional
    for (let i = 0; i < poses.length; i++) {
      let pose = poses[i];
      for (let j = 0; j < connections.length; j++) {
        let pointAIndex = connections[j][0];
        let pointBIndex = connections[j][1];
        let pointA = pose.keypoints[pointAIndex];
        let pointB = pose.keypoints[pointBIndex];

        let ax = pointA.x ?? pointA.position?.x;
        let ay = pointA.y ?? pointA.position?.y;
        let bx = pointB.x ?? pointB.position?.x;
        let by = pointB.y ?? pointB.position?.y;
        let aConf = pointA.confidence ?? pointA.score ?? 0;
        let bConf = pointB.confidence ?? pointB.score ?? 0;

        if (aConf > CONFIDENCE_THRESHOLD && bConf > CONFIDENCE_THRESHOLD && ax != null && bx != null) {
          stroke(LINE_COLOR);
          strokeWeight(LINE_THICKNESS);
          line(ax, ay, bx, by);
        }
      }
    }
  }

  // Draw dots
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < pose.keypoints.length; j++) {
      let keypoint = pose.keypoints[j];

      let kx = keypoint.x ?? keypoint.position?.x;
      let ky = keypoint.y ?? keypoint.position?.y;
      let kConf = keypoint.confidence ?? keypoint.score ?? 0;

      if (kConf > CONFIDENCE_THRESHOLD && kx != null) {
        fill(DOT_COLOR);
        noStroke();
        circle(kx, ky, DOT_SIZE);
      }
    }
  }

  pop();

  // ----------------------------
  // Draw coordinate labels
  // ----------------------------
  fill(TEXT_COLOR);
  textSize(TEXT_SIZE_PX);
  textAlign(LEFT, CENTER);

  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < pose.keypoints.length; j++) {
      let keypoint = pose.keypoints[j];

      let rawX = keypoint.x ?? keypoint.position?.x;
      let rawY = keypoint.y ?? keypoint.position?.y;
      let kConf = keypoint.confidence ?? keypoint.score ?? 0;

      if (kConf > CONFIDENCE_THRESHOLD && rawX != null) {
        let screenX = width - rawX;
        let screenY = rawY;

        let labelX = screenX + DOT_SIZE * 0.6 + LABEL_GAP;
        let labelY = screenY;

        let scaledX = Math.round(screenX * COORD_SCALE);
        let scaledY = Math.round(screenY * COORD_SCALE);

        let labelText = `${scaledX}, ${scaledY}`;
        let textW = textWidth(labelText);
        let textH = TEXT_SIZE_PX;

        let padX = 6;
        let padY = 4;

        noFill();
        stroke(TEXT_COLOR);
        strokeWeight(1);
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
  if (video && video.size) {
    video.size(width, height);
  }
}


// ----------------------------------
// NEW: Press H → toggle lines on/off
// ----------------------------------
function keyPressed() {
  if (key === 'h' || key === 'H') {
    showLines = !showLines;
  }
}