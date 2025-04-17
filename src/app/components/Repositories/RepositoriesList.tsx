// src/app/components/Repositories/RepositoriesList.tsx
import Link from 'next/link';
import { getPublicRepositories } from '@/app/utils/github'; // Asegúrate que la ruta es correcta

// Interfaz GitHubRepository (si no está definida globalmente)
interface GitHubRepository {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
}

export default async function RepositoriesList() {
  const repositories: GitHubRepository[] = await getPublicRepositories();

  return (
    // Contenedor principal con fondo degradado y padding similar al original
    <div className="relative pb-16 bg-gradient-to-tl from-black via-zinc-600/20 to-black min-h-screen text-white">
      {/* Aquí podrías incluir tu componente de navegación si lo tienes */}
      {/* <Navigation /> */}

      {/* Contenedor del contenido con padding y espaciado */}
      <div className="px-6 pt-20 mx-auto space-y-8 max-w-7xl lg:px-8 md:space-y-16 md:pt-24 lg:pt-32">

        {/* Sección del título */}
        <div className="max-w-2xl mx-auto lg:mx-0">
          <h1 className="text-3xl font-bold tracking-tight text-green-400 sm:text-4xl">
            Mis Repositorios Públicos
          </h1>
          <p className="mt-4 text-green-300">
            Explorando proyectos y código fuente en GitHub.
          </p>
        </div>

        {/* Divisor */}
        <div className="w-full h-px bg-zinc-800" />

        {/* Grid para los repositorios */}
        {repositories.length > 0 ? (
          // Aplicamos un grid similar al de 'sorted' en el original
          // Ajusta md:grid-cols-2 lg:grid-cols-3 según prefieras
          <div className="grid grid-cols-1 gap-6 mx-auto lg:mx-0 md:grid-cols-2 lg:grid-cols-3">
            {repositories.map((repo) => (
              // Cada repositorio es una "tarjeta"
              <div
                key={repo.id}
                className="bg-zinc-900 p-4 rounded-lg flex flex-col justify-between transition-all duration-300 ease-in-out hover:bg-zinc-800 border border-transparent hover:border-green-500/30" // Fondo oscuro para la tarjeta, borde sutil en hover
              >
                <div> {/* Contenedor para el contenido principal de la tarjeta */}
                  <div className="flex justify-between items-start mb-3"> {/* Alinea nombre y enlace GitHub */}
                    <h2 className="text-xl font-semibold">
                      {/* Enlace con color verde */}
                      <Link href={`/repositories/${repo.name}`} className="text-green-400 hover:text-green-300 hover:underline break-words">
                        {repo.name}
                      </Link>
                    </h2>
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-zinc-400 hover:text-green-400 flex-shrink-0 ml-2" // Color zinc claro, verde en hover
                      aria-label={`Ver ${repo.name} en GitHub`}
                    >
                      GitHub ↗
                    </a>
                  </div>
                  {/* Descripción con color zinc claro */}
                  <p className="text-zinc-300 mb-4 text-sm flex-grow">
                    {repo.description || 'Sin descripción.'}
                  </p>
                </div>

                {/* Metadatos (Lenguaje, Estrellas) en la parte inferior */}
                <div className="flex items-center space-x-4 text-sm text-zinc-400 mt-auto pt-2 border-t border-zinc-700/50"> {/* Empuja al fondo, añade línea superior sutil */}
                  {repo.language && (
                    <span className="inline-flex items-center">
                      {/* Podrías añadir un icono de círculo de color aquí si quieres */}
                      <span className="mr-1.5">●</span> {/* Placeholder para el color del lenguaje */}
                      {repo.language}
                    </span>
                  )}
                  <span className="inline-flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {repo.stargazers_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Mensaje si no hay repositorios, con color adecuado
          <p className="text-zinc-400">
            No se encontraron repositorios públicos o hubo un error al cargarlos.
          </p>
        )}
      </div>
    </div>
  );
}