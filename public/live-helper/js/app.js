/*
 * app.js — 管理画面のロジック。
 *  - コメント送信（KoeBus でオーバーレイへ）
 *  - 読み上げ（Web Speech API / speechSynthesis）
 *  - デモ自動再生
 *  - 表示設定の同期
 */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  // ---- 読み上げ（TTS）----------------------------------------------------
  var synth = window.speechSynthesis;
  var voices = [];

  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices();
    var sel = $("voice-select");
    var prev = sel.value;
    sel.innerHTML = "";
    // 日本語の声を上に並べる
    voices
      .slice()
      .sort(function (a, b) {
        var aj = /ja|JP/i.test(a.lang) ? 0 : 1;
        var bj = /ja|JP/i.test(b.lang) ? 0 : 1;
        return aj - bj;
      })
      .forEach(function (v) {
        var opt = document.createElement("option");
        opt.value = v.name;
        opt.textContent = v.name + " (" + v.lang + ")";
        sel.appendChild(opt);
      });
    if (prev) sel.value = prev;
    if (!sel.value && voices.length) {
      // 既定は最初の日本語の声
      var ja = voices.find(function (v) { return /ja|JP/i.test(v.lang); });
      if (ja) sel.value = ja.name;
    }
  }

  if (synth) {
    loadVoices();
    if (typeof synth.onvoiceschanged !== "undefined") {
      synth.onvoiceschanged = loadVoices;
    }
  } else {
    $("tts-enabled").checked = false;
    $("tts-enabled").disabled = true;
  }

  function speak(text) {
    if (!synth || !$("tts-enabled").checked || !text) return;
    var u = new SpeechSynthesisUtterance(text);
    var vname = $("voice-select").value;
    var v = voices.find(function (x) { return x.name === vname; });
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = parseFloat($("rate").value);
    u.pitch = parseFloat($("pitch").value);
    u.volume = parseFloat($("volume").value);
    synth.speak(u);
  }

  // ---- コメント送信 ------------------------------------------------------
  function sendComment(name, text) {
    text = (text || "").trim();
    if (!text) return;
    name = (name || "").trim();
    KoeBus.send({ type: "comment", payload: { name: name, text: text } });

    var spoken = text;
    if ($("read-name").checked && name) spoken = name + "さん、" + text;
    speak(spoken);
  }

  $("comment-form").addEventListener("submit", function (e) {
    e.preventDefault();
    sendComment($("name-input").value, $("text-input").value);
    $("text-input").value = "";
    $("text-input").focus();
  });

  // textarea で Enter送信 / Shift+Enter改行
  $("text-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      $("comment-form").requestSubmit();
    }
  });

  $("clear-btn").addEventListener("click", function () {
    KoeBus.send({ type: "clear" });
  });

  $("test-voice").addEventListener("click", function () {
    speak("これは読み上げのテストです。こんにちは、配信お疲れさまです！");
  });

  // ---- 表示設定の同期 ----------------------------------------------------
  function pushSettings() {
    KoeBus.send({
      type: "settings",
      payload: {
        style: $("style-select").value,
        fontSize: parseInt($("font-size").value, 10),
      },
    });
  }
  $("style-select").addEventListener("change", pushSettings);
  $("font-size").addEventListener("input", function () {
    $("size-out").textContent = $("font-size").value;
    pushSettings();
  });
  // プレビューiframe読み込み後に初期設定を送る
  window.setTimeout(pushSettings, 600);

  // ---- スライダーの数値表示 ----------------------------------------------
  [["rate", "rate-out"], ["pitch", "pitch-out"], ["volume", "volume-out"]].forEach(function (p) {
    var input = $(p[0]); var out = $(p[1]);
    input.addEventListener("input", function () {
      out.textContent = parseFloat(input.value).toFixed(1);
    });
  });

  // ---- デモ自動再生 ------------------------------------------------------
  var DEMO = [
    { name: "りんご", text: "配信おつかれさまです〜！" },
    { name: "ゲーム好き", text: "今日の声めっちゃ聞き取りやすい" },
    { name: "ことね", text: "そのアバターかわいい！どこで作ったの？" },
    { name: "通りすがり", text: "初見です、よろしくお願いします" },
    { name: "もぐもぐ", text: "8888888888" },
    { name: "夜ふかし勢", text: "コメント読み上げ便利そうだね" },
    { name: "なな", text: "次の配信いつ？楽しみにしてる" },
    { name: "こー", text: "OBSの設定どうやってるんですか？" },
  ];
  var demoTimer = null;
  var demoIdx = 0;
  $("demo-toggle").addEventListener("click", function () {
    if (demoTimer) {
      clearInterval(demoTimer);
      demoTimer = null;
      this.textContent = "▶ デモ自動再生";
      this.classList.remove("primary");
    } else {
      this.textContent = "⏸ デモ停止";
      this.classList.add("primary");
      var fire = function () {
        var c = DEMO[demoIdx % DEMO.length];
        demoIdx++;
        sendComment(c.name, c.text);
      };
      fire();
      demoTimer = setInterval(fire, 2600);
    }
  });

  // ---- OBS用URLのコピー --------------------------------------------------
  var overlayUrl = new URL("./overlay.html", location.href).href;
  $("overlay-url").textContent = overlayUrl;
  $("copy-url").addEventListener("click", function () {
    var done = function () {
      var b = $("copy-url");
      var old = b.textContent;
      b.textContent = "コピーしました ✓";
      setTimeout(function () { b.textContent = old; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(overlayUrl).then(done, done);
    } else {
      done();
    }
  });
})();
