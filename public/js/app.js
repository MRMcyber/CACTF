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

  var statCounters = document.querySelectorAll('.stat-item h3[data-count]');
  if (statCounters.length) {
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var statsBand = document.querySelector('.stats-band');

    function formatCounter(counter, value) {
      var decimals = Number(counter.dataset.countDecimals || 0);
      return (counter.dataset.countPrefix || '') + Number(value).toFixed(decimals) + (counter.dataset.countSuffix || '');
    }

    function animateStat(counter) {
      var target = Number(counter.dataset.count);
      var decimals = Number(counter.dataset.countDecimals || 0);
      var prefix = counter.dataset.countPrefix || '';
      var suffix = counter.dataset.countSuffix || '';

      if (reducedMotion || !('requestAnimationFrame' in window)) {
        counter.textContent = prefix + Number(target).toFixed(decimals) + suffix;
        return;
      }

      counter.textContent = prefix + Number(0).toFixed(decimals) + suffix;
      var start = null;
      var duration = 1400;

      function tick(timestamp) {
        if (start === null) start = timestamp;
        var progress = Math.min((timestamp - start) / duration, 1);
        var easeOut = 1 - Math.pow(1 - progress, 3);
        var currentValue = target * easeOut;
        counter.textContent = prefix + Number(currentValue).toFixed(decimals) + suffix;

        if (progress < 1) {
          window.requestAnimationFrame(tick);
        }
      }

      window.requestAnimationFrame(tick);
    }

    if (reducedMotion) {
      statCounters.forEach(function(counter) { animateStat(counter); });
    } else if (statsBand && 'IntersectionObserver' in window) {
      var statsObserver = new IntersectionObserver(function(entries, observer) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            statCounters.forEach(function(counter) { animateStat(counter); });
            observer.disconnect();
          }
        });
      }, { threshold: 0.35 });

      statsObserver.observe(statsBand);
    } else {
      statCounters.forEach(function(counter) { animateStat(counter); });
    }
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
