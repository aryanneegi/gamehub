const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
function resizeCanvas() {
    const maxW = Math.min(window.innerWidth - 20, 760);
    const maxH = Math.min(window.innerHeight * 0.75, 580);
    canvas.width  = maxW;
    canvas.height = maxH;
}
resizeCanvas();
function getBrickLayout() {
    const cols       = canvas.width < 420 ? 6 : 10;
    const rows       = 8;
    const padding    = 6;
    const offsetLeft = canvas.width < 420 ? 10 : 35;
    const offsetTop  = 80;
    const bW = Math.floor((canvas.width - offsetLeft * 2 - padding * (cols - 1)) / cols);
    const bH = canvas.width < 420 ? 16 : 20;
    return { cols, rows, bW, bH, padding, offsetLeft, offsetTop };
}
/* GAME SOUNDS */

let brickSound    = new Audio("../sounds/hit.mp3");
let paddleSound   = new Audio("../sounds/bounce.mp3");
let wallSound     = new Audio("../sounds/bounce.mp3");
let gameOverSound = new Audio("../sounds/gameover.mp3");


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

/* MOBILE TOUCH CONTROLS FOR PADDLE */
function movePaddle(event) {
    const touch  = event.touches[0];
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const touchX = (touch.clientX - rect.left) * scaleX;
    paddleX = touchX - paddleWidth / 2;
    if (paddleX < 0) paddleX = 0;
    if (paddleX > canvas.width - paddleWidth) paddleX = canvas.width - paddleWidth;

    if (waitingForServe && serveReady) {
        balls.forEach(ball => ball.stuck = false);
        waitingForServe = false;
        serveReady      = false;
        if (!timerStarted) {
            startTime    = Date.now();
            timerStarted = true;
        }
    }
}

canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    movePaddle(e);
}, { passive: false });

document.body.addEventListener("touchmove", (e) => {
    e.preventDefault();
}, { passive: false });


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
    const { cols, rows } = getBrickLayout();
    for (let c = 0; c < cols; c++) {
        bricks[c] = [];
        for (let r = 0; r < rows; r++) {
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
    const { cols, rows, bW, bH, padding, offsetLeft, offsetTop } = getBrickLayout();
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            if (bricks[c][r].status === 1) {
                let brickX = c * (bW + padding) + offsetLeft;
                let brickY = r * (bH + padding) + offsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                ctx.fillStyle = "#00ffff";
                ctx.fillRect(brickX, brickY, bW, bH);
            }
        }
    }
}

// FIX 4: Count total active bricks first, then detect collision — prevents false win triggers
function collideWithBricks(ball) {
    const { cols, rows, bW, bH } = getBrickLayout();
    let activeBricks = 0;
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            if (bricks[c][r].status === 1) activeBricks++;
        }
    }
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            let b = bricks[c][r];
            if (b.status === 1) {
                if (
                    ball.x > b.x &&
                    ball.x < b.x + bW &&
                    ball.y > b.y &&
                    ball.y < b.y + bH
                ) {
                    ball.dy = -ball.dy;
                    brickSound.currentTime = 0;
                    brickSound.play().catch(() => {});
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
function drawServeHint() {
    if (!waitingForServe) return;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    ctx.fillText(isMobile ? "TOUCH & DRAG TO LAUNCH" : "PRESS \u2190 \u2192 TO LAUNCH",
                 canvas.width / 2, canvas.height - 50);
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

    resizeCanvas();
    paddleWidth = canvas.width < 420 ? 80 : 100;
    paddleX     = canvas.width / 2 - paddleWidth / 2;

    balls = [{
        x: paddleX + paddleWidth / 2,
        y: canvas.height - paddleHeight - 15,
        dx: 4,
        dy: -4,
        radius: 8,
        stuck: true
    }];

    waitingForServe = true;
    // serveReady = false;

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
    drawServeHint();

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
             {  wallSound.currentTime = 0;
                wallSound.play().catch(() => {});
                ball.dx = -ball.dx;
            }

            if (ball.y + ball.dy < ball.radius) {
                wallSound.currentTime = 0;
                wallSound.play().catch(() => {});
                ball.dy = -ball.dy;
            } else if (ball.y + ball.dy > canvas.height - ball.radius) {

                if (ball.x > paddleX && ball.x < paddleX + paddleWidth) {
                    paddleSound.currentTime = 0;
                    paddleSound.play().catch(() => {});
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
    if (waitingForServe && (rightPressed || leftPressed)) {
    balls.forEach(ball => ball.stuck = false);
    waitingForServe = false;
    if (!timerStarted) {
        startTime = Date.now();
        timerStarted = true;
    }
}
}

/* ---------------- GAME OVER ---------------- */

function showGameOver(isWin = false) {
    gameOverSound.currentTime = 0;
    gameOverSound.play().catch(() => {});

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