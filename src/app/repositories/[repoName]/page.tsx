// src/app/repositories/[repoName]/page.tsx
import { notFound } from 'next/navigation'; // notFound puede que ya no sea necesario aquí directamente
// Importa el nuevo componente de detalles
import RepositoryDetails from '@/app/components/Repositories/RepositoryDetails';
// Solo necesitamos getPublicRepositories para generateStaticParams
import { getPublicRepositories } from '@/app/utils/github';

interface RepositoryPageProps {
  params: {
    repoName: string;
  };
}

// generateStaticParams se mantiene igual aquí
export async function generateStaticParams() {
  const repositories = await getPublicRepositories();
  console.log('--- generateStaticParams Results ---:', repositories.map(repo => ({ repoName: repo.name })));
  return repositories.map((repo) => ({
    repoName: repo.name,
  }));
}

// generateMetadata se mantiene igual aquí (o puedes buscar el repo específico si necesitas más datos)
export async function generateMetadata({ params }: RepositoryPageProps) {
   // Aquí podrías llamar a una función `getRepositoryDetails(params.repoName)` si la tuvieras
   // para obtener más información si fuera necesario para los metadatos.
   // Por ahora, usamos solo el nombre.
  return {
    title: `Repositorio: ${params.repoName}`, // Usamos el nombre del repo para el título
  };
}

// El componente de página ahora es más simple
export default async function RepositoryPage({ params }: RepositoryPageProps) {
  // Renderiza el componente RepositoryDetails, pasando el nombre del repositorio
  return (
    <RepositoryDetails repoName={params.repoName} />
  );
}