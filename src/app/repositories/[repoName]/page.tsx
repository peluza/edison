import { Navigation } from '@/app/components/Navigation/Navigation';
import RepositoryDetails from '@/app/components/Repositories/RepositoryDetails';
import { getPublicRepositories } from '@/app/utils/github';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

// Interface para los parámetros RESUELTOS (después del await)
interface ResolvedRepositoryPageParams {
  repoName: string;
}

// Interface para las PROPS recibidas (params es una Promise)
interface RepositoryPageProps {
  // ¡Params ahora es una Promise que resuelve a los parámetros!
  params: Promise<ResolvedRepositoryPageParams>;
}

// --- generateMetadata (Con await params) ---
// La función ya es async, lo cual es bueno
export async function generateMetadata({ params: paramsPromise }: RepositoryPageProps): Promise<Metadata> {

  try {
    // *** PASO CLAVE: Esperar a que la Promise de params se resuelva ***
    const params = await paramsPromise;

    // Ahora puedes acceder a params.repoName de forma segura
    const repoName = params.repoName;

    if (typeof repoName !== 'string' || !repoName) {
      console.error("generateMetadata: repoName is not a valid string or is empty:", repoName);
      console.error("generateMetadata: Failing resolved params object was:", params);
      return { title: "Error: Nombre de repositorio inválido" };
    }

    return {
      title: `Repositorio: ${repoName}`,
    };
  } catch (error) {
    console.error("Error resolving params or generating metadata:", error);
    return { title: "Error al generar metadatos" };
  }
}

export async function generateStaticParams(): Promise<{ repoName: string }[]> {
  try {
    const repositories = await getPublicRepositories();
    if (!Array.isArray(repositories)) {
      console.error("generateStaticParams: getPublicRepositories did not return an array. Received:", repositories);
      return [];
    }
    const validParams = repositories
      .map((repo) => {
        if (repo && typeof repo === 'object' && typeof repo.name === 'string' && repo.name.trim() !== '') {
          return { repoName: repo.name };
        } else {
          console.warn("generateStaticParams: Skipping invalid repository object or missing/empty name:", repo);
          return null;
        }
      })
      .filter((param): param is { repoName: string } => param !== null);
    return validParams;
  } catch (error) {
    console.error("Error occurred in generateStaticParams:", error);
    return [];
  }
}


export default async function RepositoryPage({ params: paramsPromise }: RepositoryPageProps) {

  try {
     // *** PASO CLAVE: Esperar a que la Promise de params se resuelva ***
    const params = await paramsPromise;

    // Ahora puedes validar y usar params.repoName
    if (!params || typeof params.repoName !== 'string' || !params.repoName) {
      console.error("RepositoryPage - Invalid resolved params:", params);
      // notFound(); // Lanza un 404
      return ( // O muestra un error
        <div className="text-red-500 p-10">
          Error: Nombre de repositorio inválido o no proporcionado.
        </div>
      );
    }

    const repoName = params.repoName;

    return (
      <div className="relative pb-16 bg-gradient-to-tl from-black via-zinc-600/20 to-black min-h-screen text-white">
        < Navigation />
        <RepositoryDetails repoName={repoName} />
      </div>
    );
  } catch (error) {
    console.error("Error resolving params or rendering RepositoryPage:", error);
    // notFound(); // Puedes lanzar 404 en caso de error al resolver params
     return ( // O mostrar un mensaje de error genérico
        <div className="text-red-500 p-10">
          Error al cargar la información del repositorio.
        </div>
      );
  }
}