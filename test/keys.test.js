'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const K = require('../game/keys.js');

test('キーと操作の割り当て', () => {
  assert.equal(K.actionFor('ArrowLeft', false), 'left');
  assert.equal(K.actionFor('ArrowRight', false), 'right');
  assert.equal(K.actionFor('ArrowUp', false), 'rotateRight');
  assert.equal(K.actionFor('z', false), 'rotateLeft');
  assert.equal(K.actionFor('Z', false), 'rotateLeft');
  assert.equal(K.actionFor('ArrowDown', false), 'softDrop');
  assert.equal(K.actionFor(' ', false), 'hardDrop');
  assert.equal(K.actionFor('Enter', false), 'restart');
});

test('押しっぱなしでも、左右・回転・下は繰り返す', () => {
  assert.equal(K.actionFor('ArrowLeft', true), 'left');
  assert.equal(K.actionFor('ArrowRight', true), 'right');
  assert.equal(K.actionFor('ArrowUp', true), 'rotateRight');
  assert.equal(K.actionFor('z', true), 'rotateLeft');
  assert.equal(K.actionFor('ArrowDown', true), 'softDrop');
});

test('一気落としは、押しっぱなしでは繰り返さない', () => {
  assert.equal(K.actionFor(' ', true), null);
});

test('割り当てのないキーは何もしない', () => {
  assert.equal(K.actionFor('a', false), null);
  assert.equal(K.actionFor('Escape', false), null);
});
