/*
 * bus.js — 管理画面とオーバーレイの間でコメント/設定をやり取りする共有チャネル。
 *
 * 外部サーバーは不要。同一ブラウザ内のタブ・iframe・OBS内蔵ブラウザ間を
 * BroadcastChannel でつなぎ、未対応環境では localStorage イベントにフォールバックする。
 */
(function (global) {
  "use strict";

  var CHANNEL = "koe-overlay";
  var LS_KEY = "koe-overlay:last";

  function Bus() {
    this._handlers = [];
    this._bc = null;
    if (typeof BroadcastChannel !== "undefined") {
      this._bc = new BroadcastChannel(CHANNEL);
      var self = this;
      this._bc.onmessage = function (ev) {
        self._emit(ev.data);
      };
    } else {
      // フォールバック: localStorage の storage イベントで別タブへ伝搬
      var that = this;
      global.addEventListener("storage", function (ev) {
        if (ev.key === LS_KEY && ev.newValue) {
          try {
            that._emit(JSON.parse(ev.newValue));
          } catch (e) {
            /* 壊れたペイロードは無視 */
          }
        }
      });
    }
  }

  Bus.prototype.send = function (msg) {
    if (this._bc) {
      this._bc.postMessage(msg);
    } else {
      // 同じ値を続けて送っても storage イベントが発火するよう _t を付ける
      msg._t = (msg._t || 0) + 1;
      global.localStorage.setItem(LS_KEY, JSON.stringify(msg));
    }
  };

  Bus.prototype.on = function (handler) {
    this._handlers.push(handler);
  };

  Bus.prototype._emit = function (msg) {
    for (var i = 0; i < this._handlers.length; i++) {
      try {
        this._handlers[i](msg);
      } catch (e) {
        if (global.console) console.error(e);
      }
    }
  };

  global.KoeBus = new Bus();
})(window);
