let player_x, player_y, player_size, energy, score, camera_x, camera_y, scroll_speed, player_speed, animals, aim_x, aim_y, aim_transition_speed, gameOver, aim_hit_radius, aim_overlap_time, aim_shoot_delay, start_time;

function setup() {
  createCanvas(640, 480);
  frameRate(60);
  
  // Player settings
  player_size = 20;
  player_speed = 5;
  player_x = 0; // Center of viewport horizontally
  player_y = -height/4; // Start in the lower half of the screen
  
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
  
  // Aim settings
  aim_x = camera_x;
  aim_y = camera_y + height / 2;
  aim_transition_speed = 0.05; // Controls how quickly aim transitions to player (0-1)
  aim_hit_radius = player_size / 2 + 5; // Hit detection radius
  aim_overlap_time = 0; // Tracks how long aim is overlapping player
  aim_shoot_delay = 500; // Half second delay before shooting in milliseconds
}

function draw() {
  if (gameOver) {
    fill(0);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("Game Over", width / 2, height / 2);
    text("Survived: " + score + " seconds", width / 2, height / 2 + 40);
    return;
  }

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
  
  // Keep player within screen boundaries
  let halfWidth = width / 2;
  let halfHeight = height / 2;
  // Limit horizontal movement (screen width)
  player_x = constrain(player_x, camera_x - halfWidth + player_size/2, camera_x + halfWidth - player_size/2);
  // Limit vertical movement (screen height)
  player_y = constrain(player_y, camera_y - halfHeight + player_size/2, camera_y + halfHeight - player_size/2);

  // Spawn animals periodically (every second)
  if (frameCount % 60 === 0) {
    let animal = {
      x: random(camera_x - width / 2 + 20, camera_x + width / 2 - 20), // Keep within viewport with margin
      y: camera_y + height / 2 + random(0, 50), // Above the screen but closer
      size: random(10, 20),
      type: random(['circle', 'square', 'triangle']),
      color: color(random(255), random(255), random(255)),
      energyValue: floor(random(1, 6)) // Energy gain: 1 to 5
    };
    animals.push(animal);
  }

  // Update aim position with fluid transition
  aim_x = lerp(aim_x, player_x, aim_transition_speed);
  aim_y = lerp(aim_y, player_y, aim_transition_speed);
  
  // Check if aim has reached the player
  let distance = dist(aim_x, aim_y, player_x, player_y);
  if (distance < aim_hit_radius) {
    // Start counting overlap time
    if (aim_overlap_time === 0) {
      aim_overlap_time = millis();
    }
    
    // Check if we've overlapped long enough to shoot
    if (millis() - aim_overlap_time >= aim_shoot_delay) {
      // Direct hit after delay! Game over
      gameOver = true;
      
      // Visual feedback (flash)
      fill(255, 0, 0, 150);
      rect(0, 0, width, height);
    }
  } else {
    // Reset overlap time if not touching
    aim_overlap_time = 0;
  }

  // Check player-animal collisions
  for (let i = animals.length - 1; i >= 0; i--) {
    let a = animals[i];
    if (dist(player_x, player_y, a.x, a.y) < player_size / 2 + a.size / 2) {
      energy += a.energyValue;
      animals.splice(i, 1);
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
  for (let i = animals.length - 1; i >= 0; i--) {
    let a = animals[i];
    // Remove animals that fall below the bottom of the screen
    if (a.y < camera_y - height / 2 - a.size) {
      animals.splice(i, 1);
    }
  }

  // Draw game world
  background(200, 255, 200); // Light green background
  push();
  translate(width / 2, height / 2);
  scale(1, -1); // Flip y-axis so y increases upwards

  // Draw animals
  for (let a of animals) {
    fill(a.color);
    if (a.type === 'circle') {
      ellipse(a.x - camera_x, a.y - camera_y, a.size);
    } else if (a.type === 'square') {
      rect(a.x - camera_x - a.size / 2, a.y - camera_y - a.size / 2, a.size, a.size);
    } else if (a.type === 'triangle') {
      let h = a.size * sqrt(3) / 2;
      triangle(
        a.x - camera_x, a.y - camera_y + h / 3,
        a.x - camera_x - a.size / 2, a.y - camera_y - h * 2 / 3,
        a.x - camera_x + a.size / 2, a.y - camera_y - h * 2 / 3
      );
    }
  }

  // Draw player (blue blob)
  fill(0, 0, 255);
  ellipse(player_x - camera_x, player_y - camera_y, player_size);

  // Draw aim (red circle that follows transition path)
  fill(255, 0, 0);
  ellipse(aim_x - camera_x, aim_y - camera_y, 10);
  
  // Visual indicator when aim is overlapping (charging to shoot)
  if (aim_overlap_time > 0) {
    // Show a growing circle based on how close to shooting
    let chargeProgress = (millis() - aim_overlap_time) / aim_shoot_delay;
    let chargeSize = 15 * chargeProgress;
    stroke(255, 0, 0);
    noFill();
    ellipse(aim_x - camera_x, aim_y - camera_y, 10 + chargeSize);
    noStroke();
  }
  
  pop();

  // Draw UI (energy and seconds survived)
  fill(0);
  textSize(16);
  textAlign(LEFT, TOP);
  text("Energy: " + energy, 10, 10);
  text("Time: " + score + " s", 10, 30);
}