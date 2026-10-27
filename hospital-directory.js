// Public hospital contact directory. No sign-in, GPS, patient information or new API key required.
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const list = $('hospital-list'), search = $('hospital-search'), sector = $('hospital-sector'), kind = $('hospital-kind');
 const reset = $('hospital-reset'), retry = $('hospital-retry'), status = $('hospital-result-status');
 if (!list || !search || !sector || !kind || !reset || !retry || !status) return;
 let hospitals = [], loading = false;
 const normalise = value => String(value).toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim();
 function link(label, href) {
  const item = document.createElement('a'); item.textContent = label; item.href = href;
  if (href.startsWith('https:')) { item.target = '_blank'; item.rel = 'noopener noreferrer'; }
  return item;
 }
 function render() {
  const query = normalise(search.value);
  const matches = hospitals.filter(hospital =>
   (sector.value === 'all' || hospital.sector === sector.value) &&
   (kind.value === 'all' || hospital.kind === kind.value) &&
   (!query || normalise([hospital.name, hospital.aliases, hospital.area, hospital.address].join(' ')).includes(query)));
  $('hospital-matching').textContent = String(matches.length);
  status.textContent = matches.length + ' of ' + hospitals.length + ' listed hospitals shown · A–Z';
  list.replaceChildren();
  for (const hospital of matches) {
   const card = document.createElement('article'); card.className = 'hospital-entry';
   const title = document.createElement('h3'); title.textContent = hospital.name;
   const meta = document.createElement('p'); meta.className = 'hospital-meta'; meta.textContent = [hospital.sector, hospital.kind, hospital.area].join(' · ');
   const address = document.createElement('address'); address.textContent = hospital.address;
   const contact = document.createElement('p');
   const number = '+65 ' + hospital.phone.slice(0, 4) + ' ' + hospital.phone.slice(4);
   contact.textContent = hospital.phone_label + ': ';
   const phone = link(number, 'tel:+65' + hospital.phone); phone.className = 'hospital-contact'; contact.append(phone);
   const actions = document.createElement('div'); actions.className = 'hospital-actions';
   const call = link('📞 Call', 'tel:+65' + hospital.phone); call.setAttribute('aria-label', 'Call ' + hospital.name + ' general enquiries');
   const directions = new URL('https://www.google.com/maps/dir/');
   directions.searchParams.set('api', '1'); directions.searchParams.set('destination', hospital.name + ', ' + hospital.address);
   const route = link('🧭 Directions ↗', directions.href); route.setAttribute('aria-label', 'Directions to ' + hospital.name + ' in Google Maps');
   const source = link('Official contact page ↗', hospital.source); source.setAttribute('aria-label', 'Official contact details for ' + hospital.name);
   actions.append(call, route, source); card.append(title, meta, address, contact, actions); list.append(card);
  }
  if (!matches.length) {
   const empty = document.createElement('p'); empty.textContent = 'No hospitals match. Try a name, abbreviation or postal code, or clear the filters.'; list.append(empty);
  }
 }
 async function load() {
  if (loading) return;
  loading = true; retry.hidden = true; status.textContent = 'Loading hospital directory…';
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000);
  try {
   const response = await fetch('./data/hospitals.json?v=3.2.0', {signal: controller.signal});
   if (!response.ok) throw new Error('Directory request failed');
   const data = await response.json();
   if (!Array.isArray(data.hospitals) || !data.hospitals.length || !/^\d{4}-\d{2}-\d{2}$/.test(data.checked)) throw new Error('Invalid directory');
   const valid = data.hospitals.every(h =>
    ['name', 'aliases', 'area', 'address', 'phone_label', 'source'].every(key => typeof h[key] === 'string' && h[key].length > 0) &&
    /^\d{8}$/.test(h.phone) && ['Public', 'Private'].includes(h.sector) && ['General', 'Community', 'Specialist'].includes(h.kind) &&
    h.source.startsWith('https://') && h.checked === data.checked);
   if (!valid) throw new Error('Invalid directory entry');
   hospitals = data.hospitals.slice().sort((a, b) => a.name.localeCompare(b.name));
   $('hospital-total').textContent = String(hospitals.length);
   $('hospital-public').textContent = String(hospitals.filter(h => h.sector === 'Public').length);
   $('hospital-private').textContent = String(hospitals.filter(h => h.sector === 'Private').length);
   const checked = new Date(data.checked + 'T00:00:00+08:00').toLocaleDateString('en-SG', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore'});
   $('hospital-checked').textContent = 'Contact details checked ' + checked + ' against official hospital or healthcare-group pages. Selected hospitals only; not a complete national register or live availability feed.';
   render();
  } catch {
   status.textContent = 'Hospital directory could not load. Check your connection and tap Retry directory.';
   retry.hidden = false;
  } finally { clearTimeout(timer); loading = false; }
 }
 search.addEventListener('input', render); sector.addEventListener('change', render); kind.addEventListener('change', render);
 reset.addEventListener('click', () => { search.value = ''; sector.value = 'all'; kind.value = 'all'; if (hospitals.length) render(); search.focus(); });
 retry.addEventListener('click', load);
 void load();
})();
