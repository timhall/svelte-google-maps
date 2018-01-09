import { load, deferred, changer, noop } from './utils';

export default class Context {
  constructor(API_KEY, options = {}) {
    const { beta = false } = options;
    this.url = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}${
      beta ? '&v=3.exp&use_slippy=true' : ''
    }`;

    this.api = deferred();
    this.instance = deferred();
    this.change = changer();
  }

  async load(element, options) {
    const api = await load(this.url);
    const instance = new api.Map(element, options);

    this.api.resolve(api);
    this.instance.resolve(instance);

    return instance;
  }

  async ready() {
    const api = await this.api;
    const instance = await this.instance;

    return { api, instance };
  }
}
