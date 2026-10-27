// Browser-only display preferences and signed-in identity. No database or GPS operations.
(() => {
 'use strict';
 const checkbox = document.getElementById('compact-view');
 const cards = document.getElementById('dashboard-cards');
 const journey = document.querySelector('#journey-summary .cards');
 const profile = document.getElementById('profile-status');
 const status = document.getElementById('compact-status');
 const show = document.getElementById('compact-show');
 if (!checkbox || !cards || !profile) return;
 const key = 'sg-vehicle-compact-v1';
 try { checkbox.checked = localStorage.getItem(key) === 'yes'; } catch {}
 function apply() {
  cards.classList.toggle('compact-cards', checkbox.checked);
  journey?.classList.toggle('compact-cards', checkbox.checked);
  if (status) status.textContent = checkbox.checked
   ? 'Compact summary ON — GPS and journey cards below use smaller text and spacing.'
   : 'Compact summary OFF — GPS and journey cards below use standard text and spacing.';
 }
 checkbox.addEventListener('change', () => {
  apply();
  try { localStorage.setItem(key, checkbox.checked ? 'yes' : 'no'); }
  catch { if (status) status.textContent += ' Storage unavailable; this preference lasts for this page session only.'; }
 });
 show?.addEventListener('click', () => {
  cards.scrollIntoView({behavior: 'smooth', block: 'start'});
  cards.focus({preventScroll: true});
 });
 apply();
 function refresh() {
  const email = window.sgVehicleFirebase?.currentUserEmail;
  profile.textContent = email ? 'Signed in as ' + email : 'Not signed in · Public traffic features remain available';
 }
 window.addEventListener('sg-auth-changed', refresh);
 refresh();
})();
