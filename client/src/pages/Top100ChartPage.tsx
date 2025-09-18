import React from 'react';
import { Top100ChartDisplay } from '../components/Top100ChartDisplay';
import GameLayout from '@/layouts/GameLayout';

export function Top100ChartPage() {
  return (
    <GameLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Top100ChartDisplay />
      </div>
    </GameLayout>
  );
}

export default Top100ChartPage;