(() => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('#site-navigation');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js-motion');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.setAttribute('aria-label', open ? 'Open navigation' : 'Close navigation');
      nav.classList.toggle('is-open', !open);
    });
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open navigation');
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open navigation');
        toggle.focus();
      }
    });
  }

  const revealItems = document.querySelectorAll('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries, activeObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          activeObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
    revealItems.forEach((item) => observer.observe(item));
  }
})();
