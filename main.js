// FAQ: keep one answer open at a time.
document.querySelectorAll('.faq details').forEach(function (d, _, all) {
  d.addEventListener('toggle', function () {
    if (!d.open) return;
    all.forEach(function (o) { if (o !== d) o.open = false; });
  });
});
