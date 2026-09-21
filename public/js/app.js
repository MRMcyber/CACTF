// CACTF Platform - Client Runtime
document.addEventListener('DOMContentLoaded', function() {
  // Auto-dismiss alerts
  document.querySelectorAll('.alert').forEach(function(el) {
    setTimeout(function() {
      el.style.transition = 'opacity .3s ease';
      el.style.opacity = '0';
      setTimeout(function() { el.remove(); }, 300);
    }, 6000);
  });
});
