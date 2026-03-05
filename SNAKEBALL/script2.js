let startTime;
const gameOverBox = document.getElementById("gameOverBox");
const timeAliveEl = document.getElementById("timeAlive");
const finalScoreEl = document.getElementById("finalScore");
const finalHighScoreEl = document.getElementById("finalHighScore");


const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CELL = 20;
const COLS = 20;
const ROWS = 20;

canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;

let snake;
let direction;
let nextDirection;
let food;
let score;
let highScore = localStorage.getItem("nokiaHighScore") || 0;
let speed;
let gameInterval;


/* MOBILE TOUCH CONTROLS  */

document.addEventListener("touchstart", handleTouchStart);
document.addEventListener("touchmove", handleTouchMove);

let xStart = null;
let yStart = null;

    function handleTouchStart(event){
        const touch = event.touches[0];
        xStart = touch.clientX;
        yStart = touch.clientY;
   }

   function handleTouchMove(event){

        if(!xStart || !yStart) return;

        let xEnd = event.touches[0].clientX;
        let yEnd = event.touches[0].clientY;

        let xDiff = xStart - xEnd;
        let yDiff = yStart - yEnd;

        if(Math.abs(xDiff) > Math.abs(yDiff)){

            if(xDiff > 0){
                nextDirection = {x:-1,y:0};   // LEFT
            } 
            else{
                nextDirection = {x:1,y:0};    // RIGHT
            }

        } 
        else{

            if(yDiff > 0){
                nextDirection = {x:0,y:-1};   // UP
            }  
            else{
                nextDirection = {x:0,y:1};    // DOWN
            }

        }

         xStart = null;
         yStart = null;
    }

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
highScoreEl.textContent = highScore;

function initGame() {
    snake = [{ x: 10, y: 10 }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    speed = 120;

    food = randomFood();
    updateScore();

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, speed);
    startTime = Date.now();
gameOverBox.classList.add("hidden");
}

function randomFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * COLS),
            y: Math.floor(Math.random() * ROWS)
        };
    } while (snake.some(s => s.x === newFood.x && s.y === newFood.y));

    return newFood;
}

function gameLoop() {
    moveSnake();
    if (checkCollision()) {
        gameOver();
        return;
    }
    draw();
}
function moveSnake() {
    direction = nextDirection;

    let head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    // ✅ Wrap Around Logic
    if (head.x < 0) head.x = COLS - 1;
    if (head.x >= COLS) head.x = 0;
    if (head.y < 0) head.y = ROWS - 1;
    if (head.y >= ROWS) head.y = 0;

    snake.unshift(head);

    // Eat food
    if (head.x === food.x && head.y === food.y) {
        score += 10;

        if (speed > 60) {
            speed -= 5;
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, speed);
        }

        food = randomFood();
    } else {
        snake.pop();
    }

    updateScore();
}
function checkCollision() {
    const head = snake[0];

    // ❌ Remove wall collision
    // Only self collision

    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }

    return false;
}

function draw() {
    // 🖤 Black Background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 🟩 Draw Grid
    ctx.strokeStyle = "#111111";   // grid color (dark gray)
    ctx.lineWidth = 1;

    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL, 0);
        ctx.lineTo(i * CELL, canvas.height);
        ctx.stroke();
    }

    for (let j = 0; j <= ROWS; j++) {
        ctx.beginPath();
        ctx.moveTo(0, j * CELL);
        ctx.lineTo(canvas.width, j * CELL);
        ctx.stroke();
    }

    // 🟢 Draw Snake (Dark Green)
    // 🟢 Draw Snake (Block Style with Eyes)

snake.forEach((segment, index) => {

    const x = segment.x * CELL;
    const y = segment.y * CELL;

    // Head different color
    if (index === 0) {
        ctx.fillStyle = "#00aa00";  // brighter green head
    } else {
        ctx.fillStyle = "#006400";  // dark green body
    }

    // Draw block with small padding (block effect)
    ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);

    // 🟢 Draw Eyes on Head
    if (index === 0) {
        ctx.fillStyle = "black";

        const eyeSize = 3;

        if (direction.x === 1) { // moving right
            ctx.fillRect(x + CELL - 6, y + 5, eyeSize, eyeSize);
            ctx.fillRect(x + CELL - 6, y + CELL - 8, eyeSize, eyeSize);
        }
        else if (direction.x === -1) { // moving left
            ctx.fillRect(x + 3, y + 5, eyeSize, eyeSize);
            ctx.fillRect(x + 3, y + CELL - 8, eyeSize, eyeSize);
        }
        else if (direction.y === -1) { // moving up
            ctx.fillRect(x + 5, y + 3, eyeSize, eyeSize);
            ctx.fillRect(x + CELL - 8, y + 3, eyeSize, eyeSize);
        }
        else if (direction.y === 1) { // moving down
            ctx.fillRect(x + 5, y + CELL - 6, eyeSize, eyeSize);
            ctx.fillRect(x + CELL - 8, y + CELL - 6, eyeSize, eyeSize);
        }
    }
});

    // 🔴 Draw Food (Small Circular Red Ball)
    const centerX = food.x * CELL + CELL / 2;
    const centerY = food.y * CELL + CELL / 2;
    const radius = CELL / 4;

    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
}
function updateScore() {
    scoreEl.textContent = score;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("nokiaHighScore", highScore);
    }

    highScoreEl.textContent = highScore;
}
function gameOver() {
    clearInterval(gameInterval);

    const survivalTime = Math.floor((Date.now() - startTime) / 1000);

    timeAliveEl.textContent = survivalTime;
    finalScoreEl.textContent = score;
    finalHighScoreEl.textContent = highScore;

    gameOverBox.classList.remove("hidden");
}
function restartGame() {
    initGame();
}

document.addEventListener("keydown", e => {
    if (e.key === "Enter") {
    restartGame();
}
    switch (e.key) {
        case "ArrowUp":
        case "w":
            if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
            break;
        case "ArrowDown":
        case "s":
            if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
            break;
        case "ArrowLeft":
        case "a":
            if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
            break;
        case "ArrowRight":
        case "d":
            if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
            break;
    }
});

// Start game automatically
initGame();