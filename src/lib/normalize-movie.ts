/* Shared movie item normalization — ensures consistent field names across all API routes
 *
 * The upstream API returns inconsistent field names:
 *   - Search: { id, title, image, ... } — NO vid, NO playingurl
 *   - Dashboard: { id, title, image, vid, ... } — has vid but field types vary
 *   - Preview: { id, video_title, playingUrl, ... } — uses camelCase
 *   - Library/Episodes: varies
 *
 * This utility normalizes ALL responses to a consistent format:
 *   { id, vid, title, image, subscriber, paid, vj, ldur, category_id, playingurl }
 */

export interface NormalizedMovie {
  id: number;
  vid: string;
  title: string;
  image: string;
  subscriber: string;
  paid: string;
  vj: string;
  ldur: string;
  category_id: number;
  playingurl: string;
}

/** Normalize a raw movie object from ANY upstream endpoint into a consistent format.
 *  Handles all field name variations and type inconsistencies.
 */
export function normalizeMovieItem(raw: Record<string, unknown>): NormalizedMovie {
  const id = Number(raw.id) || 0;
  return {
    id,
    vid: String(raw.vid || raw.id || ''),
    title: String(raw.title || raw.video_title || raw.episode_name || 'Unknown'),
    image: String(raw.image || raw.thumbnail || ''),
    subscriber: String(raw.subscriber ?? raw.issubscriber ?? ''),
    paid: String(raw.paid ?? raw.paid_for ?? ''),
    vj: String(raw.vj || raw.vjname || ''),
    ldur: String(raw.ldur || raw.duration || ''),
    category_id: Number(raw.category_id || raw.tab_category_id) || 0,
    playingurl: String(raw.playingurl || raw.playingUrl || ''),
  };
}

/** Normalize an array of raw movie objects */
export function normalizeMovieArray(items: unknown[]): NormalizedMovie[] {
  return items
    .filter((item): item is Record<string, unknown> =>
      item !== null && typeof item === 'object' && ('id' in item || 'vid' in item)
    )
    .map(normalizeMovieItem);
}
