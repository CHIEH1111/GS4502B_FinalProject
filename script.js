// ✅ Firebase 初始化
const firebaseConfig = {
  apiKey: "AIzaSyAPJWlzrgFRHOIVuDw6NFQXvhPacLW3mC4",
  authDomain: "runaway-b573b.firebaseapp.com",
  projectId: "runaway-b573b",
  storageBucket: "runaway-b573b.firebasestorage.app",
  messagingSenderId: "871394666363",
  appId: "1:871394666363:web:04758a9a6eba5117ec7fde",
  measurementId: "G-CP3CHMSQX2"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 🎮 初始化 Canvas 與圖像資源
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const spriteSheet = new Image();
spriteSheet.src = "assets/female_tilesheet.png";

const obstacleImage = new Image();
obstacleImage.src = "assets/fire.png";

// 🌳 森林背景圖層
const bgBack = new Image();
bgBack.src = "assets/parallax-forest-back-trees.png";
const bgMid = new Image();
bgMid.src = "assets/parallax-forest-middle-trees.png";
const bgLight = new Image();
bgLight.src = "assets/parallax-forest-lights.png";
const bgFront = new Image();
bgFront.src = "assets/parallax-forest-front-trees.png";

// 🏔️ 山區背景圖層
const bg2Back = new Image();
bg2Back.src = "assets/parallax-mountain-bg.png";
const bg2Mid = new Image();
bg2Mid.src = "assets/parallax-mountain-montain-far.png";
const bg2Mountain = new Image();
bg2Mountain.src = "assets/parallax-mountain-mountains.png";
const bg2Trees = new Image();
bg2Trees.src = "assets/parallax-mountain-trees.png";
const bg2Front = new Image();
bg2Front.src = "assets/parallax-mountain-foreground-trees.png";

// 🏜️ 沙漠背景圖層（第三套）
const bgDesert1 = new Image(); bgDesert1.src = "assets/desert_0000_Layer-1.png";
const bgDesert2 = new Image(); bgDesert2.src = "assets/desert_0001_Layer-2.png";
const bgDesert3 = new Image(); bgDesert3.src = "assets/desert_0002_Layer-3.png";
const bgDesert4 = new Image(); bgDesert4.src = "assets/desert_0003_Layer-4.png";
const bgDesert5 = new Image(); bgDesert5.src = "assets/desert_0004_Layer-4-copy.png";
const bgDesertBack = new Image(); bgDesertBack.src = "assets/desert_0005_Background.png";


let hasShownGameOverScreen = false; // 👈 這行要放在全域宣告區（程式最上面）
let hasAnsweredQuiz = false; // ✅ 是否已回答選擇題

// 🧍 玩家設定
let player = {
  x: 50,
  y: 300,
  width: 60,
  height: 90,
  dy: 0,
  gravity: 0.5,
  jumpPower: -10,
  isJumping: false
};

// 📊 遊戲狀態與分數變數
let groundY = canvas.height;
let score = 0;
let isGameOver = false;
let gameStarted = false;
let bgScroll = 0;
let currentBg = "forest";

// 🖼️ 動畫設定
const frameWidth = 80;
const frameHeight = 110;
let currentFrame = 0;
let frameTick = 0;
const frameDelay = 5;
let currentAnimation = "run";

const animationRows = {
  run: 0,
  jump: 1,
  dead: 2,
};

const animationLengths = {
  run: 9,
  jump: 9,
  dead: 9,
};

// 🔥 障礙物資料
let obstacles = [];

// 🌄 繪製背景（森林 / 山區 / 沙漠）
function drawParallaxBackground() {
  bgScroll -= 2;
  const loopWidth = 272;

  const forestLayers = [
    { img: bgBack, speed: 0.2 },
    { img: bgMid, speed: 0.5 },
    { img: bgLight, speed: 0.3 },
    { img: bgFront, speed: 0.8 },
  ];

  const mountainLayers = [
    { img: bg2Back, speed: 0.2 },
    { img: bg2Mid, speed: 0.3 },
    { img: bg2Mountain, speed: 0.4 },
    { img: bg2Trees, speed: 0.6 },
    { img: bg2Front, speed: 0.8 },
  ];

  const desertLayers = [
    { img: bgDesertBack, speed: 0.1 },
    { img: bgDesert5, speed: 0.2 },
    { img: bgDesert4, speed: 0.3 },
    { img: bgDesert3, speed: 0.4 },
    { img: bgDesert2, speed: 0.6 },
    { img: bgDesert1, speed: 0.8 },
  ];

  let layers;
  if (currentBg === "forest") layers = forestLayers;
  else if (currentBg === "mountain") layers = mountainLayers;
  else layers = desertLayers;

  for (const layer of layers) {
    const offset = (bgScroll * layer.speed) % loopWidth;
    for (let x = -loopWidth; x < canvas.width; x += loopWidth) {
      ctx.drawImage(layer.img, x + offset, 0, loopWidth, canvas.height);
    }
  }
}


// 🧍‍♀️ 繪製角色動畫
function drawPlayer() {
  const row = animationRows[currentAnimation];
  const totalFrames = animationLengths[currentAnimation];
  const sx = currentFrame * frameWidth;
  const sy = row * frameHeight;

  ctx.drawImage(spriteSheet, sx, sy, frameWidth, frameHeight, player.x, player.y, player.width, player.height);

  frameTick++;
  if (frameTick >= frameDelay) {
    frameTick = 0;
    currentFrame = (currentFrame + 1) % totalFrames;
  }
}

// 🔥 繪製所有障礙物
function drawObstacles() {
  for (let obs of obstacles) {
    ctx.drawImage(obstacleImage, obs.x, obs.y, obs.width, obs.height);
  }
}

// 🔄 更新障礙物位置與新增
function updateObstacles() {
  for (let obs of obstacles) obs.x -= 4;
  obstacles = obstacles.filter(obs => obs.x + obs.width > 0);

  const last = obstacles[obstacles.length - 1];
  const canAddNew = !last || canvas.width - (last.x + last.width) > player.width + 80;

  if (canAddNew) {
    const maxGroupWidth = 100; // ✅ 最大寬度限制（含間距）
    let currentX = canvas.width;
    let totalWidth = 0;

    for (let i = 0; i < 3; i++) { // 最多試著生成 3 個
      const sizeOption = Math.floor(Math.random() * 3);
      let height = [40, 60, 90][sizeOption];
      let width = height * 0.8;
      const gap = 10;

      // ❗ 判斷這個火焰加進來後，總寬度是否超過限制
      if (totalWidth + width + (i > 0 ? gap : 0) > maxGroupWidth) break;

      // ➕ 計算新的 x 位置（如果不是第一個，就加上間距）
      if (i > 0) currentX += gap;

      obstacles.push({
        x: currentX,
        y: groundY - height + 9, // ✅ 火焰位置稍微往上調整
        width: width,
        height: height
      });

      currentX += width;       // 向右推進
      totalWidth += width + (i > 0 ? gap : 0); // 更新總寬度
    }

  }
}

// 💥 碰撞偵測與 Game Over 處理
function detectCollision() {
  if (isGameOver || hasShownGameOverScreen) return;
  for (let obs of obstacles) {
    const padding = 26; // ✅ 碰撞偵測的邊界緩衝區
    if (
      player.x + padding < obs.x + obs.width &&
      player.x + player.width - padding > obs.x &&
      player.y + padding < obs.y + obs.height &&
      player.y + player.height - padding > obs.y
    ) {
      isGameOver = true;
      currentAnimation = "dead";
      hasShownGameOverScreen = true;

      setTimeout(() => {
        // ✅ 顯示選擇題
        document.getElementById("quiz-screen").style.display = "flex";
      }, 200);
      break;
    }
  }
}

// ✅ 選擇題按鈕事件
const quizButtons = document.querySelectorAll(".quiz-btn");
quizButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const choice = btn.getAttribute("data-choice");

    if (choice === "jifu") {
      score = Math.max(0, score - 50); // ✅ 扣 50 分但不低於 0
      alert("你選了雞佛，扣 50 分喔🥹");
    }else{
      alert("俞佛愛你❤️");
    }

    // ✅ 關閉選擇題，顯示 Game Over 輸入框
    document.getElementById("quiz-screen").style.display = "none";
    document.getElementById("final-score").textContent = score;
    document.getElementById("game-over-screen").style.display = "flex";
    hasAnsweredQuiz = true;
  });
});

// ⏱️ 主遊戲更新迴圈（每一幀都會呼叫這個函數來重新繪製畫面與更新邏輯）
function update() {

  const cycle = Math.floor(score / 500) % 3;
  if (cycle === 0) currentBg = "forest";
  else if (cycle === 1) currentBg = "mountain";
  else currentBg = "desert";

  // ✅ 清空整個畫布，準備重新繪製新一幀內容
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 🌄 繪製背景（根據當前分數決定使用森林或山區背景）
  drawParallaxBackground();

  // ⏸️ 如果遊戲尚未開始（尚未按下開始按鈕），就停止更新角色與障礙物，只重繪背景
  if (!gameStarted) {
    requestAnimationFrame(update); // 繼續執行下一幀
    return; // 提早結束本次 update 執行
  }

  // 🧍‍♀️ 繪製玩家角色（根據目前動畫狀態）
  drawPlayer();

  // 🔥 繪製障礙物（例如火焰）
  drawObstacles();

  // ⬇️ 將重力加到角色身上，模擬自由落體
  player.dy += player.gravity;

  // 🧍 更新角色的垂直位置（根據速度變化）
  player.y += player.dy;

  // 🧍‍♀️ 如果角色碰到地面，就讓他停下來（不繼續往下掉）
  if (player.y + player.height >= groundY) {
    player.y = groundY - player.height; // 確保站在地面上
    player.dy = 0; // 垂直速度歸零
    player.isJumping = false; // 標記為沒有跳躍中
  }

  // 🎞️ 根據角色狀態切換動畫：死亡、跳躍、或奔跑
  currentAnimation = isGameOver
    ? "dead"                // 如果已經 Game Over，顯示死亡動畫
    : player.dy !== 0
    ? "jump"                // 如果正在跳躍（有垂直速度），顯示跳躍動畫
    : "run";                // 否則顯示奔跑動畫

  // 🔄 更新障礙物（移動、生成、刪除離開畫面外的）
  updateObstacles();

  // 💥 檢查是否有碰撞（如果有就進入 Game Over 狀態）
  detectCollision();

  // ➕ 分數累加（每幀 +1，但只有在未 Game Over 時才加）
if (!isGameOver) score++;

// 📊 更新畫面上的分數顯示
document.getElementById("score").textContent = "Score: " + score;

  // 🔁 再次請求下一幀畫面（進入無限循環）
  requestAnimationFrame(update);
}


// ⌨️ 按下空白鍵跳躍
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !player.isJumping && !isGameOver && gameStarted) {
    player.dy = player.jumpPower;
    player.isJumping = true;
  }
});

// 🟢 開始按鈕啟動遊戲
document.getElementById("start-button").addEventListener("click", () => {
  document.getElementById("start-screen").style.display = "none";
  gameStarted = true;
});

// 📝 送出分數按鈕（寫入 Firebase，並重設遊戲狀態）
document.getElementById("submit-score").addEventListener("click", async () => {
 // console.log("送出按鈕被點擊了");
  // 🧑 取得玩家輸入的名字，並去除前後空白字元
  const name = document.getElementById("player-name").value.trim();

  // ⚠️ 如果名字是空的，就跳出提示並中止送出流程
  if (name === "") return alert("請輸入姓名");

  try {
    // ✅ 將玩家資料寫入 Firebase 的 leaderboard 集合
    await db.collection("leaderboard").add({
      name: name,                             // 玩家名字
      score: score,                           // 玩家得分
      timestamp: firebase.firestore.FieldValue.serverTimestamp()  // 伺服器時間戳
    });

    // ✅ 資料送出成功後，關閉 Game Over 畫面
    document.getElementById("game-over-screen").style.display = "none";
    console.log("✅ 成功寫入");
    document.getElementById("start-screen").style.display = "flex";

    // 🧹 清空輸入框內容
    document.getElementById("player-name").value = "";

    // 🔄 重設遊戲狀態（方便玩家重新開始）
    score = 0;                // 分數歸零
    isGameOver = false;       // 取消 Game Over 狀態
    hasShownGameOverScreen = false;
    hasAnsweredQuiz = false;  // 取消選擇題回答狀態
    gameStarted = false;      // 等待重新開始遊戲
    player.y = 300;           // 將角色重設回原始位置
    player.dy = 0;            // 垂直速度歸零
    obstacles = [];           // 清空障礙物列表
    currentBg = "forest";     // 背景重設為森林（不是山區）
    currentFrame = 0;         // 動畫影格重置
    currentAnimation = "run"; // 動畫狀態回到奔跑

  } catch (err) {
    // ❌ 如果寫入資料失敗，輸出錯誤訊息並跳出警告
    console.error("上傳失敗", err);
    alert("成績儲存失敗，請稍後再試");
  }
});


// 🔁 開始執行遊戲迴圈
update();

// 📊 查看排行榜按鈕事件
document.getElementById("view-leaderboard").addEventListener("click", async () => {
  const popup = document.getElementById("leaderboard-popup");
  const list = document.getElementById("popup-leaderboard-list");
  list.innerHTML = ""; // 清空舊資料

  try {
    const querySnapshot = await db.collection("leaderboard")
      .orderBy("score", "desc")
      .orderBy("timestamp", "asc")
      .limit(10)
      .get();

    let i = 0;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const time = data.timestamp?.toDate()?.toLocaleString() || "無時間";

      const li = document.createElement("li");
      li.innerHTML = `
        <span class="rank">#${++i}</span>
        <span class="name">${data.name || "匿名玩家"}</span>
        <span class="score">${data.score} 分</span>
        <span class="time">${time}</span>
      `;
      list.appendChild(li);
    });



    //popup.classList.remove("hidden");
    popup.style.display = "flex";
  } catch (err) {
    console.error("讀取排行榜失敗", err);
    alert("無法讀取排行榜，請稍後再試");
  }
});

// 📕 關閉排行榜按鈕事件
/*document.getElementById("close-leaderboard").addEventListener("click", () => {
  document.getElementById("leaderboard-popup").classList.add("hidden");
});*/
document.getElementById("close-leaderboard").addEventListener("click", () => {
  document.getElementById("leaderboard-popup").style.display = "none";
});

