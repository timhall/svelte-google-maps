var app = (function () {
'use strict';

function noop() {}

function assign(target) {
	var k,
		source,
		i = 1,
		len = arguments.length;
	for (; i < len; i++) {
		source = arguments[i];
		for (k in source) target[k] = source[k];
	}

	return target;
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

function setStyle(node, key, value) {
	node.style.setProperty(key, value);
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

function destroyDev(detach) {
	destroy.call(this, detach);
	this.destroy = function() {
		console.warn('Component was already destroyed');
	};
}

function differs(a, b) {
	return a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}

function dispatchObservers(component, group, changed, newState, oldState) {
	for (var key in group) {
		if (!changed[key]) continue;

		var newValue = newState[key];
		var oldValue = oldState[key];

		var callbacks = group[key];
		if (!callbacks) continue;

		for (var i = 0; i < callbacks.length; i += 1) {
			var callback = callbacks[i];
			if (callback.__calling) continue;

			callback.__calling = true;
			callback.call(component, newValue, oldValue);
			callback.__calling = false;
		}
	}
}

function fire(eventName, data) {
	var handlers =
		eventName in this._handlers && this._handlers[eventName].slice();
	if (!handlers) return;

	for (var i = 0; i < handlers.length; i += 1) {
		handlers[i].call(this, data);
	}
}

function get(key) {
	return key ? this._state[key] : this._state;
}

function init(component, options) {
	component._observers = { pre: blankObject(), post: blankObject() };
	component._handlers = blankObject();
	component._bind = options._bind;

	component.options = options;
	component.root = options.root || component;
	component.store = component.root.store || options.store;
}

function observe(key, callback, options) {
	var group = options && options.defer
		? this._observers.post
		: this._observers.pre;

	(group[key] || (group[key] = [])).push(callback);

	if (!options || options.init !== false) {
		callback.__calling = true;
		callback.call(this, this._state[key]);
		callback.__calling = false;
	}

	return {
		cancel: function() {
			var index = group[key].indexOf(callback);
			if (~index) group[key].splice(index, 1);
		}
	};
}

function observeDev(key, callback, options) {
	var c = (key = '' + key).search(/[^\w]/);
	if (c > -1) {
		var message =
			'The first argument to component.observe(...) must be the name of a top-level property';
		if (c > 0)
			message += ", i.e. '" + key.slice(0, c) + "' rather than '" + key + "'";

		throw new Error(message);
	}

	return observe.call(this, key, callback, options);
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

function onDev(eventName, handler) {
	if (eventName === 'teardown') {
		console.warn(
			"Use component.on('destroy', ...) instead of component.on('teardown', ...) which has been deprecated and will be unsupported in Svelte 2"
		);
		return this.on('destroy', handler);
	}

	return on.call(this, eventName, handler);
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
		if (differs(newState[key], oldState[key])) changed[key] = dirty = true;
	}
	if (!dirty) return;

	this._state = assign({}, oldState, newState);
	this._recompute(changed, this._state);
	if (this._bind) this._bind(changed, this._state);

	if (this._fragment) {
		dispatchObservers(this, this._observers.pre, changed, this._state, oldState);
		this._fragment.p(changed, this._state);
		dispatchObservers(this, this._observers.post, changed, this._state, oldState);
	}
}

function setDev(newState) {
	if (typeof newState !== 'object') {
		throw new Error(
			this._debugName + '.set was called without an object of data key-values to update.'
		);
	}

	this._checkReadOnly(newState);
	set.call(this, newState);
}

function callAll(fns) {
	while (fns && fns.length) fns.pop()();
}

function _mount(target, anchor) {
	this._fragment.m(target, anchor);
}

function _unmount() {
	if (this._fragment) this._fragment.u();
}

var protoDev = {
	destroy: destroyDev,
	get: get,
	fire: fire,
	observe: observeDev,
	on: onDev,
	set: setDev,
	teardown: destroyDev,
	_recompute: noop,
	_set: _set,
	_mount: _mount,
	_unmount: _unmount
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

function changer() {
  let changing = false;

  return callback => {
    if (changing) return;

    changing = true;
    callback();
    changing = false;
  };
}

class Context {
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

// Assume ES Modules usage is with svelte compiler
// so import components separately to avoid bundling unneeded code
//
// Example:
//
// import { Context } from 'svelte-google-maps';
// import Map from 'svelte-google-maps/Map.html';
// import Marker from 'svelte-google-maps/Marker.html';


//# sourceMappingURL=svelte-google-maps.js.map

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

function changer$1() {
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

/* C:\dev\pulse-map\packages\svelte-google-maps\Map.html generated by Svelte v1.51.0 */
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
    const change = changer$1();

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

function encapsulateStyles$1(node) {
	setAttribute(node, "svelte-1791593990", "");
}

function create_main_fragment$1(state, component) {
	var div, intersection_handler, text, div_1, slot_content_default = component._slotted.default;

	return {
		c: function create() {
			div = createElement("div");
			text = createText("\n");
			div_1 = createElement("div");
			this.h();
		},

		l: function claim(nodes) {
			div = claimElement(nodes, "DIV", {}, false);
			var div_nodes = children(div);

			div_nodes.forEach(detachNode);
			text = claimText(nodes, "\n");

			div_1 = claimElement(nodes, "DIV", {}, false);
			var div_1_nodes = children(div_1);

			div_1_nodes.forEach(detachNode);
			this.h();
		},

		h: function hydrate() {
			encapsulateStyles$1(div);
			setAttribute(div, "svelte-ref-map", "");

			intersection_handler = intersection.call(component, div, function(event) {
				component.load();
			});

			encapsulateStyles$1(div_1);
			setAttribute(div_1, "svelte-ref-children", "");
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
			intersection_handler.teardown();
			if (component.refs.map === div) component.refs.map = null;
			if (component.refs.children === div_1) component.refs.children = null;
		}
	};
}

function Map(options) {
	this._debugName = '<Map>';
	if (!options || (!options.target && !options.root)) throw new Error("'target' is a required option");
	init(this, options);
	this.refs = {};
	this._state = assign(data$1(), options.data);

	this._handlers.destroy = [ondestroy];

	this._slotted = options.slots || {};

	var _oncreate = oncreate.bind(this);

	if (!options.root) {
		this._oncreate = [_oncreate];
	} else {
	 	this.root._oncreate.push(_oncreate);
	 }

	this.slots = {};

	this._fragment = create_main_fragment$1(this._state, this);

	if (options.target) {
		var nodes = children(options.target);
		options.hydrate ? this._fragment.l(nodes) : this._fragment.c();
		nodes.forEach(detachNode);
		this._fragment.m(options.target, options.anchor || null);

		callAll(this._oncreate);
	}
}

assign(Map.prototype, methods, protoDev);

Map.prototype._checkReadOnly = function _checkReadOnly(newState) {
};

/* C:\dev\pulse-map\packages\svelte-google-maps\Marker.html generated by Svelte v1.51.0 */
function data$2() {
  return {
    marker: deferred$1()
  };
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

function create_main_fragment$2(state, component) {

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
	this._debugName = '<Marker>';
	if (!options || (!options.target && !options.root)) throw new Error("'target' is a required option");
	init(this, options);
	this._state = assign(data$2(), options.data);

	this._handlers.destroy = [ondestroy$1];

	var _oncreate = oncreate$1.bind(this);

	if (!options.root) {
		this._oncreate = [_oncreate];
	} else {
	 	this.root._oncreate.push(_oncreate);
	 }

	this._fragment = create_main_fragment$2(this._state, this);

	if (options.target) {
		var nodes = children(options.target);
		options.hydrate ? this._fragment.l(nodes) : this._fragment.c();
		nodes.forEach(detachNode);
		this._fragment.m(options.target, options.anchor || null);

		callAll(this._oncreate);
	}
}

assign(Marker.prototype, protoDev);

Marker.prototype._checkReadOnly = function _checkReadOnly(newState) {
};

/* C:\dev\pulse-map\packages\svelte-google-maps\Overlay.html generated by Svelte v1.51.0 */
function data$3() {
  return {
    overlay: deferred$1(),
    mapPane: 'floatPane',
    translation: { x: 0, y: 0 }
  };
}

async function oncreate$2() {
  const { map: context, mapPane, position, bounds } = this.get();
  const container = this.refs.container;
  let getOffset = prepareOffset(this.get('offset'), container);
  

  const { api, map } = await context.ready();
  const overlay = new api.OverlayView();
  const component = this;

  overlay.onAdd = function () {
    const pane = this.getPanes()[mapPane];
    if (!pane) throw new Error(`No pane found for type "${mapPane}"`);

    pane.appendChild(container);
  };

  overlay.draw = function () {
    if (position) {
      const { lat, lng } = position;
      const offset = getOffset();

      const projection = this.getProjection();
      const { x, y } = projection.fromLatLngToDivPixel(new api.LatLng(lat, lng));

      const translation = { x: x + offset.x, y: y + offset.y };
      component.set({ translation });
    } else if (bounds) {
      console.log('bounds', bounds);
    }
  };

  // Redraw overlay on positioning changes
  this.observe('position', () => overlay.draw(), { init: false });
  this.observe('bounds', () => overlay.draw(), { init: false });
  this.observe('offset', value => {
    getOffset = prepareOffset(value, container);
    overlay.draw();
  }, { init: false });

  overlay.setMap(map);
  this.get('overlay').resolve(overlay);
}

function prepareOffset(offset, container) {
  if (typeof offset === 'function') {
    return () => {
      const value = offset(container);
      return { x: value && value.x || 0, y: value && value.y || 0 };
    };
  } else {
    const value = { x: offset && offset.x || 0, y: offset && offset.y || 0 };
    return () => value;
  }
}

function create_main_fragment$3(state, component) {
	var div, slot_content_default = component._slotted.default;

	return {
		c: function create() {
			div = createElement("div");
			this.h();
		},

		l: function claim(nodes) {
			div = claimElement(nodes, "DIV", { style: true }, false);
			var div_nodes = children(div);

			div_nodes.forEach(detachNode);
			this.h();
		},

		h: function hydrate() {
			setStyle(div, "transform", "translate(" + state.translation.x + "px, " + state.translation.y + "px)");
			setStyle(div, "position", "absolute");
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);

			if (slot_content_default) {
				appendNode(slot_content_default, div);
			}

			component.refs.container = div;
		},

		p: function update(changed, state) {
			if (changed.translation) {
				setStyle(div, "transform", "translate(" + state.translation.x + "px, " + state.translation.y + "px)");
			}
		},

		u: function unmount() {
			detachNode(div);

			if (slot_content_default) {
				reinsertChildren(div, slot_content_default);
			}
		},

		d: function destroy$$1() {
			if (component.refs.container === div) component.refs.container = null;
		}
	};
}

function Overlay(options) {
	this._debugName = '<Overlay>';
	if (!options || (!options.target && !options.root)) throw new Error("'target' is a required option");
	init(this, options);
	this.refs = {};
	this._state = assign(data$3(), options.data);
	if (!('translation' in this._state)) console.warn("<Overlay> was created without expected data property 'translation'");

	this._slotted = options.slots || {};

	var _oncreate = oncreate$2.bind(this);

	if (!options.root) {
		this._oncreate = [_oncreate];
	} else {
	 	this.root._oncreate.push(_oncreate);
	 }

	this.slots = {};

	this._fragment = create_main_fragment$3(this._state, this);

	if (options.target) {
		var nodes = children(options.target);
		options.hydrate ? this._fragment.l(nodes) : this._fragment.c();
		nodes.forEach(detachNode);
		this._fragment.m(options.target, options.anchor || null);

		callAll(this._oncreate);
	}
}

assign(Overlay.prototype, protoDev);

Overlay.prototype._checkReadOnly = function _checkReadOnly(newState) {
};

/* src\App.html generated by Svelte v1.51.0 */
const API_KEY = "AIzaSyD7oUvzDD-eXoWc91eECCa0eMHmHVZb1Cg";
const RICHMOND = { lat: 37.540725, lng: -77.436048 };

function data() {
  return {
    map: new Context(API_KEY, { beta: true }),
    center: RICHMOND,
    zoom: 11,
    positions: [
      { lat: 37.540725, lng: -77.336048 },
      { lat: 37.540725, lng: -77.236048 }
    ],
    offset(container) {
      const { offsetWidth: width } = container;
      return { x: -width / 2, y: 10 };
    }
  };
}

function encapsulateStyles(node) {
	setAttribute(node, "svelte-4177244775", "");
}

function create_main_fragment(state, component) {
	var div, h1, text, text_1, div_1, text_2, text_3, text_4, text_5, text_6, div_2, h4, text_7, text_8, label, text_9, text_10, input, text_11, text_12, text_14, text_15, map_updating = {}, text_17, p, text_18, text_19_value = state.center.lat.toFixed(6), text_19, text_20, text_21_value = state.center.lng.toFixed(6), text_21, text_22, label_1, text_23, text_24, input_1, text_25, text_26;

	var marker = new Marker({
		root: component.root,
		data: {
			map: state.map,
			position: state.center,
			title: "Richmond, VA"
		}
	});

	var marker_1 = new Marker({
		root: component.root,
		data: {
			map: state.map,
			position: state.positions[0],
			label: "A"
		}
	});

	var marker_2 = new Marker({
		root: component.root,
		data: {
			map: state.map,
			position: state.positions[1],
			icon: "https://maps.google.com/mapfiles/kml/shapes/parking_lot_maps.png"
		}
	});

	function input_input_handler() {
		component.set({ zoom: toNumber(input.value) });
	}

	function input_change_handler() {
		component.set({ zoom: toNumber(input.value) });
	}

	var overlay = new Overlay({
		root: component.root,
		slots: { default: createFragment() },
		data: {
			map: state.map,
			position: state.center,
			offset: state.offset
		}
	});

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
			map_updating = assign({}, changed);
			component._set(newState);
			map_updating = {};
		}
	});

	component.root._beforecreate.push(function() {
		var state = component.get(), childState = map.get(), newState = {};
		if (!childState) return;
		if (!map_updating.center) {
			newState.center = childState.center;
		}

		if (!map_updating.zoom) {
			newState.zoom = childState.zoom;
		}
		map_updating = { center: true, zoom: true };
		component._set(newState);
		map_updating = {};
	});

	function input_1_input_handler() {
		component.set({ zoom: toNumber(input_1.value) });
	}

	function input_1_change_handler() {
		component.set({ zoom: toNumber(input_1.value) });
	}

	return {
		c: function create() {
			div = createElement("div");
			h1 = createElement("h1");
			text = createText("Pulse Map");
			text_1 = createText("\n\n  ");
			div_1 = createElement("div");
			text_2 = createText("\n      ");
			marker._fragment.c();
			text_3 = createText("\n      ");
			marker_1._fragment.c();
			text_4 = createText("\n      ");
			marker_2._fragment.c();
			text_5 = createText("\n      \n      ");
			text_6 = createText("\n        ");
			div_2 = createElement("div");
			h4 = createElement("h4");
			text_7 = createText("Overlay");
			text_8 = createText("\n          ");
			label = createElement("label");
			text_9 = createText("Zoom");
			text_10 = createText(": ");
			input = createElement("input");
			text_11 = createText(" ");
			text_12 = createText(state.zoom);
			text_14 = createText("\n      ");
			overlay._fragment.c();
			text_15 = createText("\n    ");
			map._fragment.c();
			text_17 = createText("\n\n  ");
			p = createElement("p");
			text_18 = createText("Latitude: ");
			text_19 = createText(text_19_value);
			text_20 = createText(" —\n    Longitude: ");
			text_21 = createText(text_21_value);
			text_22 = createText(" —\n    ");
			label_1 = createElement("label");
			text_23 = createText("Zoom");
			text_24 = createText(": ");
			input_1 = createElement("input");
			text_25 = createText(" ");
			text_26 = createText(state.zoom);
			this.h();
		},

		l: function claim(nodes) {
			div = claimElement(nodes, "DIV", { class: true }, false);
			var div_nodes = children(div);

			h1 = claimElement(div_nodes, "H1", { class: true }, false);
			var h1_nodes = children(h1);

			text = claimText(h1_nodes, "Pulse Map");
			h1_nodes.forEach(detachNode);
			text_1 = claimText(div_nodes, "\n\n  ");

			div_1 = claimElement(div_nodes, "DIV", {}, false);
			var div_1_nodes = children(div_1);

			text_2 = claimText(nodes, "\n      ");
			marker._fragment.l(nodes);
			text_3 = claimText(nodes, "\n      ");
			marker_1._fragment.l(nodes);
			text_4 = claimText(nodes, "\n      ");
			marker_2._fragment.l(nodes);
			text_5 = claimText(nodes, "\n      \n      ");
			text_6 = claimText(nodes, "\n        ");

			div_2 = claimElement(nodes, "DIV", { class: true }, false);
			var div_2_nodes = children(div_2);

			h4 = claimElement(div_2_nodes, "H4", {}, false);
			var h4_nodes = children(h4);

			text_7 = claimText(h4_nodes, "Overlay");
			h4_nodes.forEach(detachNode);
			text_8 = claimText(div_2_nodes, "\n          ");

			label = claimElement(div_2_nodes, "LABEL", { for: true }, false);
			var label_nodes = children(label);

			text_9 = claimText(label_nodes, "Zoom");
			label_nodes.forEach(detachNode);
			text_10 = claimText(div_2_nodes, ": ");

			input = claimElement(div_2_nodes, "INPUT", { type: true, min: true, max: true, class: true }, false);
			var input_nodes = children(input);

			input_nodes.forEach(detachNode);
			text_11 = claimText(div_2_nodes, " ");
			text_12 = claimText(div_2_nodes, state.zoom);
			div_2_nodes.forEach(detachNode);
			text_14 = claimText(nodes, "\n      ");
			overlay._fragment.l(nodes);
			text_15 = claimText(nodes, "\n    ");
			map._fragment.l(div_1_nodes);
			div_1_nodes.forEach(detachNode);
			text_17 = claimText(div_nodes, "\n\n  ");

			p = claimElement(div_nodes, "P", { class: true }, false);
			var p_nodes = children(p);

			text_18 = claimText(p_nodes, "Latitude: ");
			text_19 = claimText(p_nodes, text_19_value);
			text_20 = claimText(p_nodes, " —\n    Longitude: ");
			text_21 = claimText(p_nodes, text_21_value);
			text_22 = claimText(p_nodes, " —\n    ");

			label_1 = claimElement(p_nodes, "LABEL", { for: true }, false);
			var label_1_nodes = children(label_1);

			text_23 = claimText(label_1_nodes, "Zoom");
			label_1_nodes.forEach(detachNode);
			text_24 = claimText(p_nodes, ": ");

			input_1 = claimElement(p_nodes, "INPUT", { type: true, min: true, max: true, class: true }, false);
			var input_1_nodes = children(input_1);

			input_1_nodes.forEach(detachNode);
			text_25 = claimText(p_nodes, " ");
			text_26 = claimText(p_nodes, state.zoom);
			p_nodes.forEach(detachNode);
			div_nodes.forEach(detachNode);
			this.h();
		},

		h: function hydrate() {
			h1.className = "mb-3 mt-6";
			encapsulateStyles(div_1);
			setAttribute(div_1, "svelte-ref-container", "");
			label.htmlFor = "zoom";
			addListener(input, "input", input_input_handler);
			addListener(input, "change", input_change_handler);
			input.type = "range";
			input.min = "1";
			input.max = "12";
			input.className = "align-text-top";
			div_2.className = "p-4 bg-white";
			label_1.htmlFor = "zoom";
			addListener(input_1, "input", input_1_input_handler);
			addListener(input_1, "change", input_1_change_handler);
			input_1.type = "range";
			input_1.min = "1";
			input_1.max = "12";
			input_1.className = "align-text-top";
			p.className = "mt-4 text-center";
			div.className = "max-w-md mx-auto";
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			appendNode(h1, div);
			appendNode(text, h1);
			appendNode(text_1, div);
			appendNode(div_1, div);
			appendNode(text_2, map._slotted.default);
			marker._mount(map._slotted.default, null);
			appendNode(text_3, map._slotted.default);
			marker_1._mount(map._slotted.default, null);
			appendNode(text_4, map._slotted.default);
			marker_2._mount(map._slotted.default, null);
			appendNode(text_5, map._slotted.default);
			appendNode(text_6, overlay._slotted.default);
			appendNode(div_2, overlay._slotted.default);
			appendNode(h4, div_2);
			appendNode(text_7, h4);
			appendNode(text_8, div_2);
			appendNode(label, div_2);
			appendNode(text_9, label);
			appendNode(text_10, div_2);
			appendNode(input, div_2);

			input.value = state.zoom;

			appendNode(text_11, div_2);
			appendNode(text_12, div_2);
			appendNode(text_14, overlay._slotted.default);
			overlay._mount(map._slotted.default, null);
			appendNode(text_15, map._slotted.default);
			map._mount(div_1, null);
			component.refs.container = div_1;
			appendNode(text_17, div);
			appendNode(p, div);
			appendNode(text_18, p);
			appendNode(text_19, p);
			appendNode(text_20, p);
			appendNode(text_21, p);
			appendNode(text_22, p);
			appendNode(label_1, p);
			appendNode(text_23, label_1);
			appendNode(text_24, p);
			appendNode(input_1, p);

			input_1.value = state.zoom;

			appendNode(text_25, p);
			appendNode(text_26, p);
		},

		p: function update(changed, state) {
			var marker_changes = {};
			if (changed.map) marker_changes.map = state.map;
			if (changed.center) marker_changes.position = state.center;
			marker._set(marker_changes);

			var marker_1_changes = {};
			if (changed.map) marker_1_changes.map = state.map;
			if (changed.positions) marker_1_changes.position = state.positions[0];
			marker_1._set(marker_1_changes);

			var marker_2_changes = {};
			if (changed.map) marker_2_changes.map = state.map;
			if (changed.positions) marker_2_changes.position = state.positions[1];
			marker_2._set(marker_2_changes);

			input.value = state.zoom;
			input.value = state.zoom;
			if (changed.zoom) {
				text_12.data = state.zoom;
			}

			var overlay_changes = {};
			if (changed.map) overlay_changes.map = state.map;
			if (changed.center) overlay_changes.position = state.center;
			if (changed.offset) overlay_changes.offset = state.offset;
			overlay._set(overlay_changes);

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

			if ((changed.center) && text_19_value !== (text_19_value = state.center.lat.toFixed(6))) {
				text_19.data = text_19_value;
			}

			if ((changed.center) && text_21_value !== (text_21_value = state.center.lng.toFixed(6))) {
				text_21.data = text_21_value;
			}

			input_1.value = state.zoom;
			input_1.value = state.zoom;
			if (changed.zoom) {
				text_26.data = state.zoom;
			}
		},

		u: function unmount() {
			detachNode(div);
		},

		d: function destroy$$1() {
			marker.destroy(false);
			marker_1.destroy(false);
			marker_2.destroy(false);
			removeListener(input, "input", input_input_handler);
			removeListener(input, "change", input_change_handler);
			overlay.destroy(false);
			map.destroy(false);
			if (component.refs.container === div_1) component.refs.container = null;
			removeListener(input_1, "input", input_1_input_handler);
			removeListener(input_1, "change", input_1_change_handler);
		}
	};
}

function App(options) {
	this._debugName = '<App>';
	if (!options || (!options.target && !options.root)) throw new Error("'target' is a required option");
	init(this, options);
	this.refs = {};
	this._state = assign(data(), options.data);
	if (!('map' in this._state)) console.warn("<App> was created without expected data property 'map'");
	if (!('center' in this._state)) console.warn("<App> was created without expected data property 'center'");
	if (!('zoom' in this._state)) console.warn("<App> was created without expected data property 'zoom'");
	if (!('positions' in this._state)) console.warn("<App> was created without expected data property 'positions'");
	if (!('offset' in this._state)) console.warn("<App> was created without expected data property 'offset'");

	if (!options.root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment(this._state, this);

	if (options.target) {
		var nodes = children(options.target);
		options.hydrate ? this._fragment.l(nodes) : this._fragment.c();
		nodes.forEach(detachNode);
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(App.prototype, protoDev);

App.prototype._checkReadOnly = function _checkReadOnly(newState) {
};

const app = new App({
  target: document.getElementById('app')
});

return app;

}());
//# sourceMappingURL=bundle.js.map
