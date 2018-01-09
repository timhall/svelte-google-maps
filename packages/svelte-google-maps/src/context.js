import { Store } from 'svelte/store';
import { load, deferred, changer, noop } from './utils';

export default class Context extends Store {
  constructor(API_KEY, options = {}) {
    super();

    const { beta = false } = options;
    this.url = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}${
      beta ? '&v=3.exp&use_slippy=true' : ''
    }`;

    this.map = null;
    this.api = deferred();
    this.change = changer();

    this.onchange((values, changed) => {
      if (!this.map) return;
      if (changed.center) this.change(() => this.map.setCenter(values.center));
      if (changed.zoom) this.change(() => this.map.setZoom(values.zoom));
    });
  }

  async marker(options) {
    const api = await this.api;
    const map = this.map;

    const marker = new api.Marker(options);
    marker.setMap(map);

    return marker;
  }

  async overlay(element, options = {}) {
    const { draw = noop, pane: paneType = 'float' } = options;
    const api = await this.api;
    const map = this.map;

    const overlay = new api.OverlayView();
    overlay.onAdd = function() {
      const pane = this.getPanes()[`${paneType}Pane`];
      if (!pane) throw new Error(`No pane found for type "${paneType}"`);

      pane.appendChild(element);
    };
    overlay.draw = draw;
    overlay.setMap(map);

    return overlay;
  }

  async load(element) {
    const api = await load(this.url);
    const map = new api.Map(element, this.get());

    map.addListener('zoom_changed', () => {
      const zoom = map.getZoom();

      this.change(() => this.set({ zoom }));
    });
    map.addListener('center_changed', () => {
      const center = map.getCenter();
      const lat = center.lat();
      const lng = center.lng();

      this.change(() => this.set({ center: { lat, lng } }));
    });

    this.map = map;
    this.api.resolve(api);

    return this;
  }
}
