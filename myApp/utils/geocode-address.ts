/**
 * Геокодирование адреса офиса (город + улица) в WGS84 через Nominatim (OSM).
 * На вебе при блокировке CORS вернётся null — метка офиса тогда только с координат из API.
 */
export async function geocodeOfficeAddress(city: string, address: string): Promise<{ lat: number; lng: number } | null> {
  const c = city?.trim() ?? '';
  const a = address?.trim() ?? '';
  const q = c && a ? `${c}, ${a}` : c || a;
  if (!q) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'RostelecomDtsu/1.0 (employee-app)',
      },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return parseNominatimFirst(data);
  } catch {
    return null;
  }
}

function parseNominatimFirst(data: unknown): { lat: number; lng: number } | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as { lat?: string; lon?: string };
  const lat = parseFloat(String(row.lat ?? ''));
  const lng = parseFloat(String(row.lon ?? ''));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
