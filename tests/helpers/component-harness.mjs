import { setImmediate } from 'node:timers/promises';

export function componentHarness() {
  const slots = [];
  let cursor = 0;
  let component;
  let props;
  let tree;
  let dirty = false;
  let effects = [];
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; dirty = true; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useId() { return `test-id-${cursor++}`; },
    useEffect(callback, dependencies) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
        effects.push(() => {
          previous?.cleanup?.();
          slots[index] = { dependencies, cleanup: callback() };
        });
      }
    },
  };
  function render() {
    cursor = 0;
    effects = [];
    dirty = false;
    tree = component(props);
    effects.forEach(effect => effect());
    return tree;
  }
  return {
    hooks,
    mount(value, initialProps) { component = value; props = initialProps; return render(); },
    render,
    get tree() { return tree; },
    async settle() {
      for (let i = 0; i < 4; i++) { await setImmediate(); if (dirty) render(); }
      return tree;
    },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

export function nodes(tree, predicate) {
  if (tree === null || tree === undefined || typeof tree === 'boolean') return [];
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
  if (typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}

export function content(tree) {
  if (tree === null || tree === undefined || typeof tree === 'boolean') return '';
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  if (Array.isArray(tree)) return tree.map(content).join(' ');
  return content(tree.props?.children);
}
