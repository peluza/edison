import RepositoriesList from '@/app/components/Repositories/RepositoriesList';
import { Navigation } from '../components/Navigation/Navigation';

export const dynamic = 'force-dynamic'; // Force real-time updates for view counts

export default function RepositoriesPage() {
  return (
    <div>
      < Navigation />
      <RepositoriesList />
    </div>
  );
}