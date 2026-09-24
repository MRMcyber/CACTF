// CACTF Platform - Client Runtime
document.addEventListener('DOMContentLoaded', function() {
  var nav = document.querySelector('.public-nav');
  var navToggle = document.querySelector('.nav-toggle');

  if (nav && navToggle) {
    navToggle.addEventListener('click', function() {
      var isOpen = nav.classList.toggle('menu-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });

    nav.querySelectorAll('.nav-links a').forEach(function(link) {
      link.addEventListener('click', function() {
        nav.classList.remove('menu-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open navigation menu');
      });
    });
  }

  var expandingButtons = document.querySelectorAll('.scroll-expand');
  if (expandingButtons.length && 'IntersectionObserver' in window) {
    var buttonObserver = new IntersectionObserver(function(entries, observer) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.7 });

    expandingButtons.forEach(function(button) { buttonObserver.observe(button); });
  }

  // Auto-dismiss alerts
  document.querySelectorAll('.alert').forEach(function(el) {
    setTimeout(function() {
      el.style.transition = 'opacity .3s ease';
      el.style.opacity = '0';
      setTimeout(function() { el.remove(); }, 300);
    }, 6000);
  });
});
