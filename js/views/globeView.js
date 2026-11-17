// 3D pixel globe (Three.js, loaded only when the user opens the globe). Same contract as
// MapView: it only turns input into latitude/longitude and draws; the core is shared.
// The texture is the layer's flat NASA picture (labels covered), with NEAREST magnification
// so the data pixels stay visible as they rotate with the sphere.
import * as THREE from '../vendor/three.module.min.js';

const D2R = Math.PI / 180;
const MIN_DIST = 1.25;
const MAX_DIST = 4.2;
const HOME = { lat: 20, lon: 0, dist: 3.5 };

/** Point on the sphere for a lat/lon, matching THREE.SphereGeometry's texture mapping. */
export function latLonToVec3(lat, lon, r = 1) {
  const phi = (lon + 180) * D2R;
  const theta = (90 - lat) * D2R;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta) * r, Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r);
}

const wrapLon = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180;
const clampLat = (lat) => Math.max(-85, Math.min(85, lat));

function discTexture(label, fill) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.beginPath();
  g.arc(32, 32, 26, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = '#000';
  g.stroke();
  if (label) {
    g.fillStyle = '#fff';
    g.font = 'bold 30px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, 32, 34);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class GlobeView {
  constructor(el, cb) {
    this.el = el;
    this.cb = cb;
    this.canvas = el.querySelector('canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setClearColor(0x020a1f, 1);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 2, 0.05, 50);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.material = new THREE.MeshBasicMaterial({ color: 0x334466 });
    this.sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 80), this.material);
    this.group.add(this.sphere);
    // faint atmosphere ring
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.025, 64, 32),
      new THREE.MeshBasicMaterial({ color: 0x2e96f5, transparent: true, opacity: 0.12, side: THREE.BackSide }));
    this.scene.add(halo);
    this.overlay = new THREE.Group();
    this.group.add(this.overlay);
    this.markerGroup = new THREE.Group();
    this.group.add(this.markerGroup);

    this.center = { lat: HOME.lat, lon: HOME.lon };
    this.dist = HOME.dist;
    this.anim = null;
    this.temp = null;
    this.markers = [];
    this.outline = null;
    this.sweepLon = null;
    this.hoverEnabled = false;
    this.global = false;
    this.ray = new THREE.Raycaster();
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._pointers = new Map();
    this._bind();
    new ResizeObserver(() => this.resize()).observe(this.canvas);
    this.resize();
  }

  get cursor() { return { lat: this.center.lat, lon: this.center.lon, visible: true }; }

  // ---- texture ---------------------------------------------------------------------
  setTexture(url) {
    if (!url || url === this._texUrl) return Promise.resolve(true);
    this._texUrl = url;
    return new Promise((resolve) => {
      new THREE.TextureLoader().load(url, (tex) => {
        if (this._texUrl !== url) { tex.dispose(); resolve(true); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.magFilter = THREE.NearestFilter; // keep the data pixels visible
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        if (this.material.map) this.material.map.dispose();
        this.material.map = tex;
        this.material.color.set(0xffffff);
        this.material.needsUpdate = true;
        this.draw();
        resolve(true);
      }, undefined, () => resolve(false));
    });
  }

  // ---- camera and rotation ----------------------------------------------------------
  _applyRotation() {
    // rotate the globe so that (center.lat, center.lon) faces the camera, north up
    this.group.rotation.set(this.center.lat * D2R, -Math.PI / 2 - this.center.lon * D2R, 0, 'XYZ');
    this.camera.position.set(0, 0, this.dist);
    this.camera.lookAt(0, 0, 0);
    const s = 0.022 + 0.018 * (this.dist - 1);
    this.markerGroup.children.forEach((sp) => sp.scale.set(s * sp.userData.k, s * sp.userData.k, 1));
  }

  /** Turn the globe so a point is in the centre (animated unless reduced motion is on). */
  setCursor(lat, lon) { this.flyTo(lat, lon, this.dist); }

  flyTo(lat, lon, dist = this.dist) {
    const to = { lat: clampLat(lat), lon: wrapLon(lon), dist: Math.max(MIN_DIST, Math.min(MAX_DIST, dist)) };
    if (this.reduced.matches) {
      this.center = { lat: to.lat, lon: to.lon };
      this.dist = to.dist;
      this.anim = null;
      this.draw();
      return;
    }
    this.anim = { from: { ...this.center, dist: this.dist }, to, t0: performance.now(), ms: 450 };
    this.draw();
  }

  zoomBy(factor) { this.flyTo(this.center.lat, this.center.lon, this.dist / factor); }
  resetView() { this.flyTo(HOME.lat, HOME.lon, HOME.dist); }
  ensureVisible() {}

  fitBounds(minLon, minLat, maxLon, maxLat) {
    const lat = (minLat + maxLat) / 2;
    const lon = (minLon + maxLon) / 2;
    const size = Math.max((maxLon - minLon) * Math.cos(lat * D2R), maxLat - minLat);
    this.flyTo(lat, lon, 1 + Math.min(1, size / 120) * (HOME.dist - 1) + 0.25);
  }

  // ---- overlays ----------------------------------------------------------------------
  setTemp(m) { this.temp = m; this._rebuildMarkers(); }
  setMarkers(list) { this.markers = list; this._rebuildMarkers(); }

  _rebuildMarkers() {
    this.markerGroup.children.forEach((sp) => { sp.material.map.dispose(); sp.material.dispose(); });
    this.markerGroup.clear();
    const add = (m, label, fill, k) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTexture(label, fill), depthTest: true }));
      sp.position.copy(latLonToVec3(m.lat, m.lon, 1.015));
      sp.userData.k = k;
      this.markerGroup.add(sp);
    };
    this.markers.forEach((m, i) => add(m, String(m.n ?? i + 1), '#0960E1', 1.4));
    if (this.temp) add(this.temp, '', '#FFFFFF', 0.9);
    this._applyRotation();
    this.draw();
  }

  setOutline(geom) {
    this.outline = geom;
    this._rebuildOverlay();
  }

  setSweep(lon) {
    this.sweepLon = lon;
    if (lon !== null && lon !== undefined) { this.center.lon = wrapLon(lon); this.anim = null; }
    this._rebuildOverlay();
  }

  _rebuildOverlay() {
    this.overlay.children.forEach((o) => { o.geometry.dispose(); o.material.dispose(); });
    this.overlay.clear();
    const mat = new THREE.LineBasicMaterial({ color: 0xeaef07 });
    if (this.outline) {
      const polys = this.outline.type === 'Polygon' ? [this.outline.coordinates] : this.outline.coordinates;
      polys.forEach((poly) => poly.forEach((ring) => {
        const pts = [];
        for (let i = 0; i < ring.length; i++) {
          const [lo1, la1] = ring[i];
          const [lo2, la2] = ring[(i + 1) % ring.length];
          const steps = Math.max(1, Math.ceil(Math.hypot(lo2 - lo1, la2 - la1) / 1)); // densify every ~1 degree
          for (let k = 0; k < steps; k++) pts.push(latLonToVec3(la1 + ((la2 - la1) * k) / steps, lo1 + ((lo2 - lo1) * k) / steps, 1.004));
        }
        if (pts.length > 1) this.overlay.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat));
      }));
    }
    if (this.sweepLon !== null && this.sweepLon !== undefined) {
      const pts = [];
      for (let la = -89; la <= 89; la += 2) pts.push(latLonToVec3(la, this.sweepLon, 1.006));
      this.overlay.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    this.draw();
  }

  /** Screen position (canvas pixels) of a lat/lon, or null when it is on the far side. */
  toXY(lat, lon) {
    this.group.updateMatrixWorld();
    const p = latLonToVec3(lat, lon, 1).applyMatrix4(this.group.matrixWorld);
    const toCam = this.camera.position.clone().sub(p);
    if (p.clone().normalize().dot(toCam.normalize()) < 0.05) return null;
    p.project(this.camera);
    return { x: ((p.x + 1) / 2) * this.canvas.width, y: ((1 - p.y) / 2) * this.canvas.height };
  }

  // ---- input -------------------------------------------------------------------------
  _hit(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const hit = this.ray.intersectObject(this.sphere, false)[0];
    if (!hit || !hit.uv) return null;
    return { lat: Math.max(-89.99, Math.min(89.99, hit.uv.y * 180 - 90)), lon: Math.max(-179.99, Math.min(179.99, hit.uv.x * 360 - 180)) };
  }

  _bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      c.setPointerCapture(e.pointerId);
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this._pointers.size === 1) {
        this._down = { x: e.clientX, y: e.clientY, center: { ...this.center }, dragging: false };
      } else {
        this._down = null;
        const [a, b] = [...this._pointers.values()];
        this._pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: this.dist };
      }
    });
    c.addEventListener('pointermove', (e) => {
      if (this._pointers.has(e.pointerId)) this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this._pinch && this._pointers.size === 2) {
        const [a, b] = [...this._pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.dist = Math.max(MIN_DIST, Math.min(MAX_DIST, this._pinch.dist * (this._pinch.d / Math.max(d, 1))));
        this.anim = null;
        this.draw();
        return;
      }
      const dn = this._down;
      if (dn) {
        const dx = e.clientX - dn.x;
        const dy = e.clientY - dn.y;
        if (!dn.dragging && Math.hypot(dx, dy) > 6) dn.dragging = true;
        if (dn.dragging) {
          const r = c.getBoundingClientRect();
          const k = (180 / (r.height * 0.9)) * ((this.dist - 1) / (HOME.dist - 1));
          this.center = { lat: clampLat(dn.center.lat + dy * k), lon: wrapLon(dn.center.lon - dx * k) };
          this.anim = null;
          this.draw();
        }
      } else if (this.hoverEnabled && e.pointerType === 'mouse' && this._pointers.size === 0) {
        const now = performance.now();
        if (now - (this._lastHover || 0) >= 250) {
          this._lastHover = now;
          const p = this._hit(e.clientX, e.clientY);
          if (p && this.cb.onHover) this.cb.onHover(p.lat, p.lon);
        }
      }
    });
    const end = (e) => {
      this._pointers.delete(e.pointerId);
      if (this._pointers.size < 2) this._pinch = null;
      const dn = this._down;
      this._down = null;
      if (!dn || dn.dragging || e.type === 'pointercancel') return;
      const p = this._hit(e.clientX, e.clientY);
      if (!p) return;
      if (this.cb.onPress) this.cb.onPress(p.lat, p.lon);
      if (this.cb.onTap) this.cb.onTap(p.lat, p.lon);
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.dist = Math.max(MIN_DIST, Math.min(MAX_DIST, this.dist * (e.deltaY > 0 ? 1.1 : 0.9)));
      this.anim = null;
      this.draw();
    }, { passive: false });

    this.el.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 15 : 5;
      let { lat, lon } = this.center;
      switch (e.key) {
        case 'ArrowUp': lat += step; break;
        case 'ArrowDown': lat -= step; break;
        case 'ArrowLeft': lon -= step; break;
        case 'ArrowRight': lon += step; break;
        case '+': case '=': e.preventDefault(); this.zoomBy(1.4); return;
        case '-': case '_': e.preventDefault(); this.zoomBy(1 / 1.4); return;
        case 'Enter':
          e.preventDefault();
          if (this.cb.onActivate) this.cb.onActivate(this.center.lat, this.center.lon);
          return;
        default: return;
      }
      e.preventDefault();
      this.flyTo(lat, lon);
      if (this.cb.onCursor) this.cb.onCursor(clampLat(lat), wrapLon(lon));
    });
  }

  // ---- drawing -----------------------------------------------------------------------
  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
    this.draw();
  }

  draw() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = null; this._frame(); });
  }

  _frame() {
    if (this.anim) {
      const a = this.anim;
      const f = Math.min(1, (performance.now() - a.t0) / a.ms);
      const e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      const dLon = ((a.to.lon - a.from.lon + 540) % 360) - 180;
      this.center = { lat: a.from.lat + (a.to.lat - a.from.lat) * e, lon: wrapLon(a.from.lon + dLon * e) };
      this.dist = a.from.dist + (a.to.dist - a.from.dist) * e;
      if (f >= 1) this.anim = null;
    }
    this._applyRotation();
    this.renderer.render(this.scene, this.camera);
    if (this.anim) this.draw();
  }

  focus() { this.el.focus(); }
}
