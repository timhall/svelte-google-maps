import { load, deferred } from './utils';

export default class Context {
  constructor(API_KEY, options = {}) {
    const { beta = false } = options;
    this.url = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}${
      beta ? '&v=3.exp&use_slippy=true' : ''
    }`;

    this.api = deferred();
    this.instance = deferred();
  }

  async load(element, options) {
    const api = await load(this.url);
    const map = new api.Map(element, options);

    this.api.resolve(api);
    this.instance.resolve(map);

    return { api, map };
  }

  async ready() {
    const api = await this.api;
    const map = await this.instance;

    return { api, map };
  }
}
