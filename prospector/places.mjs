// Find local businesses with the official Google Places API (New) Text Search.
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
// Requesting phone + website fields bills as "Text Search Enterprise" (free monthly cap, then paid),
// so keep --pages low and don't re-run the same query needlessly.

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELDS = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.nationalPhoneNumber',
  'places.internationalPhoneNumber', 'places.websiteUri', 'places.rating', 'places.userRatingCount',
  'places.businessStatus', 'nextPageToken',
].join(',');

export async function searchPlaces({ query, apiKey, pages = 1, fetchImpl = fetch }) {
  const places = [];
  let pageToken;
  for (let page = 0; page < pages; page++) {
    const res = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': FIELDS },
      body: JSON.stringify({ textQuery: query, pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
    });
    if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);
    const json = await res.json();
    places.push(...(json.places || []));
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }
  return places;
}

// "plumber in Austin, TX" → "Austin, TX"
export function cityFromQuery(query) {
  const m = String(query).match(/\b(?:in|near)\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

export function toLeadRows(places, { city, niche }) {
  return places
    .filter(p => p.businessStatus !== 'CLOSED_PERMANENTLY')
    .map(p => ({
      name: p.displayName?.text || '',
      website: p.websiteUri || '',
      city,
      phone: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
      niche: niche || '',
      rating: p.rating ?? '',
      reviews: p.userRatingCount ?? 0,
      address: p.formattedAddress || '',
      place_id: p.id || '',
    }))
    .filter(r => r.name);
}
