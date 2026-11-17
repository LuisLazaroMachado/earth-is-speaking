// One interface over the flat map and the 3D globe. Shared state (layer picture, temporary
// marker, permanent markers, country outline) is applied to both, so switching between
// Map and Globe keeps the layer, the markers and the selection. Input comes from the
// visible view only. The globe (Three.js) is loaded the first time it is opened.

export class ViewHub {
  constructor(map, globeEl, callbacks) {
    this.map = map;
    this.globeEl = globeEl;
    this.callbacks = callbacks;
    this.globe = null;
    this.active = map;
    this.s = { image: null, texture: null, temp: null, markers: [], outline: null, hover: false };
  }

  get mode() { return this.active === this.map ? 'map' : 'globe'; }
  get global() { return this.map.global; }
  get temp() { return this.s.temp; }
  get cursor() { return this.active.cursor; }
  get canvas() { return this.active.canvas; }
  get el() { return this.active.el; }

  /** Switch to 'map' or 'globe'. Resolves false if the globe cannot run (no WebGL). */
  async setMode(mode) {
    if (mode === 'globe') {
      if (!this.globe) {
        try {
          const { GlobeView } = await import('./globeView.js');
          this.globeEl.hidden = false;
          this.globe = new GlobeView(this.globeEl, this.callbacks);
          this.globe.hoverEnabled = this.s.hover;
          await this.globe.setTexture(this.s.texture);
          this.globe.setMarkers(this.s.markers);
          this.globe.setTemp(this.s.temp);
          this.globe.setOutline(this.s.outline);
          if (this.s.temp) this.globe.flyTo(this.s.temp.lat, this.s.temp.lon);
        } catch (e) {
          console.error(e);
          this.globeEl.hidden = true;
          this.globe = null;
          return false;
        }
      }
      this.map.el.hidden = true;
      this.globeEl.hidden = false;
      this.active = this.globe;
      this.globe.resize();
      return true;
    }
    this.globeEl.hidden = true;
    this.map.el.hidden = false;
    this.active = this.map;
    this.map.resize();
    return true;
  }

  // ---- shared state (both views) ----------------------------------------------------
  async setImage(url, textureUrl) {
    this.s.image = url;
    this.s.texture = textureUrl || url;
    const ok = await this.map.setImage(url);
    if (this.globe) this.globe.setTexture(this.s.texture);
    return ok;
  }
  setTemp(m) { this.s.temp = m; this.map.setTemp(m); if (this.globe) this.globe.setTemp(m); }
  setMarkers(list) { this.s.markers = list; this.map.setMarkers(list); if (this.globe) this.globe.setMarkers(list); }
  setOutline(g) { this.s.outline = g; this.map.setOutline(g); if (this.globe) this.globe.setOutline(g); }
  setCursor(lat, lon) { this.map.setCursor(lat, lon); if (this.globe) this.globe.setCursor(lat, lon); }
  setSweep(lon) { this.map.setSweep(lon); if (this.globe) this.globe.setSweep(lon); }
  fitBounds(...a) { this.map.fitBounds(...a); if (this.globe) this.globe.fitBounds(...a); }
  resetView() { this.map.resetView(); if (this.globe) this.globe.resetView(); }
  setGlobal(on) { this.map.setGlobal(on); }
  set hoverEnabled(v) { this.s.hover = v; this.map.hoverEnabled = v; if (this.globe) this.globe.hoverEnabled = v; }
  get hoverEnabled() { return this.s.hover; }

  // ---- visible view only -------------------------------------------------------------
  zoomBy(...a) { this.active.zoomBy(...a); }
  ensureVisible(...a) { this.active.ensureVisible(...a); }
  toXY(lat, lon) { return this.active.toXY(lat, lon); }
  resize() { this.active.resize(); }
  draw() { this.active.draw(); }
  focus() { this.active.el.focus(); }
}
