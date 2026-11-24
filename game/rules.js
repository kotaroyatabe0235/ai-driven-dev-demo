// 色紙落とし：ゲームの規則（画面に依存しない）。
// ブラウザでは <script> で読み込んで window.IroGami として使い、Node.js では require で読み込む。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.IroGami = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var COLS = 10;
  var ROWS = 20;
  var LINES_PER_LEVEL = 10;
  var LINE_SCORES = [0, 100, 300, 500, 800];

  // ブロックの形。1 が埋まるマス。色の番号は盤面の値（1 以上）としても使う。
  var SHAPES = [
    { id: 1, name: 'ちいさな棒', cells: [[1, 1, 1]] },
    { id: 2, name: 'かぎ', cells: [[1, 0], [1, 1]] },
    { id: 3, name: '長い棒', cells: [[1, 1, 1, 1]] },
    { id: 4, name: '田', cells: [[1, 1], [1, 1]] },
    { id: 5, name: '山', cells: [[0, 1, 0], [1, 1, 1]] },
    { id: 6, name: 'L', cells: [[1, 0, 0], [1, 1, 1]] },
    { id: 7, name: '波', cells: [[0, 1, 1], [1, 1, 0]] }
  ];

  function copyMatrix(m) {
    return m.map(function (r) { return r.slice(); });
  }

  // 時計回りに 90 度回す。
  function rotateMatrix(m, dir) {
    var h = m.length, w = m[0].length, out = [], r, c;
    if (dir >= 0) {
      for (r = 0; r < w; r++) {
        out.push([]);
        for (c = 0; c < h; c++) out[r].push(m[h - 1 - c][r]);
      }
    } else {
      for (r = 0; r < w; r++) {
        out.push([]);
        for (c = 0; c < h; c++) out[r].push(m[c][w - 1 - r]);
      }
    }
    return out;
  }

  function createBoard(cols, rows) {
    var b = [], r, c;
    for (r = 0; r < rows; r++) {
      b.push([]);
      for (c = 0; c < cols; c++) b[r].push(0);
    }
    return b;
  }

  // 7 種を 1 回ずつ混ぜて配る袋。rng は 0 以上 1 未満を返す関数。
  function createBag(rng) {
    var queue = [];
    return function next() {
      if (queue.length === 0) {
        var bag = SHAPES.slice(), i, j, t;
        for (i = bag.length - 1; i > 0; i--) {
          j = Math.floor(rng() * (i + 1));
          t = bag[i]; bag[i] = bag[j]; bag[j] = t;
        }
        queue = bag;
      }
      return queue.shift();
    };
  }

  function makePiece(shape, cols) {
    var cells = copyMatrix(shape.cells);
    return {
      id: shape.id,
      cells: cells,
      x: Math.floor((cols - cells[0].length) / 2),
      y: 0
    };
  }

  function collides(board, cells, x, y) {
    var r, c, bx, by;
    for (r = 0; r < cells.length; r++) {
      for (c = 0; c < cells[r].length; c++) {
        if (!cells[r][c]) continue;
        bx = x + c; by = y + r;
        if (bx < 0 || bx >= board[0].length || by >= board.length) return true;
        if (by >= 0 && board[by][bx]) return true;
      }
    }
    return false;
  }

  function levelFor(lines) {
    return Math.floor(lines / LINES_PER_LEVEL) + 1;
  }

  // 1 マス落ちるまでの時間（ミリ秒）。レベルが 1 上がるごとに 70 ミリ秒短くなり、100 ミリ秒で止まる。
  function dropInterval(level) {
    return Math.max(100, 800 - (level - 1) * 70);
  }

  function lineScore(cleared, level) {
    return (LINE_SCORES[cleared] || 0) * level;
  }

  function spawn(state) {
    state.piece = makePiece(state.next, state.cols);
    state.next = state.nextShape();
    if (collides(state.board, state.piece.cells, state.piece.x, state.piece.y)) {
      state.gameOver = true;
    }
  }

  function createGame(options) {
    options = options || {};
    var cols = options.cols || COLS, rows = options.rows || ROWS;
    var nextShape = createBag(options.rng || Math.random);
    var state = {
      cols: cols,
      rows: rows,
      board: createBoard(cols, rows),
      piece: null,
      next: nextShape(),
      nextShape: nextShape,
      score: 0,
      lines: 0,
      level: 1,
      gameOver: false
    };
    spawn(state);
    return state;
  }

  function move(state, dx) {
    if (state.gameOver) return false;
    var p = state.piece;
    if (collides(state.board, p.cells, p.x + dx, p.y)) return false;
    p.x += dx;
    return true;
  }

  // dir: 1 で時計回り、-1 で反時計回り。壁や積み上がりに当たるときは横に少しずらして試す。
  function rotate(state, dir) {
    if (state.gameOver) return false;
    var p = state.piece;
    var cells = rotateMatrix(p.cells, dir);
    var kicks = [0, -1, 1, -2, 2], i;
    for (i = 0; i < kicks.length; i++) {
      if (!collides(state.board, cells, p.x + kicks[i], p.y)) {
        p.cells = cells;
        p.x += kicks[i];
        return true;
      }
    }
    return false;
  }

  function clearLines(state) {
    var kept = state.board.filter(function (row) {
      return row.some(function (v) { return !v; });
    });
    var cleared = state.rows - kept.length;
    while (kept.length < state.rows) kept.unshift(new Array(state.cols).fill(0));
    state.board = kept;
    return cleared;
  }

  function lock(state) {
    var p = state.piece, r, c;
    for (r = 0; r < p.cells.length; r++) {
      for (c = 0; c < p.cells[r].length; c++) {
        if (p.cells[r][c] && p.y + r >= 0) state.board[p.y + r][p.x + c] = p.id;
      }
    }
    var cleared = clearLines(state);
    state.score += lineScore(cleared, state.level);
    state.lines += cleared;
    state.level = levelFor(state.lines);
    spawn(state);
    return cleared;
  }

  // 1 マス落とす。落とせなければ固定して次のブロックを出す。
  function tick(state) {
    if (state.gameOver) return false;
    var p = state.piece;
    if (!collides(state.board, p.cells, p.x, p.y + 1)) {
      p.y += 1;
      return true;
    }
    lock(state);
    return false;
  }

  // 下キー。1 マス落とせたら 1 点。
  function softDrop(state) {
    if (state.gameOver) return false;
    var moved = tick(state);
    if (moved) state.score += 1;
    return moved;
  }

  // 一番下まで落として固定する。落ちたマス数 × 2 点。
  function hardDrop(state) {
    if (state.gameOver) return 0;
    var p = state.piece, n = 0;
    while (!collides(state.board, p.cells, p.x, p.y + 1)) { p.y += 1; n += 1; }
    state.score += n * 2;
    lock(state);
    return n;
  }

  return {
    COLS: COLS,
    ROWS: ROWS,
    LINES_PER_LEVEL: LINES_PER_LEVEL,
    SHAPES: SHAPES,
    createGame: createGame,
    createBag: createBag,
    rotateMatrix: rotateMatrix,
    collides: collides,
    move: move,
    rotate: rotate,
    tick: tick,
    softDrop: softDrop,
    hardDrop: hardDrop,
    levelFor: levelFor,
    dropInterval: dropInterval,
    lineScore: lineScore
  };
});
