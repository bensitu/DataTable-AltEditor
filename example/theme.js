(function () {
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  let theme = 'system';
  try {
    const saved = localStorage.getItem('alteditor-example-theme');
    if (['system', 'light', 'dark'].includes(saved)) theme = saved;
  } catch (_error) {}

  function applyTheme() {
    document.documentElement.dataset.bsTheme =
      theme === 'system' ? (preference.matches ? 'dark' : 'light') : theme;
  }

  applyTheme();
  preference.addEventListener('change', applyTheme);
  document.addEventListener('DOMContentLoaded', function () {
    const label = document.createElement('label');
    label.className = 'example-theme';
    label.append('Appearance');
    const select = document.createElement('select');
    for (const [value, caption] of [
      ['system', 'System'],
      ['light', 'Light'],
      ['dark', 'Dark'],
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = caption;
      select.append(option);
    }
    select.value = theme;
    select.addEventListener('change', function () {
      theme = select.value;
      applyTheme();
      try {
        localStorage.setItem('alteditor-example-theme', theme);
      } catch (_error) {}
    });
    label.append(select);
    document.querySelector('.example-header').prepend(label);
  });
})();
