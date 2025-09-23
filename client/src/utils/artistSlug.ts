/**
 * Artist slug utility functions for clean URLs
 * Converts artist names to URL-friendly slugs and vice versa
 */

/**
 * Convert artist name to URL-friendly slug
 * "Nova Sterling" -> "nova-sterling"
 */
export function generateArtistSlug(artistName: string): string {
  return artistName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Convert slug back to a searchable format
 * "nova-sterling" -> "nova sterling" (for case-insensitive matching)
 */
export function slugToSearchTerm(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/-/g, ' ')
    .trim();
}

/**
 * Check if a parameter is likely a UUID (ID) vs a name slug
 */
export function isUUID(param: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(param);
}

/**
 * Check if a parameter looks like an artist slug
 */
export function isArtistSlug(param: string): boolean {
  // Artist slugs should only contain lowercase letters, numbers, and hyphens
  const slugRegex = /^[a-z0-9-]+$/;
  return !isUUID(param) && slugRegex.test(param) && param.length > 0;
}

/**
 * Find artist by name (case-insensitive)
 */
export function findArtistByName(artists: any[], searchName: string): any | null {
  const normalizedSearch = searchName.toLowerCase().trim();

  return artists.find(artist =>
    artist.name.toLowerCase().trim() === normalizedSearch
  ) || null;
}

/**
 * Find artist by slug or ID (backwards compatibility)
 */
export function findArtistBySlugOrId(artists: any[], param: string): any | null {
  // Try ID lookup first if it looks like a UUID
  if (isUUID(param)) {
    return artists.find(artist => artist.id === param) || null;
  }

  // Try slug lookup
  if (isArtistSlug(param)) {
    const searchName = slugToSearchTerm(param);
    return findArtistByName(artists, searchName);
  }

  return null;
}