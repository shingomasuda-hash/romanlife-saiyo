(() => {
  const items = document.querySelectorAll('[data-reveal]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    items.forEach((item) => observer.observe(item));
  }

  const sticky = document.querySelector('.sticky-entry');
  const hero = document.querySelector('.rl-hero');
  const entry = document.querySelector('.rl-entry');
  if (sticky && hero && entry) {
    const syncSticky = () => {
      const heroBottom = hero.getBoundingClientRect().bottom;
      const entryTop = entry.getBoundingClientRect().top;
      sticky.hidden = heroBottom > 140 || entryTop < window.innerHeight * 0.72;
    };
    syncSticky();
    window.addEventListener('scroll', syncSticky, { passive: true });
    window.addEventListener('resize', syncSticky);
  }
})();
