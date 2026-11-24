// 色紙落とし：キーの割り当て（画面に依存しない）。
// ブラウザでは <script> で読み込んで window.IroGamiKeys として使い、Node.js では require で読み込む。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.IroGamiKeys = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // KeyboardEvent.key の値から、操作の名前を返す。割り当てがなければ null。
  // repeat が true（押しっぱなし）のとき、一気落としは null にする。
  function actionFor(key, repeat) {
    switch (key) {
      case 'ArrowLeft': return 'left';
      case 'ArrowRight': return 'right';
      case 'ArrowUp': return 'rotateRight';
      case 'z': case 'Z': return 'rotateLeft';
      case 'ArrowDown': return 'softDrop';
      case ' ': case 'Spacebar': return repeat ? null : 'hardDrop';
      case 'Enter': return 'restart';
      default: return null;
    }
  }

  return { actionFor: actionFor };
});
