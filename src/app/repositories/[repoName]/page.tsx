// src/app/repositories/[repoName]/page.tsx
import RepositoryDetails from '@/app/components/Repositories/RepositoryDetails';
import { getPublicRepositories } from '@/app/utils/github';
import type { Metadata } from 'next';

interface RepositoryPageProps {
  params: {
    repoName: string;
  };
}

// --- generateMetadata (asumimos que está bien o simplificado) ---
export async function generateMetadata({ params }: RepositoryPageProps): Promise<Metadata> {
  if (!params || typeof params.repoName !== 'string') {
    return { title: "Error" };
  }
  return {
    title: `Repositorio: ${params.repoName}`,
  };
}

// --- generateStaticParams (asumimos que está bien) ---
export async function generateStaticParams() {
  // ... tu lógica para obtener los repoNames ...
  try {
    const repositories = await getPublicRepositories();
    return repositories.map((repo) => ({
      repoName: repo.name,
    }));
  } catch (error) {
    console.error("Error in generateStaticParams:", error);
    return [];
  }
}

// --- Componente de la Página ---
export default function RepositoryPage({ params }: RepositoryPageProps) {
  if (!params || typeof params.repoName !== 'string') {
    console.error("RepositoryPage - Invalid params received:", params);
    return (
      <div className="text-red-500 p-10">
        Error: No se pudo cargar el nombre del repositorio.
      </div>
    );
  }
  const repoName = params.repoName;

  return (
    // *** 1. El Layout va AQUÍ, envolviendo RepositoryDetails ***
    <div className="relative pb-16 bg-gradient-to-tl from-black via-zinc-600/20 to-black min-h-screen text-white">
       {/* NO hay padding aquí, se manejará dentro de RepositoryDetails o su contenido */}
          <RepositoryDetails repoName={repoName} />
    </div>
  );
}