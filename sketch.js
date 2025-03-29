let player_x, player_y, player_size, energy, score, camera_x, camera_y, scroll_speed, player_speed, animals, aims, aim_transition_speed, gameOver, aim_hit_radius, aim_overlap_time, aim_shoot_delay, start_time, obstacles, fonts, images, playerPulse, playerColor, colors, grassPatches, clouds, walls, last_aim_spawn_time, gameState;

function preload() {
  // Loading custom font for futuristic look
  fonts = {
    main: loadFont('https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceCodePro-Bold.otf')
  };
}

function setup() {
  createCanvas(640, 480);
  frameRate(60);
  
  // Game state
  gameState = "INTRO"; // Can be "INTRO", "PLAYING", or "GAME_OVER"
  
  // Color palette for AI theme
  colors = {
    background: color(10, 20, 40),        // Dark space background
    player: color(0, 200, 255, 200),      // Glowing cyan for alien blob
    playerCore: color(180, 255, 255),     // Bright core of alien
    aim: color(255, 50, 100),             // Pinkish red for aim
    aimCharge: color(255, 20, 60),        // Brighter red for charging
    energyBar: color(0, 220, 180),        // Teal for energy bar
    uiText: color(220, 255, 240),         // Light cyan for UI text
    gameOverBg: color(5, 10, 20, 220),    // Dark overlay for game over
    buttonBg: color(30, 80, 130),         // Button background
    buttonHover: color(40, 120, 180),     // Button hover state
    buttonText: color(220, 255, 240)      // Button text
  };
  
  resetGame();
}

function resetGame() {
  // Player settings
  player_size = 30;
  player_speed = 2.5;
  player_x = 0; // Center of viewport horizontally
  player_y = -height/4; // Start in the lower half of the screen
  playerPulse = 0; // For pulsating effect
  playerColor = colors.player;
  
  // Camera settings
  scroll_speed = 1;
  camera_x = 0; // Fixed horizontal position
  camera_y = 0;
  
  // Game state
  energy = 30;
  score = 0;
  gameOver = false;
  start_time = millis(); // Track when game started
  
  // Arrays for game objects
  animals = [];
  obstacles = [];
  walls = [];
  
  // Generate initial environment elements
  grassPatches = [];
  for (let i = 0; i < 30; i++) {
    grassPatches.push({
      x: random(-width/2, width/2),
      y: random(-height/2, height*4), // Distribute ahead of camera
      size: random(5, 20)
    });
  }
  
  clouds = [];
  for (let i = 0; i < 10; i++) {
    clouds.push({
      x: random(-width, width),
      y: random(0, height*5), // Distribute ahead of camera
      size: random(50, 120),
      speed: random(0.1, 0.3),
      opacity: random(120, 180)
    });
  }
  
  // Aim settings - convert to array of aims
  aims = [];
  aim_hit_radius = player_size / 2 + 5; // Hit detection radius
  aim_shoot_delay = 500; // Half second delay before shooting in milliseconds
  last_aim_spawn_time = millis(); // Track when last aim was spawned
  
  // Create initial aim
  spawnNewAim();
  
  textFont(fonts.main);
  
  // Spawn initial walls
  for (let i = 0; i < 3; i++) {
    spawnWall();
  }
  
  // Spawn initial animals for immediate resources
  for (let i = 0; i < 5; i++) {
    spawnAnimal();
  }
}

function draw() {
  if (gameState === "INTRO") {
    drawIntroScreen();
  } else if (gameState === "PLAYING") {
    if (gameOver) {
      gameState = "GAME_OVER";
    }
    updateGame();
    drawGameWorld();
    drawUI();
  } else if (gameState === "GAME_OVER") {
    drawGameOver();
  }
}

function updateGame() {
  // Update score - seconds survived
  score = floor((millis() - start_time) / 1000);

  // Update camera position
  camera_x = 0; // Fixed horizontal position (center of viewport)
  camera_y += scroll_speed; // Scroll upwards only

  // Handle player movement with arrow keys
  if (keyIsDown(LEFT_ARROW)) player_x -= player_speed;
  if (keyIsDown(RIGHT_ARROW)) player_x += player_speed;
  if (keyIsDown(UP_ARROW)) player_y += player_speed;
  if (keyIsDown(DOWN_ARROW)) player_y -= player_speed;
  
  // Handle wall collisions before other movement
  handleWallCollisions();
  
  // Update player pulsating effect
  playerPulse = sin(frameCount * 0.1) * 5;
  
  // Spawn animals more frequently (every half second)
  if (frameCount % 30 === 0) {
    spawnAnimal();
  }
  
  // Spawn multiple animals every 3 seconds
  if (frameCount % 180 === 0) {
    for (let i = 0; i < 3; i++) {
      spawnAnimal();
    }
  }
  
  // Spawn obstacles more frequently (every 2 seconds)
  if (frameCount % 120 === 0) {
    spawnObstacle();
  }
  
  // Spawn multiple obstacles every 5 seconds
  if (frameCount % 300 === 0) {
    for (let i = 0; i < 2; i++) {
      spawnObstacle();
    }
  }
  
  // Spawn wall obstacles more frequently (every 4 seconds)
  if (frameCount % 240 === 0) {
    spawnWall();
  }
  
  // Spawn multiple walls every 8 seconds
  if (frameCount % 480 === 0) {
    for (let i = 0; i < 2; i++) {
      spawnWall();
    }
  }

  // Spawn a new aim every 10 seconds
  if (millis() - last_aim_spawn_time > 10000) {
    spawnNewAim();
    last_aim_spawn_time = millis();
  }
  
  // Update all aims
  updateAims();
  
  // Check player-animal collisions
  for (let i = animals.length - 1; i >= 0; i--) {
    let a = animals[i];
    if (dist(player_x, player_y, a.x, a.y) < player_size / 2 + a.size / 2) {
      energy += a.energyValue;
      
      // Visual feedback for eating
      for(let j = 0; j < 10; j++) {
        createParticle(a.x, a.y, a.color);
      }
      
      animals.splice(i, 1);
    }
  }
  
  // Check player-obstacle collisions
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let o = obstacles[i];
    if (dist(player_x, player_y, o.x, o.y) < player_size / 2 + o.size / 2) {
      energy -= o.energyLoss;
      
      // Visual feedback for collision
      for(let j = 0; j < 15; j++) {
        createParticle(o.x, o.y, color(255, 100, 50));
      }
      
      obstacles.splice(i, 1);
    }
  }

  // Decrease energy over time (every third of a second)
  if (frameCount % 20 === 0) { // 60 frames/sec ÷ 3 = 20 frames
    energy -= 1;
    if (energy <= 0) {
      gameOver = true;
    }
  }

  // Remove animals that go off-screen
  removeOffscreenObjects();
  
  // Update cloud positions
  for (let cloud of clouds) {
    cloud.x += cloud.speed;
    if (cloud.x > width) {
      cloud.x = -cloud.size;
      cloud.y = camera_y + height/2 + random(100, 300);
    }
  }
}

function handleWallCollisions() {
  // Check if player is trying to move through a wall
  let nextX = player_x;
  let nextY = player_y;
  
  // Calculate player's next position based on key presses
  if (keyIsDown(LEFT_ARROW)) nextX -= player_speed;
  if (keyIsDown(RIGHT_ARROW)) nextX += player_speed;
  if (keyIsDown(UP_ARROW)) nextY += player_speed;
  if (keyIsDown(DOWN_ARROW)) nextY -= player_speed;
  
  // Check if next position collides with any walls
  let canMove = true;
  
  for (let wall of walls) {
    // Simple rectangular collision detection
    if (rectCircleColliding(wall, {x: nextX, y: nextY, radius: player_size/2})) {
      canMove = false;
      break;
    }
  }
  
  // Update position only if no collision
  if (canMove) {
    if (keyIsDown(LEFT_ARROW)) player_x -= player_speed;
    if (keyIsDown(RIGHT_ARROW)) player_x += player_speed;
    if (keyIsDown(UP_ARROW)) player_y += player_speed;
    if (keyIsDown(DOWN_ARROW)) player_y -= player_speed;
  }
  
  // Keep player within screen boundaries
  let halfWidth = width / 2;
  let halfHeight = height / 2;
  // Limit horizontal movement (screen width)
  player_x = constrain(player_x, camera_x - halfWidth + player_size/2, camera_x + halfWidth - player_size/2);
  // Limit vertical movement (screen height)
  player_y = constrain(player_y, camera_y - halfHeight + player_size/2, camera_y + halfHeight - player_size/2);
}

// Helper function to detect collision between rectangle and circle
function rectCircleColliding(rect, circle) {
  // Find the closest point in the rectangle to the circle
  let closestX = constrain(circle.x, rect.x - rect.width/2, rect.x + rect.width/2);
  let closestY = constrain(circle.y, rect.y - rect.height/2, rect.y + rect.height/2);
  
  // Calculate distance between circle's center and closest point
  let distanceX = circle.x - closestX;
  let distanceY = circle.y - closestY;
  
  // If the distance is less than the circle's radius, there's a collision
  return (distanceX * distanceX + distanceY * distanceY) < (circle.radius * circle.radius);
}

function spawnAnimal() {
  // Animal types: butterflies, birds, rabbits, squirrels
  let animalTypes = [
    {type: 'butterfly', size: random(12, 20), color: color(random(180, 255), random(100, 200), random(200, 255), 220), energyValue: 2},
    {type: 'bird', size: random(15, 25), color: color(random(50, 150), random(100, 200), random(200, 255), 220), energyValue: 3},
    {type: 'rabbit', size: random(20, 30), color: color(random(220, 255), random(220, 255), random(220, 255), 220), energyValue: 4},
    {type: 'squirrel', size: random(18, 25), color: color(random(150, 200), random(80, 120), random(20, 80), 220), energyValue: 3}
  ];
  
  let selectedType = random(animalTypes);
  
  let animal = {
    x: random(camera_x - width / 2 + 30, camera_x + width / 2 - 30),
    y: camera_y + height / 2 + random(20, 80),
    size: selectedType.size,
    type: selectedType.type,
    color: selectedType.color,
    energyValue: selectedType.energyValue,
    angle: random(TWO_PI), // For movement patterns
    speed: random(0.5, 1.5),
    bobOffset: random(TWO_PI) // For bobbing movement
  };
  animals.push(animal);
}

function spawnObstacle() {
  // Obstacle types: rocks, thorns, holes
  let obstacleTypes = [
    {type: 'rock', size: random(20, 40), color: color(100, 100, 100, 220), energyLoss: 5},
    {type: 'thorn', size: random(15, 30), color: color(120, 80, 40, 220), energyLoss: 7},
    {type: 'poison', size: random(15, 25), color: color(100, 255, 0, 180), energyLoss: 10}
  ];
  
  let selectedType = random(obstacleTypes);
  
  let obstacle = {
    x: random(camera_x - width / 2 + 30, camera_x + width / 2 - 30),
    y: camera_y + height / 2 + random(20, 80),
    size: selectedType.size,
    type: selectedType.type,
    color: selectedType.color,
    energyLoss: selectedType.energyLoss,
    rotation: random(TWO_PI)
  };
  obstacles.push(obstacle);
}

function createParticle(x, y, particleColor) {
  // Could be expanded into a particle system
}

function removeOffscreenObjects() {
  // Remove animals that go off-screen
  for (let i = animals.length - 1; i >= 0; i--) {
    let a = animals[i];
    // Remove animals that fall below the bottom of the screen
    if (a.y < camera_y - height / 2 - a.size) {
      animals.splice(i, 1);
    }
  }
  
  // Remove obstacles that go off-screen
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let o = obstacles[i];
    if (o.y < camera_y - height / 2 - o.size) {
      obstacles.splice(i, 1);
    }
  }
  
  // Remove walls that go off-screen
  for (let i = walls.length - 1; i >= 0; i--) {
    let w = walls[i];
    if (w.y < camera_y - height / 2 - w.height) {
      walls.splice(i, 1);
    }
  }
}

function drawGameWorld() {
  // Draw starry background
  background(colors.background);
  
  // Draw stars
  fill(255, 200);
  for (let i = 0; i < 50; i++) {
    let starX = ((camera_x / 10) + i * 200) % width;
    let starY = ((camera_y / 10) + i * 150) % height;
    let starSize = random(1, 3);
    ellipse(starX, starY, starSize);
  }
  
  push();
  translate(width / 2, height / 2);
  scale(1, -1); // Flip y-axis so y increases upwards
  
  // Draw clouds in distance
  for (let cloud of clouds) {
    noStroke();
    fill(255, cloud.opacity);
    for (let i = 0; i < 3; i++) {
      ellipse(
        cloud.x - camera_x * 0.2 + i * cloud.size/3, 
        cloud.y - camera_y * 0.2,
        cloud.size * 0.6, 
        cloud.size * 0.4
      );
    }
  }
  
  // Draw grass patches
  for (let grass of grassPatches) {
    fill(20, 200, 50, 150);
    for (let i = 0; i < 5; i++) {
      let xOffset = sin(frameCount * 0.02 + i) * 2;
      let height = grass.size + sin(frameCount * 0.05 + i * 10) * 3;
      rect(
        grass.x - camera_x + i * 3 - 6 + xOffset,
        grass.y - camera_y,
        2,
        height
      );
    }
  }

  // Draw walls (solid objects)
  for (let w of walls) {
    push();
    translate(w.x - camera_x, w.y - camera_y);
    rotate(w.rotation);
    
    // Base wall
    fill(w.color);
    rectMode(CENTER);
    rect(0, 0, w.width, w.height, 5);
    
    // Add details based on wall type
    if (w.type === 'barrier') {
      // Metal barrier with rivets and stripes
      fill(50, 55, 60);
      rect(0, 0, w.width * 0.9, w.height * 0.7, 3);
      
      // Rivets
      fill(120, 125, 130);
      for (let i = 0; i < w.detail; i++) {
        let rx = map(i, 0, w.detail-1, -w.width/2 + 10, w.width/2 - 10);
        ellipse(rx, -w.height/4, 6, 6);
        ellipse(rx, w.height/4, 6, 6);
      }
      
      // Warning stripes
      fill(255, 210, 0);
      rect(0, -w.height/3, w.width * 0.5, w.height/10);
    } 
    else if (w.type === 'crystal') {
      // Crystal formation with glowing center
      noStroke();
      
      // Inner glow
      fill(150, 180, 255, 150);
      rect(0, 0, w.width * 0.7, w.height * 0.7, 5);
      
      // Crystal shards
      fill(180, 200, 255, 180);
      for (let i = 0; i < w.detail; i++) {
        let angle = TWO_PI * i / w.detail;
        let x = cos(angle) * w.width * 0.4;
        let y = sin(angle) * w.height * 0.4;
        let size = random(10, 20);
        triangle(
          x, y,
          x + cos(angle) * size, y + sin(angle) * size,
          x + cos(angle + PI/4) * size, y + sin(angle + PI/4) * size
        );
      }
    }
    else if (w.type === 'ruin') {
      // Ancient ruins with weathered texture
      fill(100, 90, 70);
      rect(0, 0, w.width * 0.95, w.height * 0.9, 2);
      
      // Cracks and weathering
      stroke(70, 65, 50);
      strokeWeight(1);
      for (let i = 0; i < w.detail; i++) {
        let x1 = random(-w.width/2, w.width/2);
        let y1 = random(-w.height/2, w.height/2);
        let x2 = x1 + random(-20, 20);
        let y2 = y1 + random(-20, 20);
        line(x1, y1, x2, y2);
      }
      
      // Rune markings
      noStroke();
      fill(140, 130, 80);
      for (let i = 0; i < 3; i++) {
        let x = map(i, 0, 2, -w.width/3, w.width/3);
        let symbolSize = w.height * 0.3;
        rect(x, 0, symbolSize * 0.6, symbolSize, 2);
      }
    }
    
    pop();
  }

  // Draw obstacles
  for (let o of obstacles) {
    // Add pulsating red danger aura around obstacles
    let auraSize = o.size * 1.5 + sin(frameCount * 0.1) * 5;
    let auraOpacity = map(sin(frameCount * 0.1) * 0.5 + 0.5, 0, 1, 30, 80);
    
    // Outer glow
    fill(255, 0, 0, auraOpacity);
    ellipse(o.x - camera_x, o.y - camera_y, auraSize, auraSize);
    
    // Inner more intense glow
    fill(255, 40, 40, auraOpacity * 1.5);
    ellipse(o.x - camera_x, o.y - camera_y, auraSize * 0.7, auraSize * 0.7);
    
    if (o.type === 'rock') {
      fill(o.color);
      push();
      translate(o.x - camera_x, o.y - camera_y);
      rotate(o.rotation);
      beginShape();
      for (let i = 0; i < 8; i++) {
        let angle = TWO_PI * i / 8;
        let r = o.size/2 * (0.8 + 0.2 * sin(angle * 5));
        vertex(r * cos(angle), r * sin(angle));
      }
      endShape(CLOSE);
      pop();
    } else if (o.type === 'thorn') {
      fill(o.color);
      push();
      translate(o.x - camera_x, o.y - camera_y);
      rotate(o.rotation);
      for (let i = 0; i < 5; i++) {
        let angle = TWO_PI * i / 5;
        let x1 = 0;
        let y1 = 0;
        let x2 = cos(angle) * o.size;
        let y2 = sin(angle) * o.size;
        triangle(x1, y1, x2, y2, cos(angle + 0.4) * o.size/3, sin(angle + 0.4) * o.size/3);
      }
      pop();
    } else if (o.type === 'poison') {
      fill(o.color);
      push();
      translate(o.x - camera_x, o.y - camera_y);
      rotate(frameCount * 0.02);
      for (let i = 0; i < 6; i++) {
        let angle = TWO_PI * i / 6;
        let x = cos(angle) * o.size/2;
        let y = sin(angle) * o.size/2;
        ellipse(x, y, o.size/3);
      }
      ellipse(0, 0, o.size/2);
      pop();
    }
  }

  // Draw animals
  for (let a of animals) {
    fill(a.color);
    push();
    translate(a.x - camera_x, a.y - camera_y);
    
    // Add slight movement to animals
    a.angle += 0.05;
    a.x += sin(a.angle) * a.speed/2;
    a.y += cos(a.bobOffset + frameCount * 0.1) * 0.5;
    
    if (a.type === 'butterfly') {
      // Wings flapping
      let wingAngle = sin(frameCount * 0.2) * PI/4;
      fill(a.color);
      // Left wing
      push();
      rotate(wingAngle);
      ellipse(-a.size/2, 0, a.size, a.size/1.5);
      pop();
      // Right wing
      push();
      rotate(-wingAngle);
      ellipse(a.size/2, 0, a.size, a.size/1.5);
      pop();
      // Body
      fill(0);
      ellipse(0, 0, a.size/5, a.size/2);
    } else if (a.type === 'bird') {
      // Wings flapping
      let wingAngle = sin(frameCount * 0.3) * PI/6;
      fill(a.color);
      ellipse(0, 0, a.size, a.size/2); // Body
      // Wings
      push();
      rotate(wingAngle);
      ellipse(-a.size/2, 0, a.size/2, a.size/4);
      pop();
      push();
      rotate(-wingAngle);
      ellipse(a.size/2, 0, a.size/2, a.size/4);
      pop();
      // Head
      ellipse(a.size/2, 0, a.size/3, a.size/3);
    } else if (a.type === 'rabbit') {
      ellipse(0, 0, a.size, a.size/1.5); // Body
      ellipse(a.size/2, a.size/4, a.size/2, a.size/2); // Head
      // Ears
      rect(a.size/2 - a.size/8, a.size/2, a.size/8, a.size/2);
      rect(a.size/2 + a.size/8, a.size/2, a.size/8, a.size/2);
    } else if (a.type === 'squirrel') {
      ellipse(0, 0, a.size, a.size/1.5); // Body
      ellipse(a.size/2, 0, a.size/2, a.size/2); // Head
      // Tail
      beginShape();
      for(let i = 0; i < 10; i++) {
        let angle = PI/2 + i/10 * PI/2;
        let r = a.size * (0.7 + sin(i/3) * 0.3);
        vertex(-a.size/2 + r * cos(angle), r * sin(angle)/2);
      }
      endShape();
    }
    pop();
  }

  // Draw player (alien blob)
  drawPlayer();

  // Draw all aims
  for (let aim of aims) {
    // Draw aim targeting cursor
    noFill();
    stroke(aim.color);
    strokeWeight(2);
    ellipse(aim.x - camera_x, aim.y - camera_y, 15);
    
    // Draw targeting crosshairs
    line(aim.x - camera_x - 15, aim.y - camera_y, aim.x - camera_x - 5, aim.y - camera_y);
    line(aim.x - camera_x + 5, aim.y - camera_y, aim.x - camera_x + 15, aim.y - camera_y);
    line(aim.x - camera_x, aim.y - camera_y - 15, aim.x - camera_x, aim.y - camera_y - 5);
    line(aim.x - camera_x, aim.y - camera_y + 5, aim.x - camera_x, aim.y - camera_y + 15);
    
    // Draw rotating elements
    push();
    translate(aim.x - camera_x, aim.y - camera_y);
    rotate(frameCount * 0.05);
    for (let i = 0; i < 3; i++) {
      rotate(TWO_PI / 3);
      line(0, 10, 0, 20);
    }
    pop();
    
    // Visual indicator when aim is overlapping (charging to shoot)
    if (aim.overlap_time > 0) {
      // Show a growing circle based on how close to shooting
      let chargeProgress = (millis() - aim.overlap_time) / aim_shoot_delay;
      let chargeSize = 30 * chargeProgress;
      stroke(aim.charge_color);
      strokeWeight(2);
      ellipse(aim.x - camera_x, aim.y - camera_y, chargeSize);
      
      // Add pulsing effect when about to shoot
      if (chargeProgress > 0.7) {
        let pulseSize = 5 + sin(frameCount * 0.8) * 3;
        stroke(255, 50, 50, 200);
        ellipse(aim.x - camera_x, aim.y - camera_y, chargeSize + pulseSize);
      }
    }
  }
  
  noStroke();
  
  pop();
}

function drawPlayer() {
  // Alien blob with tentacles and glowing effects
  push();
  translate(player_x - camera_x, player_y - camera_y);
  
  // Tentacles/appendages
  stroke(colors.player);
  strokeWeight(3);
  for(let i = 0; i < 6; i++) {
    let angle = i * TWO_PI/6 + sin(frameCount * 0.1) * 0.2;
    let len = player_size/2 + sin(frameCount * 0.1 + i) * 5;
    let x2 = cos(angle) * len;
    let y2 = sin(angle) * len;
    
    // Wavy tentacles
    beginShape();
    for(let j = 0; j < 5; j++) {
      let t = j/4;
      let xWave = lerp(0, x2, t) + sin(t * PI + frameCount * 0.1) * 3;
      let yWave = lerp(0, y2, t) + cos(t * PI + frameCount * 0.1) * 3;
      curveVertex(xWave, yWave);
    }
    endShape();
  }
  noStroke();
  
  // Blob body with pulsating effect
  fill(colors.player);
  ellipse(0, 0, player_size + playerPulse, player_size + playerPulse);
  
  // Inner glow
  fill(colors.playerCore);
  let innerSize = player_size * 0.6 + sin(frameCount * 0.2) * 3;
  ellipse(0, 0, innerSize, innerSize);
  
  // AI pattern (binary-like circles)
  fill(colors.background);
  for (let i = 0; i < 3; i++) {
    let dotAngle = frameCount * 0.03 + i * TWO_PI/3;
    let dotDist = innerSize * 0.3;
    ellipse(
      cos(dotAngle) * dotDist,
      sin(dotAngle) * dotDist,
      5,
      5
    );
  }
  
  pop();
}

function drawUI() {
  // Energy bar with glowing effect
  noStroke();
  // Background bar
  fill(40, 40, 40, 200);
  rect(10, 10, 150, 20, 10);
  
  // Energy level
  let energyWidth = map(energy, 0, 30, 0, 146);
  fill(colors.energyBar);
  rect(12, 12, energyWidth, 16, 8);
  
  // Add pulsing glow based on energy level
  if (energy < 10) {
    let pulseOpacity = map(sin(frameCount * 0.2) * 0.5 + 0.5, 0, 1, 100, 200);
    fill(255, 0, 0, pulseOpacity);
    rect(12, 12, energyWidth, 16, 8);
  }
  
  // Text labels with outlined tech style
  fill(colors.uiText);
  textSize(16);
  textAlign(LEFT, TOP);
  text("ENERGY: " + energy, 170, 11);
  
  // Score with AI/tech styling
  textAlign(RIGHT, TOP);
  text("SURVIVAL: " + score + "s", width - 10, 11);
  
  // Add small decorative elements
  fill(colors.aim);
  rect(width - 20, 30, 10, 2);
  rect(width - 30, 30, 5, 2);
  
  fill(colors.player);
  rect(10, 40, 5, 2);
  rect(20, 40, 10, 2);
}

function drawIntroScreen() {
  // Background with starry effect
  background(colors.background);
  
  // Draw stars
  fill(255, 200);
  for (let i = 0; i < 70; i++) {
    let starX = (i * 200 + frameCount * 0.1) % width;
    let starY = (i * 150 + sin(frameCount * 0.01 + i) * 10) % height;
    let starSize = random(1, 3);
    ellipse(starX, starY, starSize);
    
    // Add twinkling effect to some stars
    if (i % 5 === 0) {
      let pulse = sin(frameCount * 0.1 + i) * 2;
      ellipse(starX, starY, starSize + pulse);
    }
  }
  
  // Draw title with glowing effect
  textAlign(CENTER, CENTER);
  let titleGlow = sin(frameCount * 0.05) * 10 + 10;
  
  // Glow effect
  fill(colors.player.levels[0], colors.player.levels[1], colors.player.levels[2], 100);
  textSize(51 + titleGlow * 0.5);
  text("ALIEN BLOB SURVIVAL", width/2, height/3 - 30);
  
  // Main title
  fill(colors.playerCore);
  textSize(50);
  text("ALIEN BLOB SURVIVAL", width/2, height/3 - 30);
  
  // Subtitle
  fill(colors.uiText);
  textSize(18);
  text("COLLECT ENERGY • AVOID HAZARDS • ESCAPE THE HUNTERS", width/2, height/3 + 30);
  
  // Draw the alien blob as logo
  push();
  translate(width/2, height/2 - 10);
  
  // Tentacles/appendages
  stroke(colors.player);
  strokeWeight(3);
  for(let i = 0; i < 6; i++) {
    let angle = i * TWO_PI/6 + sin(frameCount * 0.1) * 0.2;
    let len = 25 + sin(frameCount * 0.1 + i) * 5;
    let x2 = cos(angle) * len;
    let y2 = sin(angle) * len;
    
    // Wavy tentacles
    beginShape();
    for(let j = 0; j < 5; j++) {
      let t = j/4;
      let xWave = lerp(0, x2, t) + sin(t * PI + frameCount * 0.1) * 3;
      let yWave = lerp(0, y2, t) + cos(t * PI + frameCount * 0.1) * 3;
      curveVertex(xWave, yWave);
    }
    endShape();
  }
  noStroke();
  
  // Blob body with pulsating effect
  let logoPulse = sin(frameCount * 0.1) * 5;
  fill(colors.player);
  ellipse(0, 0, 60 + logoPulse, 60 + logoPulse);
  
  // Inner glow
  fill(colors.playerCore);
  let innerSize = 40 + sin(frameCount * 0.2) * 3;
  ellipse(0, 0, innerSize, innerSize);
  
  // AI pattern (binary-like circles)
  fill(colors.background);
  for (let i = 0; i < 3; i++) {
    let dotAngle = frameCount * 0.03 + i * TWO_PI/3;
    let dotDist = innerSize * 0.3;
    ellipse(
      cos(dotAngle) * dotDist,
      sin(dotAngle) * dotDist,
      8,
      8
    );
  }
  pop();
  
  // Draw start button
  let buttonX = width/2;
  let buttonY = height * 0.75;
  let buttonWidth = 200;
  let buttonHeight = 50;
  
  // Check if mouse is over button
  let mouseOverButton = 
    mouseX > buttonX - buttonWidth/2 && 
    mouseX < buttonX + buttonWidth/2 && 
    mouseY > buttonY - buttonHeight/2 && 
    mouseY < buttonY + buttonHeight/2;
  
  // Button background with hover effect
  fill(mouseOverButton ? colors.buttonHover : colors.buttonBg);
  rect(buttonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 10);
  
  // Button glow when hovering
  if (mouseOverButton) {
    noFill();
    stroke(colors.playerCore);
    strokeWeight(2);
    rect(buttonX - buttonWidth/2 - 3, buttonY - buttonHeight/2 - 3, buttonWidth + 6, buttonHeight + 6, 12);
    noStroke();
  }
  
  // Button text
  fill(colors.buttonText);
  textSize(22);
  text("START GAME", buttonX, buttonY + 2);
  
  // Draw small decorative elements
  fill(colors.aim);
  rect(width/2 - 100, height * 0.75 + 40, 30, 2);
  rect(width/2 - 80, height * 0.75 + 40, 10, 2);
  
  fill(colors.player);
  rect(width/2 + 70, height * 0.75 + 40, 10, 2);
  rect(width/2 + 90, height * 0.75 + 40, 30, 2);
  
  // Draw controls info
  textSize(16);
  fill(colors.uiText);
  text("ARROW KEYS TO MOVE", width/2, height - 40);
}

function mousePressed() {
  if (gameState === "INTRO") {
    // Check if start button is clicked
    let buttonX = width/2;
    let buttonY = height * 0.75;
    let buttonWidth = 200;
    let buttonHeight = 50;
    
    if (
      mouseX > buttonX - buttonWidth/2 && 
      mouseX < buttonX + buttonWidth/2 && 
      mouseY > buttonY - buttonHeight/2 && 
      mouseY < buttonY + buttonHeight/2
    ) {
      // Start the game
      resetGame();
      gameState = "PLAYING";
    }
  } else if (gameState === "GAME_OVER") {
    // Return to intro screen on click
    gameState = "INTRO";
  }
}

function drawGameOver() {
  // Background
  background(colors.background);
  
  // Semi-transparent overlay
  fill(colors.gameOverBg);
  rect(0, 0, width, height);
  
  // Game over text with tech styling
  fill(colors.aim);
  textSize(40);
  textAlign(CENTER, CENTER);
  text("SIMULATION TERMINATED", width / 2, height / 2 - 50);
  
  fill(colors.player);
  textSize(24);
  text("ALIEN SURVIVAL: " + score + " SECONDS", width / 2, height / 2 + 10);
  
  // Restart prompt with blinking effect
  if (frameCount % 60 < 40) {
    fill(colors.uiText);
    textSize(16);
    text("CLICK ANYWHERE TO RETURN TO MENU", width / 2, height / 2 + 80);
  }
}

function spawnWall() {
  // Wall types: metal barriers, crystal formations, ancient ruins
  let wallTypes = [
    {type: 'barrier', width: random(60, 100), height: random(20, 40), color: color(80, 90, 100, 240)},
    {type: 'crystal', width: random(40, 80), height: random(60, 90), color: color(100, 130, 220, 200)},
    {type: 'ruin', width: random(70, 120), height: random(30, 50), color: color(120, 110, 80, 220)}
  ];
  
  let selectedType = random(wallTypes);
  
  let wall = {
    x: random(camera_x - width / 2 + selectedType.width/2 + 20, camera_x + width / 2 - selectedType.width/2 - 20),
    y: camera_y + height / 2 + random(40, 100),
    width: selectedType.width,
    height: selectedType.height,
    type: selectedType.type,
    color: selectedType.color,
    rotation: random(-0.3, 0.3), // Slight rotation for variety
    detail: floor(random(3, 6)) // Number of detail elements
  };
  
  walls.push(wall);
}

// New function to spawn an aim
function spawnNewAim() {
  // Choose a random edge to spawn from
  let spawnEdge = floor(random(4)); // 0: top, 1: right, 2: bottom, 3: left
  let new_aim_x, new_aim_y;
  
  switch(spawnEdge) {
    case 0: // top
      new_aim_x = random(camera_x - width/2, camera_x + width/2);
      new_aim_y = camera_y + height/2 + 50;
      break;
    case 1: // right
      new_aim_x = camera_x + width/2 + 50;
      new_aim_y = random(camera_y - height/2, camera_y + height/2);
      break;
    case 2: // bottom
      new_aim_x = random(camera_x - width/2, camera_x + width/2);
      new_aim_y = camera_y - height/2 - 50;
      break;
    case 3: // left
      new_aim_x = camera_x - width/2 - 50;
      new_aim_y = random(camera_y - height/2, camera_y + height/2);
      break;
  }
  
  // Create new aim object with slight color variation
  let aimObj = {
    x: new_aim_x,
    y: new_aim_y,
    overlap_time: 0,
    color: color(
      red(colors.aim) + random(-20, 20),
      green(colors.aim) + random(-20, 20),
      blue(colors.aim) + random(-20, 20)
    ),
    charge_color: color(
      red(colors.aimCharge) + random(-20, 20),
      green(colors.aimCharge) + random(-20, 20),
      blue(colors.aimCharge) + random(-20, 20)
    ),
    size: 20 // Standard aim size
  };
  
  aims.push(aimObj);
}

// Replace updateAimPosition with updateAims
function updateAims() {
  for (let i = 0; i < aims.length; i++) {
    let aim = aims[i];
    
    // Calculate vector to player
    let dx = player_x - aim.x;
    let dy = player_y - aim.y;
    
    // Calculate distance to player
    let distance = sqrt(dx*dx + dy*dy);
    
    // Maintain consistent high speed regardless of distance
    // Base speed is higher than player_speed to ensure it can catch up
    let baseSpeed = player_speed * 1.4;
    
    // Add slight prediction to target where player is moving
    let predictiveX = player_x;
    let predictiveY = player_y;
    
    // If player is moving, aim slightly ahead
    if (keyIsDown(LEFT_ARROW)) predictiveX -= 15;
    if (keyIsDown(RIGHT_ARROW)) predictiveX += 15;
    if (keyIsDown(UP_ARROW)) predictiveY += 15;
    if (keyIsDown(DOWN_ARROW)) predictiveY -= 15;
    
    // Calculate angle to player (or predicted position)
    let angle = atan2(predictiveY - aim.y, predictiveX - aim.x);
    
    // Move directly toward player with consistent speed regardless of distance
    aim.x += cos(angle) * baseSpeed;
    aim.y += sin(angle) * baseSpeed;
    
    // Add small random movement for more organic feel
    aim.x += random(-0.3, 0.3);
    aim.y += random(-0.3, 0.3);
    
    // Check if aim has reached the player
    let dist_to_player = dist(aim.x, aim.y, player_x, player_y);
    if (dist_to_player < aim_hit_radius) {
      // Start counting overlap time
      if (aim.overlap_time === 0) {
        aim.overlap_time = millis();
      }
      
      // Check if we've overlapped long enough to shoot
      if (millis() - aim.overlap_time >= aim_shoot_delay) {
        // Direct hit after delay! Game over
        gameOver = true;
        
        // Visual feedback (flash)
        fill(255, 0, 0, 150);
        rect(0, 0, width, height);
      }
    } else {
      // Reset overlap time if not touching
      aim.overlap_time = 0;
    }
  }
}