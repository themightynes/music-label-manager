import React from 'react';
import { Artist } from '@shared/schema';

interface ArtistListProps {
  artists: any[];
  onArtistSelect?: (artist: any) => void;
}

export function ArtistList({ artists, onArtistSelect }: ArtistListProps) {
  if (!artists || artists.length === 0) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg text-center text-gray-400">
        No artists signed yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {artists.map(artist => (
        <div
          key={artist.id}
          onClick={() => onArtistSelect?.(artist)}
          className="p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-yellow-500 transition-colors cursor-pointer"
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-white">{artist.name}</h3>
              <p className="text-sm text-gray-400">{artist.archetype}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Popularity</div>
              <div className="font-semibold text-yellow-500">{artist.popularity}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}