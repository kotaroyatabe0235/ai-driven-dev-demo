// 色紙落とし：画面と入力。規則は rules.js（IroGami）にまかせる。
(function () {
  'use strict';

  var G = window.IroGami;
  var CELL = 30;

  // 伝統色。形の番号（1〜7）に対応する。
  var COLORS = {
    1: '#2e5a87', // 藍
    2: '#c8402f', // 朱
    3: '#e0a62b', // 山吹
    4: '#7fa650', // 若草
    5: '#8a6fae', // 藤
    6: '#e5a1b0', // 桜
    7: '#8b8f96'  // 鼠
  };

  var boardCtx = document.getElementById('board').getContext('2d');
  var nextCtx = document.getElementById('next').getContext('2d');
  var elScore = document.getElementById('score');
  var elLevel = document.getElementById('level');
  var elLines = document.getElementById('lines');
  var elOver = document.getElementById('over');
  var elOverScore = document.getElementById('over-score');

  var state, acc, last;

  // 色紙のように、少し内側に明るい面をもつ 1 マスを描く。
  function drawCell(ctx, px, py, size, id) {
    ctx.fillStyle = COLORS[id];
    ctx.fillRect(px, py, size, size);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(px + 3, py + 3, size - 6, size - 6);
    ctx.strokeStyle = 'rgba(38,35,31,0.75)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
  }

  function drawGrid(ctx, cols, rows) {
    ctx.strokeStyle = 'rgba(241,233,214,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    var i;
    for (i = 1; i < cols; i++) { ctx.moveTo(i * CELL + 0.5, 0); ctx.lineTo(i * CELL + 0.5, rows * CELL); }
    for (i = 1; i < rows; i++) { ctx.moveTo(0, i * CELL + 0.5); ctx.lineTo(cols * CELL, i * CELL + 0.5); }
    ctx.stroke();
  }

  function drawBoard() {
    var ctx = boardCtx, r, c, p;
    ctx.clearRect(0, 0, state.cols * CELL, state.rows * CELL);
    ctx.fillStyle = '#1d1b18';
    ctx.fillRect(0, 0, state.cols * CELL, state.rows * CELL);
    drawGrid(ctx, state.cols, state.rows);
    for (r = 0; r < state.rows; r++) {
      for (c = 0; c < state.cols; c++) {
        if (state.board[r][c]) drawCell(ctx, c * CELL, r * CELL, CELL, state.board[r][c]);
      }
    }
    if (!state.gameOver) {
      p = state.piece;
      for (r = 0; r < p.cells.length; r++) {
        for (c = 0; c < p.cells[r].length; c++) {
          if (p.cells[r][c] && p.y + r >= 0) drawCell(ctx, (p.x + c) * CELL, (p.y + r) * CELL, CELL, p.id);
        }
      }
    }
  }

  function drawNext() {
    var ctx = nextCtx, size = 24, cells = state.next.cells, r, c;
    var w = cells[0].length * size, h = cells.length * size;
    var ox = Math.floor((120 - w) / 2), oy = Math.floor((120 - h) / 2);
    ctx.clearRect(0, 0, 120, 120);
    for (r = 0; r < cells.length; r++) {
      for (c = 0; c < cells[r].length; c++) {
        if (cells[r][c]) drawCell(ctx, ox + c * size, oy + r * size, size, state.next.id);
      }
    }
  }

  function render() {
    drawBoard();
    drawNext();
    elScore.textContent = state.score;
    elLevel.textContent = state.level;
    elLines.textContent = state.lines;
    elOver.hidden = !state.gameOver;
    elOverScore.textContent = state.score;
  }

  function restart() {
    state = G.createGame();
    acc = 0;
    last = null;
    render();
  }

  function frame(now) {
    if (last === null) last = now;
    var dt = now - last;
    last = now;
    if (!state.gameOver) {
      var interval = G.dropInterval(state.level);
      // 1 回の加算は、落下 1 回ぶんの間隔までに切る。タブが裏に回ったあとでも、1 フレームで落ちるのは 1 マスだけ。
      acc += Math.min(dt, interval);
      // 1 フレームに tick は 1 回まで。tick でレベルが上がって間隔が縮んでも、続けては落ちない。
      if (acc >= interval) {
        acc -= interval;
        G.tick(state);
      }
    }
    render();
    window.requestAnimationFrame(frame);
  }

  document.addEventListener('keydown', function (e) {
    var handled = true;
    switch (e.key) {
      case 'ArrowLeft': G.move(state, -1); break;
      case 'ArrowRight': G.move(state, 1); break;
      case 'ArrowUp': G.rotate(state, 1); break;
      case 'z': case 'Z': G.rotate(state, -1); break;
      case 'ArrowDown': if (G.softDrop(state)) acc = 0; break;
      case ' ': case 'Spacebar': if (!e.repeat) { G.hardDrop(state); acc = 0; } break;
      case 'Enter': restart(); break;
      default: handled = false;
    }
    if (handled) {
      e.preventDefault();
      render();
    }
  });

  restart();
  window.requestAnimationFrame(frame);
})();
