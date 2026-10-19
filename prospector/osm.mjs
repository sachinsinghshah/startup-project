// Find local businesses in OpenStreetMap: free, no API key, open data (ODbL; credit "© OpenStreetMap contributors").
// Uses Nominatim to turn a city name into an area, then Overpass to list businesses with a given tag.
// Both are community services: keep requests few and identify yourself (User-Agent with your email).

export const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
export const OVERPASS = 'https://overpass-api.de/api/interpreter';

// OSM tags for each niche (a business matches if it has any of them).
export const NICHE_TAGS = {
  plumber: [['craft', 'plumber']],
  hvac: [['craft', 'hvac'], ['craft', 'heating_engineer']],
  roofer: [['craft', 'roofer']],
  electrician: [['craft', 'electrician']],
  dentist: [['amenity', 'dentist'], ['healthcare', 'dentist']],
  physio: [['healthcare', 'physiotherapist']],
  painter: [['craft', 'painter']],
  carpenter: [['craft', 'carpenter']],
  locksmith: [['craft', 'locksmith'], ['shop', 'locksmith']],
  gardener: [['craft', 'gardener']],
  vet: [['amenity', 'veterinary']],
  hairdresser: [['shop', 'hairdresser']],
  beauty: [['shop', 'beauty']],
  car_repair: [['shop', 'car_repair']],
  lawyer: [['office', 'lawyer']],
  accountant: [['office', 'accountant']],
};

// Overpass area ids are the OSM id plus a fixed offset for relations/ways.
export function areaIdFromNominatim(result) {
  if (!result) return null;
  const id = Number(result.osm_id);
  if (result.osm_type === 'relation') return 3600000000 + id;
  if (result.osm_type === 'way') return 2400000000 + id;
  return null;
}

export function buildQuery(areaId, tags) {
  const parts = tags.map(([k, v]) => `nwr["${k}"="${v}"](area.a);`).join('');
  return `[out:json][timeout:90];area(id:${areaId})->.a;(${parts});out center tags;`;
}

const pick = (t, ...keys) => keys.map(k => t[k]).find(Boolean) || '';

export function toLeadRows(elements, { city, niche }) {
  const seen = new Set();
  const rows = [];
  for (const el of elements || []) {
    const t = el.tags || {};
    if (!t.name || t.disused || t['disused:shop'] || t['disused:craft']) continue;
    const row = {
      name: t.name,
      website: pick(t, 'website', 'contact:website', 'url'),
      city: city || pick(t, 'addr:city'),
      phone: pick(t, 'phone', 'contact:phone', 'contact:mobile'),
      niche: niche || '',
      email: pick(t, 'email', 'contact:email'),
      address: [t['addr:housenumber'], t['addr:street'], t['addr:city'], t['addr:postcode']].filter(Boolean).join(' '),
      osm_id: `${el.type}/${el.id}`,
    };
    const key = `${row.name.toLowerCase()}|${row.phone}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }
  return rows;
}

export async function findOsmBusinesses({ city, niche, userAgent, fetchImpl = fetch }) {
  const tags = NICHE_TAGS[niche];
  if (!tags) throw new Error(`unknown niche "${niche}". Use one of: ${Object.keys(NICHE_TAGS).join(', ')}`);
  const headers = { 'user-agent': userAgent, accept: 'application/json' };

  const geo = await fetchImpl(`${NOMINATIM}?${new URLSearchParams({ q: city, format: 'json', limit: '5' })}`, { headers });
  if (!geo.ok) throw new Error(`Nominatim ${geo.status}`);
  const results = await geo.json();
  const area = results.map(r => ({ r, id: areaIdFromNominatim(r) })).find(x => x.id);
  if (!area) throw new Error(`couldn't find an area for "${city}". Try "City, State, Country".`);

  const res = await fetchImpl(OVERPASS, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: buildQuery(area.id, tags) }),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status} (busy? wait a minute and retry)`);
  const json = await res.json();
  return { areaName: area.r.display_name, rows: toLeadRows(json.elements, { city, niche }) };
}
