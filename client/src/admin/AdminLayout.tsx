import { Link } from 'wouter';
import GameLayout from '@/layouts/GameLayout';
import { withAdmin } from './withAdmin';

function AdminHome() {
  return (
    <GameLayout>
      <div className="p-6 text-white">
        <h1 className="text-2xl font-semibold mb-4">Admin Tools</h1>
        <p className="text-white/80 mb-6">Developer-only utilities. These may modify game state.</p>
        <div className="grid gap-3 max-w-lg">
          <Link href="/admin/quality-tester" className="text-[#D99696] hover:underline">Quality Tester</Link>
          <Link href="/admin/tour-variance-tester" className="text-[#D99696] hover:underline">Tour Variance Tester</Link>
          <Link href="/admin/popularity-tester" className="text-[#D99696] hover:underline">Popularity Tester</Link>
          <Link href="/admin/streaming-decay-tester" className="text-[#D99696] hover:underline">Streaming Decay Tester</Link>
          <Link href="/admin/markets-editor" className="text-[#D99696] hover:underline">Markets Editor</Link>
          <Link href="/admin/test-data" className="text-[#D99696] hover:underline">Test Data</Link>
          <Link href="/admin/tours-test" className="text-[#D99696] hover:underline">Tours Test</Link>
          <Link href="/admin/bug-reports" className="text-[#D99696] hover:underline">Bug Reports</Link>
        </div>
      </div>
    </GameLayout>
  );
}

export default AdminHome;
