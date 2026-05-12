document.querySelectorAll('[data-qty]').forEach((wrap) => {
  const input = wrap.querySelector('[data-qty-input]');
  const minus = wrap.querySelector('[data-qty-minus]');
  const plus = wrap.querySelector('[data-qty-plus]');
  const addBtn = wrap.parentElement.querySelector('.snipcart-add-item');

  const sync = () => {
    if (!addBtn) return;
    const v = Math.max(1, Math.min(parseInt(input.value, 10) || 1, parseInt(input.max, 10) || 12));
    input.value = v;
    addBtn.setAttribute('data-item-quantity', String(v));
  };

  minus?.addEventListener('click', () => {
    input.value = Math.max(parseInt(input.min, 10) || 1, (parseInt(input.value, 10) || 1) - 1);
    sync();
  });
  plus?.addEventListener('click', () => {
    input.value = Math.min(parseInt(input.max, 10) || 12, (parseInt(input.value, 10) || 1) + 1);
    sync();
  });
  input?.addEventListener('input', sync);
  sync();
});

document.addEventListener('snipcart.ready', () => {
  if (!window.Snipcart) return;
  try {
    window.Snipcart.api.session.setLanguage('es');
    window.Snipcart.api.session.setCurrency('mxn');
  } catch (_) {
    // older snipcart versions ignore unsupported locales gracefully
  }
});

document.addEventListener('snipcart.item.adding', (e) => {
  const item = e.detail?.item;
  if (!item) return;
  console.info('[ML] add to cart:', item.id, '×', item.quantity);
});
