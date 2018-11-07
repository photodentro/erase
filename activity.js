/*
Copyright (C) 2018 Alkis Georgopoulos <alkisg@gmail.com>.
SPDX-License-Identifier: CC-BY-SA-4.0
*/
var act = null;  // activity object, see initActivity()

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

function onPrevious(event) {
  initActivity();
}

function onNext(event) {
  initActivity();
}

function onToggleFullScreen(event) {
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

function onHome(event) {
  window.history.back();
}

function onHelp(event) {
  alert('Κουνήστε το ποντίκι πάνω από την εικόνα για να αποκαλύψετε το φόντο της.');
}

function onAbout(event) {
  window.open('credits/index_DS_II.html');
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
  if (act) {
    act.pt = localCoords(event);
    drawLine(act.pt, act.pt);
  }
}

function onMouseOut(event) {
  if (act) {
    drawLine(act.pt, localCoords(event));
    act.pt = { x: -1, y: -1 };
  }
}

function onMouseMove(event) {
  var newPt = localCoords(event);

  drawLine(act.pt, newPt);
  act.pt = newPt;
}

function touchToMouseEvent(event, strMouseEvent) {
  var touch = event.touches[0];
  var mouseEvent = new MouseEvent(strMouseEvent, {
    clientX: touch.clientX,
    clientY: touch.clientY,
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

function onResize() {
  var w = window.innerWidth;
  var h = window.innerHeight;
  if (w / h < 640 / 360) {
    document.body.style.fontSize = sformat('{}px', 10 * w / 640);
  } else {
    document.body.style.fontSize = sformat('{}px', 10 * h / 360);
  }
}

function addEvents() {
  document.body.onresize = onResize;
  ge('bar_previous').onclick = onPrevious;
  ge('bar_next').onclick = onNext;
  ge('bar_home').onclick = onHome;
  ge('bar_fullscreen').onclick = onToggleFullScreen;
  ge('bar_help').onclick = onHelp;
  ge('bar_about').onclick = onAbout;
  ge('mainCanvas').onmouseover = onMouseOver;
  ge('mainCanvas').onmouseout = onMouseOut;
  ge('mainCanvas').onmousemove = onMouseMove;
  ge('mainCanvas').ontouchstart = onTouchStart;
  ge('mainCanvas').ontouchmove = onTouchMove;
  ge('mainCanvas').ontouchend = onTouchEnd;
}

function initActivity() {
  var ctc;
  var ctt;
  var img;

  if (!act) {  // first run
    addEvents();
  }
  act = {
    pt: { x: -1, y: -1 },
    thumb: ge('thumbCanvas'),
    canvas: ge('mainCanvas'),
  };
  ctc = act.canvas.getContext('2d');
  ctc.globalCompositeOperation = 'copy';
  ctc.globalAlpha = 0.8;
  img = ge('foreground');
  ctc.drawImage(img, 0, 0, ctc.canvas.width, ctc.canvas.height);
  ctt = act.thumb.getContext('2d');
  ctt.globalCompositeOperation = 'copy';
  ctt.clearRect(0, 0, ctt.canvas.width, ctt.canvas.height);
  ge('percent').innerHTML = '0%';
  onResize();
}

window.onload = initActivity;
