/**
 * Test for artist slug utility functions
 * Tests clean URL generation and artist lookup functionality
 */

const { generateArtistSlug, slugToSearchTerm, findArtistBySlugOrId, isUUID, isArtistSlug } = require('../../client/src/utils/artistSlug.ts');

// Test data
const testArtists = [
  { id: 'abc-123-def-456', name: 'Nova Sterling' },
  { id: 'xyz-789-ghi-012', name: 'Alex Thunder' },
  { id: 'def-345-jkl-678', name: 'Maya Rose' },
  { id: 'ghi-901-mno-234', name: 'DJ X-Factor' },
  { id: 'jkl-567-pqr-890', name: 'The Amazing Grace' }
];

console.log('=== Testing Artist Slug Generation ===');
testArtists.forEach(artist => {
  const slug = generateArtistSlug(artist.name);
  console.log(`"${artist.name}" -> "${slug}"`);
});

console.log('\n=== Testing Special Characters ===');
const specialCases = [
  'DJ X-Factor',
  'The Amazing Grace',
  'Artist & Co.',
  'Nova Sterling!',
  'Multi   Spaces'
];
specialCases.forEach(name => {
  const slug = generateArtistSlug(name);
  console.log(`"${name}" -> "${slug}"`);
});

console.log('\n=== Testing UUID Detection ===');
const testParams = [
  'abc-123-def-456',
  'nova-sterling',
  'alex-thunder',
  '12345',
  'artist-name-with-many-words'
];
testParams.forEach(param => {
  console.log(`"${param}" is UUID: ${isUUID(param)}, is slug: ${isArtistSlug(param)}`);
});

console.log('\n=== Testing Artist Lookup ===');
console.log('Lookup by UUID:', findArtistBySlugOrId(testArtists, 'abc-123-def-456')?.name || 'Not found');
console.log('Lookup by slug "nova-sterling":', findArtistBySlugOrId(testArtists, 'nova-sterling')?.name || 'Not found');
console.log('Lookup by slug "alex-thunder":', findArtistBySlugOrId(testArtists, 'alex-thunder')?.name || 'Not found');
console.log('Lookup by slug "dj-x-factor":', findArtistBySlugOrId(testArtists, 'dj-x-factor')?.name || 'Not found');
console.log('Lookup invalid:', findArtistBySlugOrId(testArtists, 'non-existent')?.name || 'Not found');

console.log('\n=== Testing Slug to Search Term ===');
['nova-sterling', 'alex-thunder', 'dj-x-factor', 'the-amazing-grace'].forEach(slug => {
  const searchTerm = slugToSearchTerm(slug);
  console.log(`"${slug}" -> "${searchTerm}"`);
});

console.log('\nAll tests completed!');