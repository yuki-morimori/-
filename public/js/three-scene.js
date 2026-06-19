/* =========================================================================
   ヒーロー3D ―― コンセプト「手書きの混沌 → 構造化されたデータ」
   バラバラに散った紙片（手書き日報）が、スクロールに連れて整然とした
   格子（=帳票・データ）へと整列していく。事業内容そのものを可視化する。

   実装メモ:
   - InstancedMesh で紙片を一括描画（軽量）。各セルに chaos / order の2状態を
     持たせ、scroll 進度 p(0..1) で補間 → 1フレームごとに行列を再構築。
   - グローバル THREE（CDN r128 系）前提。モジュール不要。
   - prefers-reduced-motion / WebGL非対応 / タブ非表示で停止。
   - 配色・密度は CONFIG で調整（内容は仮）。
   ========================================================================= */
(function () {
  'use strict';

  var canvas = document.getElementById('bg3d');
  if (!canvas || typeof THREE === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  var isMobile = window.matchMedia('(max-width:767px)').matches;

  var CONFIG = {
    cols: isMobile ? 7 : 11,
    rows: isMobile ? 9 : 7,
    gap: 2.15,            // order 状態の格子間隔
    paper: 0xeef2f8,
    accent: 0xf27e1d,
    accent2: 0xff9d42,
    dpr: Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2)
  };

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !isMobile });
  } catch (e) { canvas.style.display = 'none'; return; }
  renderer.setPixelRatio(CONFIG.dpr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 30);

  scene.add(new THREE.AmbientLight(0x9fb4d8, 0.85));
  var key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(-8, 12, 14);
  scene.add(key);
  var warm = new THREE.PointLight(CONFIG.accent2, 1.6, 90);
  warm.position.set(16, -6, 18);
  scene.add(warm);

  // ---- 紙片（InstancedMesh） -------------------------------------------
  var N = CONFIG.cols * CONFIG.rows;
  var geo = new THREE.PlaneGeometry(1.5, 2.0);
  var mat = new THREE.MeshStandardMaterial({
    color: CONFIG.paper, roughness: 0.72, metalness: 0.04,
    side: THREE.DoubleSide
  });
  var mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  // per-instance の色（数枚だけアクセントに）
  var color = new THREE.Color();
  var cellData = [];
  var idx = 0;
  for (var r = 0; r < CONFIG.rows; r++) {
    for (var c = 0; c < CONFIG.cols; c++) {
      var ox = (c - (CONFIG.cols - 1) / 2) * CONFIG.gap;
      var oy = (r - (CONFIG.rows - 1) / 2) * CONFIG.gap;

      cellData.push({
        // order（整列後）
        ox: ox, oy: oy, oz: 0,
        orx: 0, ory: 0, orz: 0,
        // chaos（散乱）
        cx: ox + (Math.random() - 0.5) * 26,
        cy: oy + (Math.random() - 0.5) * 22,
        cz: (Math.random() - 0.5) * 34,
        crx: (Math.random() - 0.5) * Math.PI * 1.6,
        cry: (Math.random() - 0.5) * Math.PI * 1.6,
        crz: (Math.random() - 0.5) * Math.PI * 1.6,
        // 個体差（整列の到達タイミングをずらす＝波打って収束）
        delay: (c / CONFIG.cols) * 0.35 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2
      });

      var accent = Math.random() < 0.10;
      color.setHex(accent ? CONFIG.accent : CONFIG.paper);
      mesh.setColorAt(idx, color);
      idx++;
    }
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);

  // ---- 背景の微粒子（奥行き） ------------------------------------------
  var PN = isMobile ? 500 : 1400;
  var pp = new Float32Array(PN * 3);
  for (var i = 0; i < PN; i++) {
    pp[i * 3]     = (Math.random() - 0.5) * 80;
    pp[i * 3 + 1] = (Math.random() - 0.5) * 60;
    pp[i * 3 + 2] = -10 - Math.random() * 50;
  }
  var pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  var dust = new THREE.Points(pg, new THREE.PointsMaterial({
    color: CONFIG.accent2, size: 0.12, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(dust);

  // ---- 状態 -------------------------------------------------------------
  var p = 0;            // 整列進度 0..1（スクロール由来）
  var pSmooth = 0;
  var mx = 0, my = 0, mtx = 0, mty = 0;

  function onScroll() {
    // ヒーローの高さ分のスクロールで 0→1
    var hero = document.getElementById('hero');
    var span = (hero ? hero.offsetHeight : window.innerHeight) * 0.9;
    p = Math.min(1, Math.max(0, (window.scrollY || 0) / span));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  window.addEventListener('pointermove', function (e) {
    mtx = (e.clientX / window.innerWidth - 0.5);
    mty = (e.clientY / window.innerHeight - 0.5);
  }, { passive: true });

  window.addEventListener('resize', function () {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // ---- ループ -----------------------------------------------------------
  var dummy = new THREE.Object3D();
  var running = true, t = 0;
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) loop();
  });

  function ease(x) { return 1 - Math.pow(1 - x, 3); }

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    t += 0.01;
    pSmooth += (p - pSmooth) * 0.08;
    mx += (mtx - mx) * 0.05;
    my += (mty - my) * 0.05;

    for (var k = 0; k < N; k++) {
      var d = cellData[k];
      // delay を効かせた個別進度（端から順に整列＝波打って収束）
      var local = ease(Math.min(1, Math.max(0, (pSmooth - d.delay) / (1 - d.delay))));
      // chaos 時はゆっくり漂う
      var driftX = Math.sin(t * 0.7 + d.phase) * (1 - local) * 0.6;
      var driftY = Math.cos(t * 0.6 + d.phase) * (1 - local) * 0.6;

      dummy.position.set(
        d.cx + (d.ox - d.cx) * local + driftX,
        d.cy + (d.oy - d.cy) * local + driftY,
        d.cz + (d.oz - d.cz) * local
      );
      dummy.rotation.set(
        d.crx + (d.orx - d.crx) * local,
        d.cry + (d.ory - d.cry) * local,
        d.crz + (d.orz - d.crz) * local
      );
      var s = 0.85 + local * 0.15;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    // 全体をゆっくり傾け、マウスでパララックス
    mesh.rotation.y = mx * 0.5 + Math.sin(t * 0.2) * 0.04;
    mesh.rotation.x = my * 0.4;
    dust.rotation.y += 0.0004;

    // 整列が進むほど正対し、寄っていく
    camera.position.x += ((mx * 4) - camera.position.x) * 0.04;
    camera.position.y += ((-my * 3) - camera.position.y) * 0.04;
    camera.position.z = 30 - pSmooth * 6;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  loop();
})();
