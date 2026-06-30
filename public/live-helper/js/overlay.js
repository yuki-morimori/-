/*
 * overlay.js — OBSのブラウザソースに入れる表示側。
 * 管理画面から KoeBus 経由で届いたコメントを画面に表示する。
 */
(function () {
  "use strict";

  var stage = document.getElementById("stage");
  var params = new URLSearchParams(location.search);
  if (params.get("preview") === "1") {
    document.body.classList.add("preview");
  }

  // 表示設定（管理画面から更新される）
  var settings = {
    style: "flow", // flow | stack
    fontSize: 28,
  };

  var FLOW_LIFETIME = 8000; // 「流れる」モードでコメントが消えるまで(ms)
  var MAX_BUBBLES = 25; // メモリ保護: 画面上の最大件数

  function applyFontSize() {
    stage.style.fontSize = settings.fontSize + "px";
  }
  applyFontSize();

  function addComment(c) {
    var bubble = document.createElement("div");
    bubble.className = "bubble" + (settings.style === "flow" ? " flowing" : "");

    if (c.name) {
      var who = document.createElement("span");
      who.className = "who";
      who.textContent = c.name;
      bubble.appendChild(who);
    }
    var body = document.createElement("span");
    body.className = "body";
    body.textContent = c.text; // textContent でXSSを防ぐ
    bubble.appendChild(body);

    stage.appendChild(bubble);

    // 上限を超えたら古いものから除去
    while (stage.children.length > MAX_BUBBLES) {
      stage.removeChild(stage.firstChild);
    }

    if (settings.style === "flow") {
      setTimeout(function () {
        bubble.classList.add("leaving");
        setTimeout(function () {
          if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
        }, 450);
      }, FLOW_LIFETIME);
    }
  }

  function clearAll() {
    while (stage.firstChild) stage.removeChild(stage.firstChild);
  }

  KoeBus.on(function (msg) {
    if (!msg || !msg.type) return;
    if (msg.type === "comment") {
      addComment(msg.payload);
    } else if (msg.type === "settings") {
      if (msg.payload.style) settings.style = msg.payload.style;
      if (msg.payload.fontSize) {
        settings.fontSize = msg.payload.fontSize;
        applyFontSize();
      }
    } else if (msg.type === "clear") {
      clearAll();
    }
  });
})();
