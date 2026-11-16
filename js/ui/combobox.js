// Accessible autocomplete (ARIA 1.2 combobox with listbox popup).
// Arrow keys move through options, Enter selects, Escape closes.

export function combobox({ input, list, search, onSelect, onStatus }) {
  let items = [];
  let active = -1;

  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }

  function render() {
    list.innerHTML = '';
    items.forEach((it, i) => {
      const li = document.createElement('li');
      li.id = `${list.id}-opt-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', i === active ? 'true' : 'false');
      li.innerHTML = `<span>${it.label}</span>${it.sub ? `<span class="sub">${it.sub}</span>` : ''}`;
      li.addEventListener('mousedown', (e) => e.preventDefault());
      li.addEventListener('click', () => choose(i));
      list.appendChild(li);
    });
    const open = items.length > 0;
    list.hidden = !open;
    input.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', `${list.id}-opt-${active}`);
      const el = list.children[active];
      if (el) el.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  }

  function update() {
    const q = input.value;
    items = q.trim() ? search(q).slice(0, 12) : [];
    active = items.length ? 0 : -1;
    render();
    if (onStatus && q.trim()) onStatus(items.length);
  }

  function choose(i) {
    const it = items[i];
    if (!it) return;
    input.value = it.label;
    close();
    onSelect(it);
  }

  input.addEventListener('input', update);
  input.addEventListener('focus', () => { if (input.value.trim()) update(); });
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (list.hidden) update();
      else if (items.length) { active = (active + 1) % items.length; render(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length) { active = (active - 1 + items.length) % items.length; render(); }
    } else if (e.key === 'Enter') {
      if (!list.hidden && active >= 0) { e.preventDefault(); choose(active); }
      else if (input.value.trim()) {
        const r = search(input.value);
        if (r.length) { e.preventDefault(); items = r; choose(0); }
      }
    } else if (e.key === 'Escape') {
      if (!list.hidden) { e.preventDefault(); e.stopPropagation(); close(); }
    }
  });

  return { close, clear() { input.value = ''; close(); } };
}
