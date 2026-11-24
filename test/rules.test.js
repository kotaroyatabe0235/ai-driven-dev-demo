'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../game/rules.js');

// 毎回同じ順に出る、決まった乱数
function seeded(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function game() {
  return G.createGame({ rng: seeded(1) });
}

function setPiece(state, id, x, y) {
  const shape = G.SHAPES.find((s) => s.id === id);
  state.piece = { id: shape.id, cells: shape.cells.map((r) => r.slice()), x, y };
}

function fillRow(state, r, except) {
  for (let c = 0; c < state.cols; c++) state.board[r][c] = except.includes(c) ? 0 : 9;
}

test('盤面は 10 × 20 で、最初は空', () => {
  const s = game();
  assert.equal(s.cols, 10);
  assert.equal(s.rows, 20);
  assert.ok(s.board.every((row) => row.length === 10 && row.every((v) => v === 0)));
  assert.equal(s.score, 0);
  assert.equal(s.level, 1);
  assert.equal(s.gameOver, false);
});

test('次のブロックが見える', () => {
  const s = game();
  assert.ok(s.next && s.next.cells);
});

test('袋は 7 種を 1 回ずつ配る', () => {
  const next = G.createBag(seeded(7));
  const ids = [];
  for (let i = 0; i < 7; i++) ids.push(next().id);
  assert.deepEqual(ids.slice().sort(), [1, 2, 3, 4, 5, 6, 7]);
  const ids2 = [];
  for (let i = 0; i < 7; i++) ids2.push(next().id);
  assert.deepEqual(ids2.slice().sort(), [1, 2, 3, 4, 5, 6, 7]);
});

test('同じ乱数なら同じ順に出る', () => {
  const a = G.createGame({ rng: seeded(3) });
  const b = G.createGame({ rng: seeded(3) });
  assert.equal(a.piece.id, b.piece.id);
  assert.equal(a.next.id, b.next.id);
});

test('左右に動かせて、壁で止まる', () => {
  const s = game();
  setPiece(s, 4, 0, 0);
  assert.equal(G.move(s, -1), false);
  assert.equal(s.piece.x, 0);
  assert.equal(G.move(s, 1), true);
  assert.equal(s.piece.x, 1);
  s.piece.x = 8;
  assert.equal(G.move(s, 1), false);
});

test('積み上がったマスには動けない', () => {
  const s = game();
  setPiece(s, 4, 3, 5);
  s.board[5][5] = 9;
  assert.equal(G.move(s, 1), false);
});

test('行列の回転：時計回りと反時計回りは逆', () => {
  const m = [[1, 0], [1, 1], [0, 1]];
  assert.deepEqual(G.rotateMatrix(m, 1), [[0, 1, 1], [1, 1, 0]]);
  assert.deepEqual(G.rotateMatrix(G.rotateMatrix(m, 1), -1), m);
});

test('4 回回すと元に戻る', () => {
  const s = game();
  setPiece(s, 6, 3, 5);
  const before = JSON.stringify(s.piece.cells);
  for (let i = 0; i < 4; i++) assert.equal(G.rotate(s, 1), true);
  assert.equal(JSON.stringify(s.piece.cells), before);
});

test('壁ぎわで回すと横にずれて回れる', () => {
  const s = game();
  setPiece(s, 3, 8, 5); // 長い棒を縦にして、右の壁ぎわに置く
  s.piece.cells = G.rotateMatrix(s.piece.cells, 1); // 縦の 4 × 1
  assert.equal(s.piece.cells.length, 4);
  assert.equal(G.rotate(s, 1), true);
  assert.equal(s.piece.cells.length, 1);
  assert.equal(s.piece.x, 6);
  assert.ok(!G.collides(s.board, s.piece.cells, s.piece.x, s.piece.y));
});

test('積み上がりに当たるときも、横にずれて回れる', () => {
  const s = game();
  setPiece(s, 3, 4, 5);
  s.piece.cells = G.rotateMatrix(s.piece.cells, 1); // 縦の 4 × 1
  s.board[5][7] = 9; // 横にすると x=7 に当たる
  const cur = s.piece.cells.length;
  assert.equal(cur, 4);
  assert.equal(G.rotate(s, 1), true);
  assert.equal(s.piece.x, 3);
  assert.ok(!G.collides(s.board, s.piece.cells, s.piece.x, s.piece.y));
});

test('回せる場所がなければ回らない', () => {
  const s = game();
  setPiece(s, 3, 3, 0);
  // 縦にした長い棒が入る余地を、上下左右とも埋める
  for (let c = 0; c < 10; c++) for (let r = 1; r < 6; r++) s.board[r][c] = 9;
  const before = JSON.stringify(s.piece);
  assert.equal(G.rotate(s, 1), false);
  assert.equal(JSON.stringify(s.piece), before);
});

test('tick で 1 マス落ち、底では固定されて次が出る', () => {
  const s = game();
  setPiece(s, 4, 4, 0);
  const next = s.next.id;
  assert.equal(G.tick(s), true);
  assert.equal(s.piece.y, 1);
  setPiece(s, 4, 4, 18);
  assert.equal(G.tick(s), false);
  assert.equal(s.board[18][4], 4);
  assert.equal(s.board[19][5], 4);
  assert.equal(s.piece.id, next);
  assert.equal(s.piece.y, 0);
});

test('1 列そろうと消えて、上の段が落ちる', () => {
  const s = game();
  fillRow(s, 19, [4, 5]);
  s.board[18][0] = 7;
  setPiece(s, 4, 4, 18); // 田
  G.tick(s);
  assert.equal(s.lines, 1);
  assert.equal(s.board[19][0], 7);
  assert.equal(s.board[19][4], 4);
  assert.ok(s.board[19].filter((v) => v === 0).length === 7);
});

test('同時に 4 列消せる', () => {
  const s = game();
  for (let r = 16; r < 20; r++) fillRow(s, r, [9]);
  setPiece(s, 3, 6, 0);
  s.piece.cells = G.rotateMatrix(s.piece.cells, 1); // 縦
  s.piece.x = 9;
  s.piece.y = 16;
  G.tick(s);
  assert.equal(s.lines, 4);
  assert.equal(s.score, 800);
  assert.ok(s.board.every((row) => row.every((v) => v === 0)));
});

test('点数：消した列数 × レベルで増える', () => {
  assert.equal(G.lineScore(0, 3), 0);
  assert.equal(G.lineScore(1, 1), 100);
  assert.equal(G.lineScore(2, 1), 300);
  assert.equal(G.lineScore(3, 2), 1000);
  assert.equal(G.lineScore(4, 3), 2400);
});

test('下キーは 1 マスにつき 1 点、一気落としは 1 マスにつき 2 点', () => {
  const s = game();
  setPiece(s, 4, 4, 0);
  G.softDrop(s);
  assert.equal(s.score, 1);
  setPiece(s, 4, 4, 0);
  const n = G.hardDrop(s);
  assert.equal(n, 18);
  assert.equal(s.score, 1 + 36);
});

test('レベルは 10 列ごとに 1 上がる', () => {
  assert.equal(G.levelFor(0), 1);
  assert.equal(G.levelFor(9), 1);
  assert.equal(G.levelFor(10), 2);
  assert.equal(G.levelFor(25), 3);
});

test('落ちる間隔はレベルが上がると短くなり、下限がある', () => {
  assert.equal(G.dropInterval(1), 800);
  assert.equal(G.dropInterval(2), 730);
  assert.ok(G.dropInterval(5) < G.dropInterval(4));
  assert.equal(G.dropInterval(50), 100);
});

test('10 列消すとレベルが上がり、間隔が短くなる', () => {
  const s = game();
  s.lines = 9;
  fillRow(s, 19, [4, 5]);
  setPiece(s, 4, 4, 18);
  const before = G.dropInterval(s.level);
  G.tick(s);
  assert.equal(s.lines, 10);
  assert.equal(s.level, 2);
  assert.ok(G.dropInterval(s.level) < before);
});

test('出口が埋まるとゲームオーバーになり、以後は動かない', () => {
  const s = game();
  for (let r = 0; r < 20; r++) fillRow(s, r, [0]);
  setPiece(s, 4, 4, 18);
  s.board[0][4] = 9;
  s.board[0][5] = 9;
  G.tick(s);
  assert.equal(s.gameOver, true);
  const snap = JSON.stringify([s.piece, s.score]);
  assert.equal(G.move(s, 1), false);
  assert.equal(G.rotate(s, 1), false);
  assert.equal(G.tick(s), false);
  assert.equal(G.softDrop(s), false);
  assert.equal(G.hardDrop(s), 0);
  assert.equal(JSON.stringify([s.piece, s.score]), snap);
});

test('やり直しは新しい game で 0 から始まる', () => {
  const s = G.createGame({ rng: seeded(2) });
  s.score = 500;
  const t = G.createGame({ rng: seeded(2) });
  assert.equal(t.score, 0);
  assert.equal(t.lines, 0);
  assert.equal(t.gameOver, false);
});

test('形の番号が重複しない', () => {
  const ids = G.SHAPES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});
