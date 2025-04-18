// src/app/repositories/page.tsx
import RepositoriesList from '@/app/components/Repositories/RepositoriesList';
import { Navigation } from '../components/Navigation/Navigation';

export default function RepositoriesPage() {
  return (
    <div>
      < Navigation />
      <RepositoriesList />
    </div>
  );
}