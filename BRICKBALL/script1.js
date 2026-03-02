const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

/* ---------------- BUTTON STYLE ---------------- */

function styleButton(btn, color) {
    btn.style.cssText = `
        position: absolute;
        left: 50%;
        top: 55%;
        transform: translate(-50%, -50%);
        padding: 14px 42px;
        font-size: 20px;
        font-family: 'Segoe UI', sans-serif;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: #000;
        background: ${color};
        border: none;
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 0 20px ${color}, 0 0 40px ${color}88;
        transition: 0.2s;
        z-index: 10;
    `;
}

canvas.parentElement.style.position = "relative";
styleButton(startBtn, "#00ffff");
styleButton(restartBtn, "#ff6600");

startBtn.style.display = "inline-block";
restartBtn.style.display = "none";

/* ---------------- GAME VARIABLES ---------------- */

let paddleWidth = 100;
let paddleHeight = 15;
let paddleX = canvas.width / 2 - 50;

let balls = [];
let lives = 3;
let score = 0;

let rightPressed = false;
let leftPressed = false;

// FIX 1: Use a reverseControls flag instead of swapping key states
let reverseControls = false;

let gameOver = false;
let waitingForServe = false;
let serveReady = false; // true only after keys are fully released post-life-loss

let startTime = 0;
let elapsedTime = 0;
let timerStarted = false;

let animationId;
let powerInterval;

/* ---------------- BRICKS ---------------- */

let brickRowCount = 8;
let brickColumnCount = 10;
let brickWidth = 60;
let brickHeight = 20;
let brickPadding = 10;
let brickOffsetTop = 80;
let brickOffsetLeft = 35;

let bricks = [];

function initBricks() {
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = { x: 0, y: 0, status: 1 };
        }
    }
}

/* ---------------- POWER UPS ---------------- */

let powerBall = null;
let powerTypes = ["TRIPLE", "PADDLE+", "BALL+", "REVERSE"];

function spawnPowerBall() {
    let type = powerTypes[Math.floor(Math.random() * powerTypes.length)];
    powerBall = {
        x: Math.random() * (canvas.width - 40) + 20,
        y: 0,
        radius: 15,
        type
    };
}

function applyPower(type) {

    // FIX 2: TRIPLE now spawns balls at paddle center with correct properties
    if (type === "TRIPLE") {
        let cx = paddleX + paddleWidth / 2;
        let cy = canvas.height - paddleHeight - 15;
        balls.push({ x: cx, y: cy, dx: 4,  dy: -4, radius: 8, stuck: false });
        balls.push({ x: cx, y: cy, dx: -4, dy: -4, radius: 8, stuck: false });
    }

    if (type === "PADDLE+") {
        paddleWidth += 40;
        setTimeout(() => {
            paddleWidth -= 40;
        }, 8000);
    }

    if (type === "BALL+") {
        balls.forEach(ball => {
            let newSize = ball.radius + 5;
            ball.radius = Math.min(newSize, 50);
        });
    }

    // FIX 3: REVERSE uses a flag, not swapping pressed states
    if (type === "REVERSE") {
        reverseControls = true;
        setTimeout(() => {
            reverseControls = false;
        }, 5000);
    }
}

/* ---------------- DRAW FUNCTIONS ---------------- */

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {

                let brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                let brickY = r * (brickHeight + brickPadding) + brickOffsetTop;

                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;

                ctx.fillStyle = "#00ffff";
                ctx.fillRect(brickX, brickY, brickWidth, brickHeight);
            }
        }
    }
}

// FIX 4: Count total active bricks first, then detect collision — prevents false win triggers
function collideWithBricks(ball) {
    // Count all active bricks before checking this ball's collision
    let activeBricks = 0;
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) activeBricks++;
        }
    }

    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            let b = bricks[c][r];
            if (b.status === 1) {
                if (
                    ball.x > b.x &&
                    ball.x < b.x + brickWidth &&
                    ball.y > b.y &&
                    ball.y < b.y + brickHeight
                ) {
                    ball.dy = -ball.dy;
                    b.status = 0;
                    score++;
                    activeBricks--;

                    if (activeBricks === 0) {
                        gameOver = true;
                        showGameOver(true);
                        return;
                    }
                }
            }
        }
    }
}

function drawPaddle() {
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(paddleX, canvas.height - paddleHeight - 5, paddleWidth, paddleHeight);
}

function drawHUD() {

    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Score: " + score, 20, 25);

    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(canvas.width - 30 - i * 30, 22, 8, 0, Math.PI * 2);
        ctx.fillStyle = i < lives ? "red" : "white";
        ctx.fill();
    }

    if (timerStarted && !gameOver) {
        elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    }

    ctx.textAlign = "center";
    ctx.fillText("Time: " + elapsedTime + "s", canvas.width / 2, 25);
}

function drawPowerBall() {
    if (!powerBall) return;

    ctx.beginPath();
    ctx.arc(powerBall.x, powerBall.y, powerBall.radius, 0, Math.PI * 2);
    ctx.fillStyle = "orange";
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(powerBall.type, powerBall.x, powerBall.y);

    powerBall.y += 2;

    if (
        powerBall.y + powerBall.radius > canvas.height - paddleHeight - 5 &&
        powerBall.x > paddleX &&
        powerBall.x < paddleX + paddleWidth
    ) {
        applyPower(powerBall.type);
        powerBall = null;
    }

    if (powerBall && powerBall.y > canvas.height) powerBall = null;
}

/* ---------------- CONTROLS ---------------- */

document.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") rightPressed = true;
    if (e.key === "ArrowLeft") leftPressed = true;
});

document.addEventListener("keyup", e => {
    if (e.key === "ArrowRight") rightPressed = false;
    if (e.key === "ArrowLeft") leftPressed = false;
});

/* ---------------- GAME START ---------------- */

startBtn.addEventListener("click", () => {

    startBtn.style.display = "none";
    restartBtn.style.display = "none";

    initBricks();
    lives = 3;
    score = 0;
    gameOver = false;
    reverseControls = false;

    paddleWidth = 100;
    paddleX = canvas.width / 2 - 50;

    balls = [{
        x: paddleX + paddleWidth / 2,
        y: canvas.height - paddleHeight - 15,
        dx: 4,
        dy: -4,
        radius: 8,
        stuck: true
    }];

    waitingForServe = true;
    serveReady = false;

    timerStarted = false;
    elapsedTime = 0;

    powerInterval = setInterval(() => {
        if (!gameOver) spawnPowerBall();
    }, 7000);

    draw();
});

restartBtn.addEventListener("click", () => location.reload());

/* ---------------- MAIN LOOP ---------------- */

function draw() {

    if (gameOver) return;

    animationId = requestAnimationFrame(draw);

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBricks();
    drawHUD();
    drawPowerBall();
    drawPaddle();

    // FIX 5: Iterate balls in reverse to safely splice without skipping entries
    for (let index = balls.length - 1; index >= 0; index--) {
        let ball = balls[index];

        if (ball.stuck) {
            ball.x = paddleX + paddleWidth / 2;
            ball.y = canvas.height - paddleHeight - 15;
        }

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = "red";
        ctx.fill();

        if (!ball.stuck) {

            if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius)
                ball.dx = -ball.dx;

            if (ball.y + ball.dy < ball.radius) {
                ball.dy = -ball.dy;
            } else if (ball.y + ball.dy > canvas.height - ball.radius) {

                if (ball.x > paddleX && ball.x < paddleX + paddleWidth) {
                    ball.dy = -ball.dy;
                } else {
                    balls.splice(index, 1);
                    if (balls.length === 0) {
                        lives--;
                        if (lives <= 0) {
                            gameOver = true;
                            showGameOver();
                            return;
                        } else {
                            balls.push({
                                x: paddleX + paddleWidth / 2,
                                y: canvas.height - paddleHeight - 15,
                                dx: 4,
                                dy: -4,
                                radius: 8,
                                stuck: true
                            });
                            waitingForServe = true;
                            serveReady = false; // require fresh key press to serve
                        }
                    }
                }
            }

            if (!gameOver) collideWithBricks(ball);

            ball.x += ball.dx;
            ball.y += ball.dy;
        }
    }

    // FIX 3 (continued): Apply reverseControls flag to movement
    let moveRight = reverseControls ? leftPressed : rightPressed;
    let moveLeft  = reverseControls ? rightPressed : leftPressed;

    if (moveRight && paddleX < canvas.width - paddleWidth)
        paddleX += 7;

    if (moveLeft && paddleX > 0)
        paddleX -= 7;

    // Once all keys are released after a life loss, allow serving again
    if (waitingForServe && !serveReady && !rightPressed && !leftPressed) {
        serveReady = true;
    }

    if (waitingForServe && serveReady && (rightPressed || leftPressed)) {

        balls.forEach(ball => ball.stuck = false);
        waitingForServe = false;
        serveReady = false;

        if (!timerStarted) {
            startTime = Date.now();
            timerStarted = true;
        }
    }
}

/* ---------------- GAME OVER ---------------- */

function showGameOver(isWin = false) {
    cancelAnimationFrame(animationId);
    clearInterval(powerInterval);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0.95)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = isWin ? "#00ff00" : "#ff4444";
    ctx.font = "bold 52px Arial";
    ctx.fillText(isWin ? "YOU WIN!" : "GAME OVER", canvas.width / 2, canvas.height / 2 - 80);

    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.fillText("Final Score: " + score, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText("Survival Time: " + elapsedTime + "s", canvas.width / 2, canvas.height / 2 + 15);

    let title = "";
    if (elapsedTime < 30) title = "Rookie Survivor";
    else if (elapsedTime < 60) title = "Brick Warrior";
    else if (elapsedTime < 120) title = "Brick Master";
    else title = "LEGENDARY SURVIVOR";

    ctx.font = "bold 26px Arial";
    ctx.fillStyle = "#00ffff";
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 + 60);

    restartBtn.style.display = "inline-block";
}