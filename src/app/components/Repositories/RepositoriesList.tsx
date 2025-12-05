import Link from 'next/link';
import ViewCounter from './ViewCounter'; // Import ViewCounter
import { getPublicRepositories } from '@/app/utils/github';
import { getMultipleViews } from '@/app/utils/redis'; // Importa la función de Redis
import { FaStar, FaEye } from 'react-icons/fa'; // Importa el ícono del ojo

// Interfaz GitHubRepository
interface GitHubRepository {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
}

export default async function RepositoriesList() {
  // Obtener repositorios y vistas en paralelo
  const repositories: GitHubRepository[] = await getPublicRepositories();
  const slugs = repositories.map(repo => repo.name);
  const viewsData = await getMultipleViews(slugs);

  // Opcional: Desconectar Redis si no se harán más operaciones en esta solicitud
  // await disconnectRedis();

  return (
    <div className="relative pb-16 bg-gradient-to-tl from-black via-zinc-600/20 to-black min-h-screen text-white">
      {/* <Navigation /> */}
      <div className="px-6 pt-20 mx-auto space-y-8 max-w-7xl lg:px-8 md:space-y-16 md:pt-24 lg:pt-32">
        <div className="max-w-2xl mx-auto lg:mx-0">
          <h1 className="text-3xl font-bold tracking-tight text-green-400 sm:text-4xl">
            My Public Repositories
          </h1>
          <p className="mt-4 text-green-300">
            Exploring projects and source code on GitHub.
          </p>
        </div>
        <div className="w-full h-px bg-zinc-800" />

        {repositories.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 mx-auto lg:mx-0 md:grid-cols-2 lg:grid-cols-3">
            {repositories.map((repo) => {
              const views = viewsData[repo.name] ?? 0; // Obtiene las vistas para este repo

              return (
                <div
                  key={repo.id}
                  className="bg-zinc-900 p-4 rounded-lg flex flex-col justify-between transition-all duration-300 ease-in-out hover:bg-zinc-800 border border-transparent hover:border-green-500/30"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <h2 className="text-xl font-semibold">
                        <Link href={`/repositories/${repo.name}`} className="text-green-400 hover:text-green-300 hover:underline break-words">
                          {repo.name}
                        </Link>
                      </h2>
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-zinc-400 hover:text-green-400 flex-shrink-0 ml-2"
                        aria-label={`Ver ${repo.name} en GitHub`}
                      >
                        GitHub ↗
                      </a>
                    </div>
                    <p className="text-zinc-300 mb-4 text-sm flex-grow">
                      {repo.description || 'Sin descripción.'}
                    </p>
                  </div>

                  {/* Metadatos (Lenguaje, Estrellas, Vistas) */}
                  <div className="flex items-center space-x-4 text-sm text-zinc-400 mt-auto pt-2 border-t border-zinc-700/50">
                    {repo.language && (
                      <span className="inline-flex items-center">
                        <span className="mr-1.5">●</span>
                        {repo.language}
                      </span>
                    )}
                    <span className="inline-flex items-center">
                      <FaStar className="h-4 w-4 mr-1" />
                      {repo.stargazers_count}
                    </span>
                    {/* Use ViewCounter for live updates */}
                    <ViewCounter
                      slug={repo.name}
                      initialViews={viewsData[repo.name] || 0}
                      trackView={false}
                      shouldFetch={true}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-zinc-400">
            No se encontraron repositorios públicos o hubo un error al cargarlos.
          </p>
        )}
      </div>
    </div>
  );
}