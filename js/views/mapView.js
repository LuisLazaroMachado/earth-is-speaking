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
    const fx = (clientX - r.left) / r.width;
    const fy = (clientY - r.top) / r.height;
    return {
      lat: Math.max(-89.99, Math.min(89.99, 90 - fy * 180)),
      lon: Math.max(-179.99, Math.min(179.99, fx * 360 - 180)),
    };
  }

  toXY(lat, lon) {
    return { x: ((lon + 180) / 360) * this.canvas.width, y: ((90 - lat) / 180) * this.canvas.height };
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

    this.el.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 2;
      let { lat, lon } = this.cursor;
      let moved = true;
      switch (e.key) {
        case 'ArrowUp': lat = Math.min(89, lat + step); break;
        case 'ArrowDown': lat = Math.max(-89, lat - step); break;
        case 'ArrowLeft': lon -= step; break;
        case 'ArrowRight': lon += step; break;
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
      ctx.drawImage(this.img, 0, 0, W, H);
    }

    if (this.outline) this._drawOutline(dpr);

    if (this.sweepLon !== null) {
      const { x } = this.toXY(0, this.sweepLon);
      ctx.fillStyle = 'rgba(234,239,7,0.25)';
      ctx.fillRect(x - 6 * dpr, 0, 12 * dpr, H);
      ctx.fillStyle = '#EAEF07';
      ctx.fillRect(x - 1.5 * dpr, 0, 3 * dpr, H);
    }

    this.markers.forEach((m, i) => this._pin(m, String(i + 1), dpr, '#0960E1'));
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
