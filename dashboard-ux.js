// Navigation and local overview only. No new network requests or location collection.
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const nav = document.querySelector('.bottom-nav');
 function text(id, value) { const node = $(id); if (node && node.textContent !== value) node.textContent = value; }
 function count(key) {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.length : 0; }
  catch { return 0; }
 }
 function update() {
  text('home-gps', $('gps')?.textContent || 'Unavailable');
  const feeds = ['incident-health', 'speed-health'].map(id => $(id)?.textContent || '');
  const feed = feeds.join(' ');
  text('home-traffic', /stale/i.test(feed) ? 'Delayed' : /unavailable|missing/i.test(feed) ? 'Unavailable' : feeds.every(value => /current/i.test(value)) ? 'Current snapshots' : 'Checking…');
  text('home-favourites', count('sg-vehicle-favourite-cameras-v1') + ' saved');
  text('home-destinations', count('sg-vehicle-destinations-v1') + ' saved');
 }
 function reveal(id, focus = true) {
  const target = $(id);
  if (!target) return;
  // Open the destination section and any containing disclosure before scrolling.
  for (let parent = target; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
  const details = target.querySelector(':scope > details');
  if (details) details.open = true;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block: 'start'});
  if (focus) {
   const heading = details?.querySelector('summary') || target;
   if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
   heading.focus({preventScroll: true});
  }
  nav?.querySelectorAll('a').forEach(link => {
   if (link.getAttribute('href') === '#' + id) link.setAttribute('aria-current', 'location');
   else link.removeAttribute('aria-current');
  });
 }
 document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const id = link.getAttribute('href').slice(1);
  if (!$(id)) return;
  event.preventDefault();
  if (link.id === 'home-favourites-link') {
   const filter = $('camera-favourites-only');
   if (filter) { filter.checked = true; filter.dispatchEvent(new Event('change')); }
   // Saved cameras should not be hidden by an earlier search or area filter.
   if ($('camera-search')) { $('camera-search').value = ''; $('camera-search').dispatchEvent(new Event('input')); }
   if ($('camera-area')) { $('camera-area').value = 'all'; $('camera-area').dispatchEvent(new Event('change')); }
  }
  history.replaceState(null, '', '#' + id);
  reveal(id);
 });
 window.addEventListener('hashchange', () => reveal(location.hash.slice(1), false));
 window.addEventListener('storage', update);
 const observer = new MutationObserver(update);
 for (const id of ['gps', 'incident-health', 'speed-health', 'camera-grid', 'destination-list']) {
  if ($(id)) observer.observe($(id), {childList: true, characterData: true, subtree: true});
 }
 update();
 if (location.hash) requestAnimationFrame(() => reveal(location.hash.slice(1), false));
})();
