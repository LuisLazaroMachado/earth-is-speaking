// Flat map view (equirectangular). Its only jobs: turn pointer/keyboard input into
// lat/lon and draw. All flat layers are shown at 2:1, the true shape of an
// equirectangular world map (the 16:9 NASA images are stretched back to 2:1).

export class MapView {
  /**
   * @param {HTMLElement} el  focusable wrapper (role="application")
   * @param {object} cb       callbacks: onTap, onDrag, onDragEnd, onHover, onCursor, onActivate
   */
  constructor(el, cb) {
    this.el = el;
    this.cb = cb;
    this.canvas = el.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.img = null;
    this.cursor = { lat: 0, lon: 0, visible: false };
    this.temp = null;
    this.markers = [];
    this.outline = null; // GeoJSON geometry (Polygon/MultiPolygon)
    this.sweepLon = null;
    this.hoverEnabled = false;
    this.vp = { x0: 0, y0: 0, w: 1, h: 1 }; // visible part of the world, as fractions
    this._down = null;
    this._lastDrag = 0;
    this._bind();
    new ResizeObserver(() => this.resize()).observe(this.canvas);
    this.resize();
  }

  async setImage(url) {
    this.img = null;
    this.error = false;
    this.draw();
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    try {
      await img.decode();
      this.img = img;
    } catch (e) {
      this.error = true;
    }
    this.draw();
    return !this.error;
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.draw();
  }

  // ---- coordinate conversion (the only place that knows about pixels) ----------

  toLatLon(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const fx = this.vp.x0 + ((clientX - r.left) / r.width) * this.vp.w;
    const fy = this.vp.y0 + ((clientY - r.top) / r.height) * this.vp.h;
    return {
      lat: Math.max(-89.99, Math.min(89.99, 90 - fy * 180)),
      lon: Math.max(-179.99, Math.min(179.99, fx * 360 - 180)),
    };
  }

  toXY(lat, lon) {
    const fx = ((lon + 180) / 360 - this.vp.x0) / this.vp.w;
    const fy = ((90 - lat) / 180 - this.vp.y0) / this.vp.h;
    return { x: fx * this.canvas.width, y: fy * this.canvas.height };
  }

  // ---- zoom (the view keeps the 2:1 shape, so vp.w === vp.h) ------------------------

  get zoom() { return 1 / this.vp.w; }

  /** Global view: a fixed NASA globe picture (16:9), no zoom, no geography. */
  setGlobal(on) {
    this.global = !!on;
    this.el.classList.toggle('global', this.global);
    this.vp = { x0: 0, y0: 0, w: 1, h: 1 };
    this.outline = null;
    this.resize();
  }

  _setVp(cx, cy, size) {
    const w = Math.max(1 / 16, Math.min(1, size));
    const x0 = Math.max(0, Math.min(1 - w, cx - w / 2));
    const y0 = Math.max(0, Math.min(1 - w, cy - w / 2));
    this.vp = { x0, y0, w, h: w };
    this.draw();
  }

  /** Zoom by a factor around a lat/lon (default: the centre of the view). */
  zoomBy(factor, lat, lon) {
    if (this.global) return;
    const c = lat === undefined ? { cx: this.vp.x0 + this.vp.w / 2, cy: this.vp.y0 + this.vp.h / 2 }
      : { cx: (lon + 180) / 360, cy: (90 - lat) / 180 };
    this._setVp(c.cx, c.cy, this.vp.w / factor);
  }

  resetView() { this.vp = { x0: 0, y0: 0, w: 1, h: 1 }; this.draw(); }

  /** Show a lat/lon box with some margin. */
  fitBounds(minLon, minLat, maxLon, maxLat, minSize = 1 / 12) {
    if (this.global) return;
    const fx0 = (minLon + 180) / 360, fx1 = (maxLon + 180) / 360;
    const fy0 = (90 - maxLat) / 180, fy1 = (90 - minLat) / 180;
    const size = Math.max(fx1 - fx0, fy1 - fy0) * 1.35;
    this._setVp((fx0 + fx1) / 2, (fy0 + fy1) / 2, Math.max(minSize, size));
  }

  /** Keep a point inside the view (used when the keyboard cursor moves while zoomed). */
  ensureVisible(lat, lon) {
    if (this.vp.w >= 1) return;
    const fx = (lon + 180) / 360, fy = (90 - lat) / 180;
    const m = this.vp.w * 0.1;
    if (fx < this.vp.x0 + m || fx > this.vp.x0 + this.vp.w - m || fy < this.vp.y0 + m || fy > this.vp.y0 + this.vp.h - m) {
      this._setVp(fx, fy, this.vp.w);
    }
  }

  // ---- input -----------------------------------------------------------------------

  _bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      c.setPointerCapture(e.pointerId);
      const p = this.toLatLon(e.clientX, e.clientY);
      this._down = { x: e.clientX, y: e.clientY, dragging: false, p };
      this.cb.onPress && this.cb.onPress(p.lat, p.lon);
    });
    c.addEventListener('pointermove', (e) => {
      const p = this.toLatLon(e.clientX, e.clientY);
      if (this._down) {
        const d = this._down;
        if (!d.dragging && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) {
          d.dragging = true;
          this.cb.onDragStart && this.cb.onDragStart();
        }
        if (d.dragging) {
          const now = performance.now();
          if (now - this._lastDrag >= 125) { // at most 8 notes per second
            this._lastDrag = now;
            this.cb.onDrag && this.cb.onDrag(p.lat, p.lon);
          }
        }
      } else if (this.hoverEnabled && e.pointerType === 'mouse') {
        const now = performance.now();
        if (now - this._lastDrag >= 250) {
          this._lastDrag = now;
          this.cb.onHover && this.cb.onHover(p.lat, p.lon);
        }
      }
    });
    const end = (e) => {
      if (!this._down) return;
      const d = this._down;
      this._down = null;
      if (d.dragging) this.cb.onDragEnd && this.cb.onDragEnd();
      else this.cb.onTap && this.cb.onTap(d.p.lat, d.p.lon);
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = this.toLatLon(e.clientX, e.clientY);
      this.zoomBy(e.deltaY < 0 ? 1.25 : 0.8, p.lat, p.lon);
    }, { passive: false });

    this.el.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 2;
      let { lat, lon } = this.cursor;
      let moved = true;
      const z = this.vp.w < 1 ? Math.max(0.25, this.vp.w) : 1; // finer steps when zoomed in
      const st = Math.max(0.25, step * z);
      switch (e.key) {
        case 'ArrowUp': lat = Math.min(89, lat + st); break;
        case 'ArrowDown': lat = Math.max(-89, lat - st); break;
        case 'ArrowLeft': lon -= st; break;
        case 'ArrowRight': lon += st; break;
        case '+': case '=': e.preventDefault(); this.zoomBy(2, this.cursor.lat, this.cursor.lon); this.cb.onZoom && this.cb.onZoom(); return;
        case '-': case '_': e.preventDefault(); this.zoomBy(0.5); this.cb.onZoom && this.cb.onZoom(); return;
        case 'Enter':
          e.preventDefault();
          this.cursor.visible = true;
          this.cb.onActivate && this.cb.onActivate(this.cursor.lat, this.cursor.lon);
          this.draw();
          return;
        default: moved = false;
      }
      if (!moved) return;
      e.preventDefault();
      if (lon > 180) lon -= 360;
      if (lon < -180) lon += 360;
      this.setCursor(lat, lon);
      this.cb.onCursor && this.cb.onCursor(lat, lon);
    });
    this.el.addEventListener('focus', () => { this.cursor.visible = true; this.draw(); });
  }

  setCursor(lat, lon) {
    this.cursor = { lat, lon, visible: true };
    this.ensureVisible(lat, lon);
    this.draw();
  }

  setTemp(m) { this.temp = m; this.draw(); }
  setMarkers(list) { this.markers = list; this.draw(); }
  setOutline(geom) { this.outline = geom; this.draw(); }
  setSweep(lon) { this.sweepLon = lon; this.draw(); }

  // ---- drawing ---------------------------------------------------------------------

  draw() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = null; this._draw(); });
  }

  _draw() {
    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;
    const dpr = W / (canvas.getBoundingClientRect().width || W);
    ctx.fillStyle = '#020a1f';
    ctx.fillRect(0, 0, W, H);
    if (this.img) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const iw = this.img.naturalWidth, ih = this.img.naturalHeight;
      ctx.imageSmoothingEnabled = this.vp.w > 0.25;
      ctx.drawImage(this.img, this.vp.x0 * iw, this.vp.y0 * ih, this.vp.w * iw, this.vp.h * ih, 0, 0, W, H);
    }

    if (this.outline) this._drawOutline(dpr);

    if (this.sweepLon !== null) {
      const { x } = this.toXY(0, this.sweepLon);
      ctx.fillStyle = 'rgba(234,239,7,0.25)';
      ctx.fillRect(x - 6 * dpr, 0, 12 * dpr, H);
      ctx.fillStyle = '#EAEF07';
      ctx.fillRect(x - 1.5 * dpr, 0, 3 * dpr, H);
    }

    this.markers.forEach((m, i) => this._pin(m, String(m.n ?? i + 1), dpr, '#0960E1'));
    if (this.temp) this._pin(this.temp, '', dpr, '#FFFFFF');

    if (this.cursor.visible) {
      const { x, y } = this.toXY(this.cursor.lat, this.cursor.lon);
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = '#000';
      ctx.beginPath(); ctx.arc(x, y, 12 * dpr, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#EAEF07';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath(); ctx.arc(x, y, 12 * dpr, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 20 * dpr, y); ctx.lineTo(x - 6 * dpr, y);
      ctx.moveTo(x + 6 * dpr, y); ctx.lineTo(x + 20 * dpr, y);
      ctx.moveTo(x, y - 20 * dpr); ctx.lineTo(x, y - 6 * dpr);
      ctx.moveTo(x, y + 6 * dpr); ctx.lineTo(x, y + 20 * dpr);
      ctx.stroke();
    }
  }

  _pin(m, label, dpr, color) {
    const { ctx } = this;
    const { x, y } = this.toXY(m.lat, m.lon);
    const r = (label ? 10 : 7) * dpr;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2.5 * dpr;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    if (label) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${11 * dpr}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + 0.5);
    }
  }

  _drawOutline(dpr) {
    const { ctx } = this;
    const polys = this.outline.type === 'Polygon' ? [this.outline.coordinates] : this.outline.coordinates;
    ctx.beginPath();
    polys.forEach((poly) => poly.forEach((ring) => {
      ring.forEach(([lon, lat], i) => {
        const { x, y } = this.toXY(lat, lon);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
    }));
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4 * dpr;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.stroke();
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = '#EAEF07';
    ctx.stroke();
  }
}
