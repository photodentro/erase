/*
Copyright (C) 2018 Alkis Georgopoulos <alkisg@gmail.com>.
SPDX-License-Identifier: CC-BY-SA-4.0
*/
var act = null;  // activity object, see initActivity()

function onError(message, source, lineno, colno, error) {
  alert(sformat('Σφάλμα προγραμματιστή!\n'
    + 'message: {}\nsource: {}\nlineno: {}\ncolno: {}\nerror: {}',
  message, source, lineno, colno, error));
}

// ES6 string templates don't work in old Android WebView
function sformat(format) {
  var args = arguments;
  var i = 0;
  return format.replace(/{(\d*)}/g, function sformatReplace(match, number) {
    i += 1;
    if (typeof args[number] !== 'undefined') {
      return args[number];
    }
    if (typeof args[i] !== 'undefined') {
      return args[i];
    }
    return match;
  });
}

function ge(element) {
  return document.getElementById(element);
}

function onResize(event) {
  var w = window.innerWidth;
  var h = window.innerHeight;
  if (w / h < 640 / 360) {
    document.body.style.fontSize = sformat('{}px', 10 * w / 640);
  } else {
    document.body.style.fontSize = sformat('{}px', 10 * h / 360);
  }
}

function doPreventDefault(event) {
  event.preventDefault();
}

function onHome(event) {
  window.history.back();
}

function onHelp(event) {
  ge('help').style.display = 'flex';
  ge('helpaudio').play();
}

function onHelpHide(event) {
  ge('help').style.display = '';
}

function onAbout(event) {
  window.open('credits/index_DS_II.html');
}

function onFullScreen(event) {
  var doc = window.document;
  var docEl = doc.documentElement;
  var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen
    || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
  var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen
    || doc.webkitExitFullscreen || doc.msExitFullscreen;

  if (!doc.fullscreenElement && !doc.mozFullScreenElement
    && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
    requestFullScreen.call(docEl);
  } else {
    cancelFullScreen.call(doc);
  }
}

function onPrevious(event) {
  initLevel(act.level - 1);
}

function onNext(event) {
  initLevel(act.level + 1);
}

function drawLine(pt1, pt2) {
  var ctm;  // context for maincanvas
  var ctt;  // context for thumbcanvas
  var sum = 0;  // sum of all thumbcanvas alpha channel bytes
  var i;
  var method = 1;
  var imd;
  var percent;

  if (pt1.x === -1 || pt1.y === -1) {
    // This means there was no mouseover event before mousemove
    return;
  }
  ctm = act.canvas.getContext('2d');
  ctm.globalCompositeOperation = 'destination-out';
  ctm.beginPath();
  ctm.lineWidth = 50;
  ctm.lineCap = 'round';
  ctm.shadowBlur = 20;
  ctm.shadowColor = 'rgb(0,0,0)';
  ctm.strokeStyle = 'rgba(0,0,0,1)';
  ctm.moveTo(pt1.x, pt1.y);
  ctm.lineTo(pt2.x, pt2.y);
  ctm.stroke();

  ctt = act.thumb.getContext('2d');
  // drawImage is a bit slow on Android WebView
  if (method === 1) {
    ctt.globalCompositeOperation = 'source-over';
    ctt.beginPath();
    ctt.lineWidth = 1;
    ctt.strokeStyle = 'rgb(255,255,255)';
    ctt.moveTo(pt1.x / 100, pt1.y / 100);
    ctt.lineTo(pt2.x / 100, pt2.y / 100);
    ctt.stroke();
  } else if (method === 2) {
    ctt.globalCompositeOperation = 'copy';
    ctt.drawImage(act.canvas, 0, 0, ctt.canvas.width, ctt.canvas.height);
  } else {
    ctt.globalCompositeOperation = 'copy';
    ctt.drawImage(act.canvas, 0, 0, ctt.canvas.width, ctt.canvas.height);
    ctt.globalCompositeOperation = 'source-out';
    ctt.fillStyle = '#ffffff';
    ctt.fillRect(0, 0, ctt.canvas.width, ctt.canvas.height);
  }

  imd = ctt.getImageData(0, 0, ctt.canvas.width, ctt.canvas.height);
  // We only count the alpha channel
  for (i = 3; i < imd.data.length; i += 4) {
    sum += imd.data[i];
  }
  percent = Math.round(4 * 100 * sum / (255 * imd.data.length));
  if (method === 2) {
    percent = 100 - percent;
  }
  ge('percent').innerHTML = sformat('{}%', percent);
}

function localCoords(event) {
  return {
    x: parseInt((event.clientX - act.canvas.offsetLeft)
      * act.canvas.width / act.canvas.clientWidth, 10),
    y: parseInt((event.clientY - act.canvas.offsetTop)
      * act.canvas.height / act.canvas.clientHeight, 10),
  };
}

function onMouseOver(event) {
  act.pt = localCoords(event);
  drawLine(act.pt, act.pt);
}

function onMouseOut(event) {
  drawLine(act.pt, localCoords(event));
  act.pt = { x: -1, y: -1 };
}

function onMouseMove(event) {
  var newPt = localCoords(event);

  drawLine(act.pt, newPt);
  act.pt = newPt;
}

function touchToMouseEvent(event, strMouseEvent) {
  var mouseEvent;

  if (strMouseEvent !== 'mouseup') {
    act.mouseX = event.touches[0].clientX;
    act.mouseY = event.touches[0].clientY;
  }
  mouseEvent = new MouseEvent(strMouseEvent, {
    clientX: act.mouseX,
    clientY: act.mouseY,
  });
  act.canvas.dispatchEvent(mouseEvent);
}

function onTouchStart(event) {
  touchToMouseEvent(event, 'mousedown');
}

function onTouchMove(event) {
  touchToMouseEvent(event, 'mousemove');
}

function onTouchEnd(event) {
  touchToMouseEvent(event, 'mouseup');
}

function initLevel(newLevel) {
  // Internal level number is zero-based; but we display it as 1-based.
  // We allow/fix newLevel if it's outside its proper range.
  var numLevels = 4;
  var ctc;
  var ctt;

  act.level = (newLevel + numLevels) % numLevels;
  ctc = act.canvas.getContext('2d');
  ctc.globalCompositeOperation = 'copy';
  ctc.globalAlpha = act.alphas[act.level];
  ge('mainCanvas').style.backgroundImage = sformat('url(resource/background{}.jpg)', act.level);
  ge('thumbCanvas').style.backgroundImage = ge('mainCanvas').style.backgroundImage;
  ctc.drawImage(act.foregrounds[act.level], 0, 0, ctc.canvas.width, ctc.canvas.height);
  ctt = act.thumb.getContext('2d');
  ctt.globalCompositeOperation = 'copy';
  ctt.clearRect(0, 0, ctt.canvas.width, ctt.canvas.height);
  ge('percent').innerHTML = '0%';
  ge('level').innerHTML = act.level + 1;
}

function initActivity() {
  var i;

  act = {
    level: 0,
    pt: { x: -1, y: -1 },
    thumb: ge('thumbCanvas'),
    canvas: ge('mainCanvas'),
    alphas: [0.8, 1, 1],
    backgrounds: [],
    foregrounds: [],
    mouseX: 0,  // The ontouchend event doesn't contain any coords,
    mouseY: 0,  // so we keep the last ontouchmove ones.
  };
  onResize();
  // Image preloading
  for (i = 0; i < 4; i += 1) {
    act.backgrounds.push(new Image());
    act.backgrounds[i].src = sformat('resource/background{}.jpg', i);
    act.foregrounds.push(new Image());
    act.foregrounds[i].src = sformat('resource/foreground{}.jpg', i);
  }
  ge('foreground').src = act.foregrounds[1].src;
  ge('mainCanvas').onmouseover = onMouseOver;
  ge('mainCanvas').onmouseout = onMouseOut;
  ge('mainCanvas').onmousemove = onMouseMove;
  ge('mainCanvas').ontouchstart = onTouchStart;
  ge('mainCanvas').ontouchmove = onTouchMove;
  ge('mainCanvas').ontouchend = onTouchEnd;
  document.body.onresize = onResize;
  document.body.oncontextmenu = doPreventDefault;
  ge('bar_home').onclick = onHome;
  ge('bar_help').onclick = onHelp;
  ge('help').onclick = onHelpHide;
  ge('bar_about').onclick = onAbout;
  ge('bar_fullscreen').onclick = onFullScreen;
  ge('bar_previous').onclick = onPrevious;
  ge('bar_next').onclick = onNext;
  for (i = 0; i < document.images.length; i += 1) {
    document.images[i].ondragstart = doPreventDefault;
  }
  initLevel(act.level);
}

window.onerror = onError;
window.onload = initActivity;
// Call onResize even before the images are loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onResize);
} else {  // `DOMContentLoaded` already fired
  onResize();
}
