var app = (function () {
'use strict';

function noop() {}

function assign(tar, src) {
	for (var k in src) tar[k] = src[k];
	return tar;
}

function appendNode(node, target) {
	target.appendChild(node);
}

function insertNode(node, target, anchor) {
	target.insertBefore(node, anchor);
}

function detachNode(node) {
	node.parentNode.removeChild(node);
}

function reinsertChildren(parent, target) {
	while (parent.firstChild) target.appendChild(parent.firstChild);
}

function destroyEach(iterations) {
	for (var i = 0; i < iterations.length; i += 1) {
		if (iterations[i]) iterations[i].d();
	}
}

function createFragment() {
	return document.createDocumentFragment();
}

function createElement(name) {
	return document.createElement(name);
}

function createSvgElement(name) {
	return document.createElementNS('http://www.w3.org/2000/svg', name);
}

function createText(data) {
	return document.createTextNode(data);
}

function createComment() {
	return document.createComment('');
}

function addListener(node, event, handler) {
	node.addEventListener(event, handler, false);
}

function removeListener(node, event, handler) {
	node.removeEventListener(event, handler, false);
}

function setAttribute(node, attribute, value) {
	node.setAttribute(attribute, value);
}

function toNumber(value) {
	return value === '' ? undefined : +value;
}

function children (element) {
	return Array.from(element.childNodes);
}

function claimElement (nodes, name, attributes, svg) {
	for (var i = 0; i < nodes.length; i += 1) {
		var node = nodes[i];
		if (node.nodeName === name) {
			for (var j = 0; j < node.attributes.length; j += 1) {
				var attribute = node.attributes[j];
				if (!attributes[attribute.name]) node.removeAttribute(attribute.name);
			}
			return nodes.splice(i, 1)[0]; // TODO strip unwanted attributes
		}
	}

	return svg ? createSvgElement(name) : createElement(name);
}

function claimText (nodes, data) {
	for (var i = 0; i < nodes.length; i += 1) {
		var node = nodes[i];
		if (node.nodeType === 3) {
			node.data = data;
			return nodes.splice(i, 1)[0];
		}
	}

	return createText(data);
}

function blankObject() {
	return Object.create(null);
}

function destroy(detach) {
	this.destroy = noop;
	this.fire('destroy');
	this.set = this.get = noop;

	if (detach !== false) this._fragment.u();
	this._fragment.d();
	this._fragment = this._state = null;
}

function _differs(a, b) {
	return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}

function fire(eventName, data) {
	var handlers =
		eventName in this._handlers && this._handlers[eventName].slice();
	if (!handlers) return;

	for (var i = 0; i < handlers.length; i += 1) {
		var handler = handlers[i];

		if (!handler.__calling) {
			handler.__calling = true;
			handler.call(this, data);
			handler.__calling = false;
		}
	}
}

function get(key) {
	return key ? this._state[key] : this._state;
}

function init(component, options) {
	component._handlers = blankObject();
	component._bind = options._bind;

	component.options = options;
	component.root = options.root || component;
	component.store = component.root.store || options.store;
}

function observe(key, callback, options) {
	var fn = callback.bind(this);

	if (!options || options.init !== false) {
		fn(this.get()[key], undefined);
	}

	return this.on(options && options.defer ? 'update' : 'state', function(event) {
		if (event.changed[key]) fn(event.current[key], event.previous && event.previous[key]);
	});
}

function on(eventName, handler) {
	if (eventName === 'teardown') return this.on('destroy', handler);

	var handlers = this._handlers[eventName] || (this._handlers[eventName] = []);
	handlers.push(handler);

	return {
		cancel: function() {
			var index = handlers.indexOf(handler);
			if (~index) handlers.splice(index, 1);
		}
	};
}

function set(newState) {
	this._set(assign({}, newState));
	if (this.root._lock) return;
	this.root._lock = true;
	callAll(this.root._beforecreate);
	callAll(this.root._oncreate);
	callAll(this.root._aftercreate);
	this.root._lock = false;
}

function _set(newState) {
	var oldState = this._state,
		changed = {},
		dirty = false;

	for (var key in newState) {
		if (this._differs(newState[key], oldState[key])) changed[key] = dirty = true;
	}
	if (!dirty) return;

	this._state = assign(assign({}, oldState), newState);
	this._recompute(changed, this._state);
	if (this._bind) this._bind(changed, this._state);

	if (this._fragment) {
		this.fire("state", { changed: changed, current: this._state, previous: oldState });
		this._fragment.p(changed, this._state);
		this.fire("update", { changed: changed, current: this._state, previous: oldState });
	}
}

function callAll(fns) {
	while (fns && fns.length) fns.shift()();
}

function _mount(target, anchor) {
	this._fragment[this._fragment.i ? 'i' : 'm'](target, anchor || null);
}

function _unmount() {
	if (this._fragment) this._fragment.u();
}

var proto = {
	destroy: destroy,
	get: get,
	fire: fire,
	observe: observe,
	on: on,
	set: set,
	teardown: destroy,
	_recompute: noop,
	_set: _set,
	_mount: _mount,
	_unmount: _unmount,
	_differs: _differs
};

let loading;

async function load(url) {
  if (window.google && window.google.maps) return google.maps;
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    window.__SvelteGoogleMapsInit = () => resolve(google.maps);

    const src = url + '&callback=__SvelteGoogleMapsInit';
    const script = document.createElement('script');
    script.onerror = () => reject(new Error(`Failed to load google maps scripts (${src})`));
    script.async = true;
    script.defer = true;
    script.charset = 'utf-8';
    script.src = src;

    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(script, firstScript);
  });

  return loading;
}

function deferred() {
  let _resolve, _reject;
  
  const later = new Promise((resolve, reject) => {
    _resolve = resolve;
    _reject = reject;
  });

  later.resolve = _resolve;
  later.reject = _reject;

  return later;
}

class Context {
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

function deferred$1() {
  let _resolve, _reject;
  
  const later = new Promise((resolve, reject) => {
    _resolve = resolve;
    _reject = reject;
  });

  later.resolve = _resolve;
  later.reject = _reject;

  return later;
}

function changer() {
  let changing = false;

  return callback => {
    if (changing) return;

    changing = true;
    callback();
    changing = false;
  };
}

function defer(callback) {
  setTimeout(callback, 0);
}

const supported = typeof IntersectionObserver !== 'undefined' && typeof WeakMap !== 'undefined';

let observer;
let listeners;
if (supported) {
  listeners = new WeakMap();

  const notify = entries => {
    for (const entry of entries) {
      const listener = listeners.get(entry.target);
      if (listener) listener();
    }
  };

  observer = new IntersectionObserver(notify);
}

function intersection(node, callback) {
  if (!supported) {
    defer(callback);
    return { teardown() {} };
  }

  listeners.set(node, callback);
  observer.observe(node);

  return {
    teardown() {
      listeners.delete(node);
      observer.unobserve(node);
    }
  }
}

/* node_modules/svelte-google-maps/Map.html generated by Svelte v1.64.1 */
function data$1() {
  return {
    defer: false,
    center: { lat: 0, lng: 0 },
    zoom: 8,
    instance: null,
    loading: null,
    loaded: false
  };
}

var methods = {
  async load() {
    let { instance, map: context, center, zoom, loaded, loading } = this.get();

    if (loaded) return instance;
    if (loading) return loading;

    loading = context.load(this.refs.map, { center, zoom }).then(({ map }) => map);
    this.set({ loaded: false, loading });

    instance = await loading;

    // Setup two-way binding between component and map
    // - Use `changer` to avoid additional sets/changes for internal changes
    const change = changer();

    // Attach listeners to instance
    instance.addListener('zoom_changed', () => {
      change(() => {
        const zoom = instance.getZoom();
        this.set({ zoom });
      });
    });

    instance.addListener('center_changed', () => {          
      change(() => {
        const center = instance.getCenter();
        const lat = center.lat();
        const lng = center.lng();

        this.set({ center: { lat, lng } });
      });
    });

    // Attach observers to component
    this.observe('center', center => {
      change(() => instance.setCenter(center));
    }, { init: false });

    this.observe('zoom', zoom => {
      change(() => instance.setZoom(zoom));
    }, { init: false });

    this.set({ instance, loaded: true, loading: null });

    return instance;
  }
};

function oncreate() {
  // Load map immediately or wait defer until intersection
  const defer$$1 = this.get('defer');
  if (!defer$$1 || defer$$1 === 'false') this.load();
}

async function ondestroy() {
  let { instance, loading } = this.get();
  
  if (!instance && loading) instance = await loading;
  if (!instance) return;

  // TODO Remove listeners from instance
  console.log('destroy', instance);
}

function create_main_fragment$1(component, state) {
	var div, intersection_handler, text, div_1, slot_content_default = component._slotted.default;

	return {
		c: function create() {
			div = createElement("div");
			text = createText("\n");
			div_1 = createElement("div");
			this.h();
		},

		l: function claim(nodes) {
			div = claimElement(nodes, "DIV", { class: true }, false);
			var div_nodes = children(div);

			div_nodes.forEach(detachNode);
			text = claimText(nodes, "\n");

			div_1 = claimElement(nodes, "DIV", { class: true }, false);
			var div_1_nodes = children(div_1);

			div_1_nodes.forEach(detachNode);
			this.h();
		},

		h: function hydrate() {
			setAttribute(div, "svelte-ref-map", "");

			intersection_handler = intersection.call(component, div, function(event) {
				component.load();
			});

			div.className = "svelte-my22wg";
			setAttribute(div_1, "svelte-ref-children", "");
			div_1.className = "svelte-my22wg";
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			component.refs.map = div;
			insertNode(text, target, anchor);
			insertNode(div_1, target, anchor);

			if (slot_content_default) {
				appendNode(slot_content_default, div_1);
			}

			component.refs.children = div_1;
		},

		p: noop,

		u: function unmount() {
			detachNode(div);
			detachNode(text);
			detachNode(div_1);

			if (slot_content_default) {
				reinsertChildren(div_1, slot_content_default);
			}
		},

		d: function destroy$$1() {
			intersection_handler[intersection_handler.destroy ? 'destroy' : 'teardown']();
			if (component.refs.map === div) component.refs.map = null;
			if (component.refs.children === div_1) component.refs.children = null;
		}
	};
}

function Map(options) {
	init(this, options);
	this.refs = {};
	this._state = assign(data$1(), options.data);

	this._handlers.destroy = [ondestroy];

	this._slotted = options.slots || {};

	var self = this;
	var _oncreate = function() {
		var changed = {  };
		oncreate.call(self);
		self.fire("update", { changed: changed, current: self._state });
	};

	if (!options.root) {
		this._oncreate = [];
	}

	this.slots = {};

	this._fragment = create_main_fragment$1(this, this._state);

	this.root._oncreate.push(_oncreate);

	if (options.target) {
		var nodes = children(options.target);
		options.hydrate ? this._fragment.l(nodes) : this._fragment.c();
		nodes.forEach(detachNode);
		this._mount(options.target, options.anchor);

		callAll(this._oncreate);
	}
}

assign(Map.prototype, proto);
assign(Map.prototype, methods);

/* node_modules/svelte-google-maps/Marker.html generated by Svelte v1.64.1 */
function data$2() {
	return { marker: deferred$1() };
}

async function oncreate$1() {
  let { map: context, position, title, label, icon } = this.get();

  const { api, map } = await context.ready();

  const marker = new api.Marker({
    position,
    title,
    label,
    icon,
    map
  });

  this.get('marker').resolve(marker);
}

async function ondestroy$1() {
  const marker = await this.get('marker');
  marker.setMap(null);
}

function create_main_fragment$2(component, state) {

	return {
		c: noop,

		l: noop,

		m: noop,

		p: noop,

		u: noop,

		d: noop
	};
}

function Marker(options) {
	init(this, options);
	this._state = assign(data$2(), options.data);

	this._handlers.destroy = [ondestroy$1];

	var self = this;
	var _oncreate = function() {
		var changed = {  };
		oncreate$1.call(self);
		self.fire("update", { changed: changed, current: self._state });
	};

	if (!options.root) {
		this._oncreate = [];
	}

	this._fragment = create_main_fragment$2(this, this._state);

	this.root._oncreate.push(_oncreate);

	if (options.target) {
		var nodes = children(options.target);
		options.hydrate ? this._fragment.l(nodes) : this._fragment.c();
		nodes.forEach(detachNode);
		this._mount(options.target, options.anchor);

		callAll(this._oncreate);
	}
}

assign(Marker.prototype, proto);

function deferred$2() {
  let _resolve, _reject;
  
  const later = new Promise((resolve, reject) => {
    _resolve = resolve;
    _reject = reject;
  });

  later.resolve = _resolve;
  later.reject = _reject;

  return later;
}

/* Users/tim/dev/svelte-google-maps/packages/svelte-google-maps/Polyline.html generated by Svelte v1.64.1 */
function data$3() {
  return {
    polyline: deferred$2()
  };
}

async function oncreate$2() {
  const { map: context, path, color: strokeColor, weight: strokeWeight } = this.get();

  const { api, map } = await context.ready();
  const polyline = new api.Polyline({
    path,
    geodesic: true,
    strokeColor,
    strokeWeight
  });

  polyline.setMap(map);
  this.get('polyline').resolve(polyline);
}

async function ondestroy$2() {
  const polyline = await this.get('polyline');
  polyline.setMap(null);
}

function create_main_fragment$3(component, state) {

	return {
		c: noop,

		l: noop,

		m: noop,

		p: noop,

		u: noop,

		d: noop
	};
}

function Polyline(options) {
	init(this, options);
	this._state = assign(data$3(), options.data);

	this._handlers.destroy = [ondestroy$2];

	var self = this;
	var _oncreate = function() {
		var changed = {  };
		oncreate$2.call(self);
		self.fire("update", { changed: changed, current: self._state });
	};

	if (!options.root) {
		this._oncreate = [];
	}

	this._fragment = create_main_fragment$3(this, this._state);

	this.root._oncreate.push(_oncreate);

	if (options.target) {
		var nodes = children(options.target);
		options.hydrate ? this._fragment.l(nodes) : this._fragment.c();
		nodes.forEach(detachNode);
		this._mount(options.target, options.anchor);

		callAll(this._oncreate);
	}
}

assign(Polyline.prototype, proto);

/* Users/tim/dev/svelte-google-maps/packages/svelte-google-maps/Info.html generated by Svelte v1.64.1 */
function data$4() {
  return {
    info: deferred$2()
  };
}

async function oncreate$3() {
  const { map: context, position } = this.get();
  const content = this.refs.content;

  const { api, map } = await context.ready();
  const info = new api.InfoWindow({
    content,
    position
  });

  info.addListener('closeclick', () => this.fire('close', info));

  this.observe('position', position => {
    info.setPosition(position);

    // If another InfoWindow is opened (e.g. Place)
    // then component may not have been destroyed
    // -> check for no map on position change, and re-open
    if (!info.map) info.open(map);
  }, { init: false });
  
  info.open(map);
  this.get('info').resolve(info);
}

async function ondestroy$3() {
  const info = await this.get('info');
  info.close();
}

function create_main_fragment$4(component, state) {
	var div, div_1, slot_content_default = component._slotted.default;

	return {
		c: function create() {
			div = createElement("div");
			div_1 = createElement("div");
		},

		l: function claim(nodes) {
			div = claimElement(nodes, "DIV", {}, false);
			var div_nodes = children(div);

			div_1 = claimElement(div_nodes, "DIV", {}, false);
			var div_1_nodes = children(div_1);

			div_1_nodes.forEach(detachNode);
			div_nodes.forEach(detachNode);
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			appendNode(div_1, div);

			if (slot_content_default) {
				appendNode(slot_content_default, div_1);
			}

			component.refs.content = div_1;
		},

		p: noop,

		u: function unmount() {
			detachNode(div);

			if (slot_content_default) {
				reinsertChildren(div_1, slot_content_default);
			}
		},

		d: function destroy$$1() {
			if (component.refs.content === div_1) component.refs.content = null;
		}
	};
}

function Info(options) {
	init(this, options);
	this.refs = {};
	this._state = assign(data$4(), options.data);

	this._handlers.destroy = [ondestroy$3];

	this._slotted = options.slots || {};

	var self = this;
	var _oncreate = function() {
		var changed = {  };
		oncreate$3.call(self);
		self.fire("update", { changed: changed, current: self._state });
	};

	if (!options.root) {
		this._oncreate = [];
	}

	this.slots = {};

	this._fragment = create_main_fragment$4(this, this._state);

	this.root._oncreate.push(_oncreate);

	if (options.target) {
		var nodes = children(options.target);
		options.hydrate ? this._fragment.l(nodes) : this._fragment.c();
		nodes.forEach(detachNode);
		this._mount(options.target, options.anchor);

		callAll(this._oncreate);
	}
}

assign(Info.prototype, proto);

const center = { lat: 37.552022, lng: -77.457849 };

const stations = [
  { position: { lat: 37.58474, lng: -77.497187 }, title: 'Willow Lawn' },
  { position: { lat: 37.580078, lng: -77.491633 }, title: 'Staples Mill' },
  { position: { lat: 37.565012, lng: -77.473562 }, title: 'Cleveland' },
  { position: { lat: 37.561106, lng: -77.467761 }, title: 'Science Museum' },
  { position: { lat: 37.557891, lng: -77.46244 }, title: 'Allison' },
  { position: { lat: 37.550364, lng: -77.44993 }, title: 'VCU & VUU' },
  { position: { lat: 37.546249, lng: -77.442877 }, title: 'Arts District' },
  { position: { lat: 37.543884, lng: -77.438993 }, title: 'Convention Center' },
  { position: { lat: 37.540822, lng: -77.433908 }, title: 'Government Center' },
  { position: { lat: 37.538922, lng: -77.430607 }, title: 'VCU Hospital' },
  { position: { lat: 37.534116, lng: -77.429588 }, title: 'Main St. Station' },
  { position: { lat: 37.529402, lng: -77.421734 }, title: 'Shockoe Bottom' },
  { position: { lat: 37.52444, lng: -77.418544 }, title: 'East Riverfront' },
  { position: { lat: 37.517769, lng: -77.415787 }, title: 'Orleans' }
];

const route = [
  { lat: 37.58474, lng: -77.497187 },
  { lat: 37.580078, lng: -77.491633 },
  { lat: 37.565012, lng: -77.473562 },
  { lat: 37.563470, lng: -77.471716 },
  { lat: 37.561106, lng: -77.467761 },
  { lat: 37.557891, lng: -77.46244 },
  { lat: 37.550364, lng: -77.44993 },
  { lat: 37.546249, lng: -77.442877 },
  { lat: 37.543884, lng: -77.438993 },
  { lat: 37.540822, lng: -77.433908 },
  { lat: 37.538922, lng: -77.430607 },
  { lat: 37.538037, lng: -77.429316 },
  { lat: 37.535604, lng: -77.432020 },
  { lat: 37.534116, lng: -77.429588 },
  { lat: 37.529402, lng: -77.421734 },
  { lat: 37.527640, lng: -77.419059 },
  { lat: 37.525683, lng: -77.418501 },
  { lat: 37.52444, lng: -77.418544 },
  { lat: 37.522637, lng: -77.416956 },
  { lat: 37.520714, lng: -77.415991 },
  { lat: 37.517769, lng: -77.415787 }
];

/* src/App.html generated by Svelte v1.64.1 */
const API_KEY = "AIzaSyAQJJ7ryqdpCJGciInaM6OPfBM10abiuPk";
const icon = {
  path: 'M 0,0 m -2,0 a 2,2 0 2,0 4,0 a 2,2 0 2,0 -4,0',
  fillColor: '#61bb46',
  fillOpacity: 1,
  scale: 3,
  strokeColor: '#005da5',
  strokeWeight: 2.5
};

function data() {
  return {
    map: new Context(API_KEY, { beta: true }),
    center,
    zoom: 13,
    stations,
    route,
    icon,
    selected: null
  };
}

function create_main_fragment(component, state) {
	var div, div_1, img, text_1, div_2, text_2, each_anchor, text_3, text_4, if_block_anchor, text_5, map_updating = {}, text_8, div_3, div_4, text_9, text_10_value = state.center.lat.toFixed(6), text_10, text_11, span, text_12, text_13, div_5, text_14, text_15_value = state.center.lng.toFixed(6), text_15, text_16, span_1, text_17, text_18, div_6, label, text_19, text_20, input, text_21, text_22;

	var each_value = state.stations;

	var each_blocks = [];

	for (var i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(component, assign(assign({}, state), {
			each_value: each_value,
			station: each_value[i],
			station_index: i
		}));
	}

	var polyline_initial_data = {
	 	map: state.map,
	 	path: state.route,
	 	color: "#005da5",
	 	weight: 4
	 };
	var polyline = new Polyline({
		root: component.root,
		data: polyline_initial_data
	});

	var if_block = (state.selected) && create_if_block(component, state);

	var map_initial_data = { map: state.map, defer: true };
	if ('center' in state) {
		map_initial_data.center = state.center ;
		map_updating.center = true;
	}
	if ('zoom' in state) {
		map_initial_data.zoom = state.zoom;
		map_updating.zoom = true;
	}
	var map = new Map({
		root: component.root,
		slots: { default: createFragment() },
		data: map_initial_data,
		_bind: function(changed, childState) {
			var state = component.get(), newState = {};
			if (!map_updating.center && changed.center) {
				newState.center = childState.center;
			}

			if (!map_updating.zoom && changed.zoom) {
				newState.zoom = childState.zoom;
			}
			component._set(newState);
			map_updating = {};
		}
	});

	component.root._beforecreate.push(function() {
		map._bind({ center: 1, zoom: 1 }, map.get());
	});

	function input_input_handler() {
		component.set({ zoom: toNumber(input.value) });
	}

	function input_change_handler() {
		component.set({ zoom: toNumber(input.value) });
	}

	return {
		c: function create() {
			div = createElement("div");
			div_1 = createElement("div");
			img = createElement("img");
			text_1 = createText("\n  ");
			div_2 = createElement("div");
			text_2 = createText("\n      ");

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_anchor = createComment();
			text_3 = createText("\n\n      ");
			polyline._fragment.c();
			text_4 = createText("\n\n      ");
			if (if_block) if_block.c();
			if_block_anchor = createComment();
			text_5 = createText("\n    ");
			map._fragment.c();
			text_8 = createText("\n\n");
			div_3 = createElement("div");
			div_4 = createElement("div");
			text_9 = createText("Latitude: ");
			text_10 = createText(text_10_value);
			text_11 = createText("\n  ");
			span = createElement("span");
			text_12 = createText("—");
			text_13 = createText("\n  ");
			div_5 = createElement("div");
			text_14 = createText("Longitude: ");
			text_15 = createText(text_15_value);
			text_16 = createText("\n  ");
			span_1 = createElement("span");
			text_17 = createText("—");
			text_18 = createText("\n  ");
			div_6 = createElement("div");
			label = createElement("label");
			text_19 = createText("Zoom");
			text_20 = createText(":\n    ");
			input = createElement("input");
			text_21 = createText(" ");
			text_22 = createText(state.zoom);
			this.h();
		},

		l: function claim(nodes) {
			div = claimElement(nodes, "DIV", { class: true }, false);
			var div_nodes = children(div);

			div_1 = claimElement(div_nodes, "DIV", { class: true }, false);
			var div_1_nodes = children(div_1);

			img = claimElement(div_1_nodes, "IMG", { class: true, src: true, alt: true }, false);
			var img_nodes = children(img);

			img_nodes.forEach(detachNode);
			div_1_nodes.forEach(detachNode);
			text_1 = claimText(div_nodes, "\n  ");

			div_2 = claimElement(div_nodes, "DIV", { class: true }, false);
			var div_2_nodes = children(div_2);

			text_2 = claimText(nodes, "\n      ");

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].l(nodes);
			}

			each_anchor = createComment();
			text_3 = claimText(nodes, "\n\n      ");
			polyline._fragment.l(nodes);
			text_4 = claimText(nodes, "\n\n      ");
			if (if_block) if_block.l(nodes);
			if_block_anchor = createComment();
			text_5 = claimText(nodes, "\n    ");
			map._fragment.l(div_2_nodes);
			div_2_nodes.forEach(detachNode);
			div_nodes.forEach(detachNode);
			text_8 = claimText(nodes, "\n\n");

			div_3 = claimElement(nodes, "DIV", { class: true }, false);
			var div_3_nodes = children(div_3);

			div_4 = claimElement(div_3_nodes, "DIV", { class: true }, false);
			var div_4_nodes = children(div_4);

			text_9 = claimText(div_4_nodes, "Latitude: ");
			text_10 = claimText(div_4_nodes, text_10_value);
			div_4_nodes.forEach(detachNode);
			text_11 = claimText(div_3_nodes, "\n  ");

			span = claimElement(div_3_nodes, "SPAN", { class: true }, false);
			var span_nodes = children(span);

			text_12 = claimText(span_nodes, "—");
			span_nodes.forEach(detachNode);
			text_13 = claimText(div_3_nodes, "\n  ");

			div_5 = claimElement(div_3_nodes, "DIV", { class: true }, false);
			var div_5_nodes = children(div_5);

			text_14 = claimText(div_5_nodes, "Longitude: ");
			text_15 = claimText(div_5_nodes, text_15_value);
			div_5_nodes.forEach(detachNode);
			text_16 = claimText(div_3_nodes, "\n  ");

			span_1 = claimElement(div_3_nodes, "SPAN", { class: true }, false);
			var span_1_nodes = children(span_1);

			text_17 = claimText(span_1_nodes, "—");
			span_1_nodes.forEach(detachNode);
			text_18 = claimText(div_3_nodes, "\n  ");

			div_6 = claimElement(div_3_nodes, "DIV", { class: true }, false);
			var div_6_nodes = children(div_6);

			label = claimElement(div_6_nodes, "LABEL", { for: true }, false);
			var label_nodes = children(label);

			text_19 = claimText(label_nodes, "Zoom");
			label_nodes.forEach(detachNode);
			text_20 = claimText(div_6_nodes, ":\n    ");

			input = claimElement(div_6_nodes, "INPUT", { type: true, min: true, max: true, class: true }, false);
			var input_nodes = children(input);

			input_nodes.forEach(detachNode);
			text_21 = claimText(div_6_nodes, " ");
			text_22 = claimText(div_6_nodes, state.zoom);
			div_6_nodes.forEach(detachNode);
			div_3_nodes.forEach(detachNode);
			this.h();
		},

		h: function hydrate() {
			setAttribute(div_1, "svelte-ref-background", "");
			img.className = "p-3 mt-4";
			img.src = "public/pulse-logo-dark.png";
			img.alt = "GRTC Pulse";
			div_1.className = "sm:w-64 svelte-ln2rh";
			setAttribute(div_2, "svelte-ref-container", "");
			div_2.className = "w-full border-b border-grey border-solid svelte-ln2rh";
			div.className = "sm:flex border border-grey border-solid";
			div_4.className = "sm:inline-block";
			span.className = "invisible sm:visible";
			div_5.className = "sm:inline-block";
			span_1.className = "invisible sm:visible";
			label.htmlFor = "zoom";
			addListener(input, "input", input_input_handler);
			addListener(input, "change", input_change_handler);
			setAttribute(input, "type", "range");
			input.min = "1";
			input.max = "18";
			input.className = "align-text-top";
			div_6.className = "sm:inline-block";
			div_3.className = "my-4 text-grey-darker text-sm sm:text-right";
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			appendNode(div_1, div);
			appendNode(img, div_1);
			component.refs.background = div_1;
			appendNode(text_1, div);
			appendNode(div_2, div);
			appendNode(text_2, map._slotted.default);

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(map._slotted.default, null);
			}

			appendNode(each_anchor, map._slotted.default);
			appendNode(text_3, map._slotted.default);
			polyline._mount(map._slotted.default, null);
			appendNode(text_4, map._slotted.default);
			if (if_block) if_block.m(map._slotted.default, null);
			appendNode(if_block_anchor, map._slotted.default);
			appendNode(text_5, map._slotted.default);
			map._mount(div_2, null);
			component.refs.container = div_2;
			insertNode(text_8, target, anchor);
			insertNode(div_3, target, anchor);
			appendNode(div_4, div_3);
			appendNode(text_9, div_4);
			appendNode(text_10, div_4);
			appendNode(text_11, div_3);
			appendNode(span, div_3);
			appendNode(text_12, span);
			appendNode(text_13, div_3);
			appendNode(div_5, div_3);
			appendNode(text_14, div_5);
			appendNode(text_15, div_5);
			appendNode(text_16, div_3);
			appendNode(span_1, div_3);
			appendNode(text_17, span_1);
			appendNode(text_18, div_3);
			appendNode(div_6, div_3);
			appendNode(label, div_6);
			appendNode(text_19, label);
			appendNode(text_20, div_6);
			appendNode(input, div_6);

			input.value = state.zoom;

			appendNode(text_21, div_6);
			appendNode(text_22, div_6);
		},

		p: function update(changed, state) {
			var each_value = state.stations;

			if (changed.map || changed.stations || changed.icon) {
				for (var i = 0; i < each_value.length; i += 1) {
					var each_context = assign(assign({}, state), {
						each_value: each_value,
						station: each_value[i],
						station_index: i
					});

					if (each_blocks[i]) {
						each_blocks[i].p(changed, each_context);
					} else {
						each_blocks[i] = create_each_block(component, each_context);
						each_blocks[i].c();
						each_blocks[i].m(each_anchor.parentNode, each_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].u();
					each_blocks[i].d();
				}
				each_blocks.length = each_value.length;
			}

			var polyline_changes = {};
			if (changed.map) polyline_changes.map = state.map;
			if (changed.route) polyline_changes.path = state.route;
			polyline._set(polyline_changes);

			if (state.selected) {
				if (if_block) {
					if_block.p(changed, state);
				} else {
					if_block = create_if_block(component, state);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.u();
				if_block.d();
				if_block = null;
			}

			var map_changes = {};
			if (changed.map) map_changes.map = state.map;
			if (!map_updating.center && changed.center) {
				map_changes.center = state.center ;
				map_updating.center = true;
			}
			if (!map_updating.zoom && changed.zoom) {
				map_changes.zoom = state.zoom;
				map_updating.zoom = true;
			}
			map._set(map_changes);
			map_updating = {};

			if ((changed.center) && text_10_value !== (text_10_value = state.center.lat.toFixed(6))) {
				text_10.data = text_10_value;
			}

			if ((changed.center) && text_15_value !== (text_15_value = state.center.lng.toFixed(6))) {
				text_15.data = text_15_value;
			}

			input.value = state.zoom;
			input.value = state.zoom;
			if (changed.zoom) {
				text_22.data = state.zoom;
			}
		},

		u: function unmount() {
			detachNode(div);

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].u();
			}

			if (if_block) if_block.u();
			detachNode(text_8);
			detachNode(div_3);
		},

		d: function destroy$$1() {
			if (component.refs.background === div_1) component.refs.background = null;

			destroyEach(each_blocks);

			polyline.destroy(false);
			if (if_block) if_block.d();
			map.destroy(false);
			if (component.refs.container === div_2) component.refs.container = null;
			removeListener(input, "input", input_input_handler);
			removeListener(input, "change", input_change_handler);
		}
	};
}

// (7:6) {{#each stations as station}}
function create_each_block(component, state) {
	var station = state.station, each_value = state.each_value, station_index = state.station_index;

	var marker_initial_data = {
	 	map: state.map,
	 	position: station.position,
	 	title: station.title,
	 	icon: state.icon
	 };
	var marker = new Marker({
		root: component.root,
		data: marker_initial_data
	});

	marker.on("click", function(event) {
		component.set({ selected: station });
	});

	return {
		c: function create() {
			marker._fragment.c();
		},

		l: function claim(nodes) {
			marker._fragment.l(nodes);
		},

		m: function mount(target, anchor) {
			marker._mount(target, anchor);
		},

		p: function update(changed, state) {
			station = state.station;
			each_value = state.each_value;
			station_index = state.station_index;
			var marker_changes = {};
			if (changed.map) marker_changes.map = state.map;
			if (changed.stations) marker_changes.position = station.position;
			if (changed.stations) marker_changes.title = station.title;
			if (changed.icon) marker_changes.icon = state.icon;
			marker._set(marker_changes);
		},

		u: function unmount() {
			marker._unmount();
		},

		d: function destroy$$1() {
			marker.destroy(false);
		}
	};
}

// (13:6) {{#if selected}}
function create_if_block(component, state) {
	var text, div, text_1_value = state.selected.title, text_1, text_2;

	var info_initial_data = { map: state.map, position: state.selected.position };
	var info = new Info({
		root: component.root,
		slots: { default: createFragment() },
		data: info_initial_data
	});

	info.on("close", function(event) {
		component.set({ selected: null });
	});

	return {
		c: function create() {
			text = createText("\n          ");
			div = createElement("div");
			text_1 = createText(text_1_value);
			text_2 = createText("\n        ");
			info._fragment.c();
			this.h();
		},

		l: function claim(nodes) {
			text = claimText(nodes, "\n          ");

			div = claimElement(nodes, "DIV", { class: true }, false);
			var div_nodes = children(div);

			text_1 = claimText(div_nodes, text_1_value);
			div_nodes.forEach(detachNode);
			text_2 = claimText(nodes, "\n        ");
			info._fragment.l(nodes);
			this.h();
		},

		h: function hydrate() {
			div.className = "text-sm font-medium whitespace-no-wrap";
		},

		m: function mount(target, anchor) {
			appendNode(text, info._slotted.default);
			appendNode(div, info._slotted.default);
			appendNode(text_1, div);
			appendNode(text_2, info._slotted.default);
			info._mount(target, anchor);
		},

		p: function update(changed, state) {
			if ((changed.selected) && text_1_value !== (text_1_value = state.selected.title)) {
				text_1.data = text_1_value;
			}

			var info_changes = {};
			if (changed.map) info_changes.map = state.map;
			if (changed.selected) info_changes.position = state.selected.position;
			info._set(info_changes);
		},

		u: function unmount() {
			info._unmount();
		},

		d: function destroy$$1() {
			info.destroy(false);
		}
	};
}

function App(options) {
	init(this, options);
	this.refs = {};
	this._state = assign(data(), options.data);

	if (!options.root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment(this, this._state);

	if (options.target) {
		var nodes = children(options.target);
		options.hydrate ? this._fragment.l(nodes) : this._fragment.c();
		nodes.forEach(detachNode);
		this._mount(options.target, options.anchor);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(App.prototype, proto);

const app = new App({
  target: document.getElementById('example')
});

return app;

}());
//# sourceMappingURL=bundle.js.map
