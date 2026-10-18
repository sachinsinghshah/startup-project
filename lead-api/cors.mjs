// Demo and client sites live on their own domains, so the lead endpoint must allow cross-origin POSTs.
export const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};
