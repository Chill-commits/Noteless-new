let userInput = localStorage.getItem('noteless_content') || "Chúc mừng bạn đã hoàn thành kỳ thi!"; 
let cursorPos = userInput.length; 
let scrollY = 0;
let targetScrollY = 0;
let padding = 50;
let fontSize = 32;
let isMaximized = false;
let lastClickTime = 0; // Khai báo chuẩn biến hỗ trợ đếm click

var nw = require('nw.gui'); 
var win = nw.Window.get();

function setup() {
  let c = createCanvas(windowWidth, windowHeight);
  c.parent('noteless-container');
  pixelDensity(1);
  textFont('Cool Jazz');
  window.addEventListener('keydown', handleKeyDown);
  
  // Lắng nghe sự kiện phóng to của cửa sổ để cập nhật lại Canvas
  win.on('maximize', () => { isMaximized = true; updateLayout(); });
  win.on('restore', () => { isMaximized = false; updateLayout(); });
}

// Hàm bổ trợ để ép Canvas cập nhật chuẩn xác
function updateLayout() {
  setTimeout(() => {
    resizeCanvas(window.innerWidth, window.innerHeight);
  }, 100); // Đợi 100ms để cửa sổ ổn định kích thước rồi mới tính lại tọa độ
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Hàm matchClicks sửa lỗi ReferenceError triệt để
function matchClicks(count) {
  let currentTime = millis();
  if (currentTime - lastClickTime < 300) { 
    lastClickTime = 0; 
    return true; 
  }
  lastClickTime = currentTime;
  return false;
}

function draw() {
  clear();
  scrollY = lerp(scrollY, targetScrollY, 0.1);
  textSize(fontSize);
  
  let textWidthLimit = width - (padding * 2); 
  
  push();
  translate(0, scrollY);
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  textWrap(WORD);

  let textCursor = (floor(frameCount / 30) % 2 === 0) ? "|" : " ";
  let displayContent = userInput.slice(0, cursorPos) + textCursor + userInput.slice(cursorPos);
  
  text(displayContent, padding, padding, textWidthLimit); 
  pop();
}

function handleKeyDown(e) {
  if (e.key === 'ArrowLeft') { cursorPos = max(0, cursorPos - 1); e.preventDefault(); }
  if (e.key === 'ArrowRight') { cursorPos = min(userInput.length, cursorPos + 1); e.preventDefault(); }
  
  if (e.key === 'Backspace') {
    if (cursorPos > 0) {
      userInput = userInput.slice(0, cursorPos - 1) + userInput.slice(cursorPos);
      cursorPos--;
    }
  }
  else if (e.key === 'Enter') {
    userInput = userInput.slice(0, cursorPos) + '\n' + userInput.slice(cursorPos);
    cursorPos++;
  }
  else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
    userInput = userInput.slice(0, cursorPos) + e.key + userInput.slice(cursorPos);
    cursorPos++;
  }
  
  if (e.ctrlKey) {
    if (e.key === '=' || e.key === '+') fontSize += 2;
    if (e.key === '-' || e.key === '_') fontSize = max(12, fontSize - 2);
  }

  localStorage.setItem('noteless_content', userInput);
}

function mousePressed() {
  // Xử lý Double Click và Alt + Drag di chuyển cửa sổ
  if (mouseButton === LEFT && matchClicks(2)) {
    isMaximized ? win.restore() : win.maximize();
    return;
  }
  if (keyIsDown(ALT)) { win.window.startDrag(); return; }

  // Tính toán tọa độ chuột chuẩn xác dựa theo kích thước Canvas
  let canvasElement = document.querySelector('canvas');
  if (!canvasElement) return;
  let rect = canvasElement.getBoundingClientRect();
  
  let relativeX = (window.event.clientX - rect.left) - padding;
  let relativeY = (window.event.clientY - rect.top) - padding - scrollY;

  let lineHeight = fontSize * 1.2;
  let textWidthLimit = width - (padding * 2);
  
  // Đồng bộ hoàn toàn cách ngắt dòng bằng dấu cách giống hàm draw()
  let words = userInput.split(' ');
  let lines = [];
  let currentLine = "";
  
  for (let w of words) {
    if (textWidth(currentLine + " " + w) < textWidthLimit) {
      currentLine += (currentLine === "" ? "" : " ") + w;
    } else {
      lines.push(currentLine);
      currentLine = w;
    }
  }
  lines.push(currentLine);

  let clickedRow = floor(relativeY / lineHeight);
  
  // Xác định vị trí con trỏ ký tự dựa trên hàng và cột đo đạc thực tế
  if (clickedRow >= 0 && clickedRow < lines.length) {
    let line = lines[clickedRow];
    let accumulatedWidth = 0;
    
    for (let i = 0; i < line.length; i++) {
      let w = textWidth(line[i]);
      if (accumulatedWidth + w / 2 > relativeX) {
        cursorPos = getPosFromRowCol(lines, clickedRow, i);
        return;
      }
      accumulatedWidth += w;
    }
    cursorPos = getPosFromRowCol(lines, clickedRow, line.length);
  } else if (clickedRow >= lines.length) {
    cursorPos = userInput.length; // Bấm dưới cùng văn bản thì nhảy về cuối
  } else {
    cursorPos = 0; // Bấm trên cùng văn bản thì nhảy về đầu
  }
}

// Hàm hỗ trợ tính toán vị trí con trỏ từ dòng và cột
function getPosFromRowCol(lines, row, col) {
  let pos = 0;
  for (let i = 0; i < row; i++) pos += lines[i].length + 1;
  return min(pos + col, userInput.length);
}

function mouseWheel(event) {
  if (keyIsDown(CONTROL)) {
    fontSize = constrain(fontSize + (event.delta > 0 ? -2 : 2), 12, 72);
  } else {
    targetScrollY = min(targetScrollY - event.delta, 0);
  }
  return false;
}

// Lắng nghe sự kiện Blur cửa sổ (Được tách độc lập ở ngoài rìa file)
win.on('blur', function() {
  document.body.style.background = "transparent"; 
  let container = document.getElementById('noteless-container');
  if (container) {
    container.style.backdropFilter = "blur(20px) saturate(180%)";
    container.style.backgroundColor = "rgba(255, 255, 255, 0.05)"; 
  }
});