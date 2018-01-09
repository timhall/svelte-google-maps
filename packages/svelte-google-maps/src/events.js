import { defer } from './utils';

const supported = typeof IntersectionObserver !== 'undefined' && typeof WeakMap !== 'undefined';

let observer, listeners;
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

export function intersection(node, callback) {
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
