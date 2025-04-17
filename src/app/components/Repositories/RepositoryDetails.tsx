import Link from 'next/link';
import { getReadmeContent, getRepositoryByName } from '@/app/utils/github';
import { getViews } from '@/app/utils/redis'; // Importar getViews
import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { FaArrowLeft, FaGithub, FaStar } from 'react-icons/fa';
import { customMdxComponents } from '@/app/components/Mdx/customComponents';
import ViewCounter from './ViewCounter'; // Importa el componente cliente

// --- Componente Principal ---
interface RepositoryDetailsProps {
    repoName: string;
}

export default async function RepositoryDetails({ repoName }: RepositoryDetailsProps) {
    // Obtener detalles, README y vistas iniciales en paralelo
    const [repoDetails, readmeContent, initialViews] = await Promise.all([
        getRepositoryByName(repoName),
        getReadmeContent(repoName),
        getViews(repoName) // Obtener vistas iniciales desde Redis
    ]);

    // Opcional: Desconectar Redis
    // await disconnectRedis();

    if (!repoDetails) {
        return (
             <div className="container mx-auto px-6 py-12 text-center">
                 <p className="text-red-500">Error: No se encontraron detalles para el repositorio "{repoName}".</p>
                 <Link href="/repositories" className="text-blue-400 hover:underline mt-4 inline-block">
                    <FaArrowLeft className="w-4 h-4 inline mr-1" /> Volver a la lista
                 </Link>
             </div>
         );
    }

    return (
        <div className="container mx-auto relative overflow-hidden">
            {/* --- Header --- */}
            <header className="relative py-16 sm:py-24 px-6 lg:px-8 text-center flex flex-col items-center">
                 <div className="w-full flex justify-between items-center mb-8 max-w-4xl">
                    <Link
                        href="/repositories"
                        className="duration-200 hover:font-medium text-green-400 hover:text-green-300 flex items-center gap-1"
                        title="Volver a la lista"
                    >
                        <FaArrowLeft className="w-5 h-5" />
                        Volver
                    </Link>
                    {/* Contenedor para iconos de GitHub, Estrellas y Vistas */}
                    <div className="flex items-center gap-4">
                        {repoDetails.html_url && (
                             <a
                                href={repoDetails.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="duration-200 hover:font-medium text-green-400 hover:text-green-300 flex items-center gap-1"
                                title="Ver en GitHub"
                            >
                                <FaGithub className="w-5 h-5" />
                                GitHub
                             </a>
                        )}
                        {/* Estrellas */}
                        <span className="inline-flex items-center gap-1 text-sm text-zinc-400">
                           <FaStar className="w-4 h-4" />
                           {repoDetails.stargazers_count}
                        </span>
                        {/* === Integración del ViewCounter === */}
                        <ViewCounter
                            slug={repoName}
                            initialViews={initialViews}
                            trackView={true} // Indica que este componente debe incrementar la vista
                        />
                        {/* ================================ */}
                    </div>
                 </div>
                 <div className="mx-auto max-w-2xl lg:mx-0">
                     <h1 className="text-green-400 text-4xl font-bold tracking-tight sm:text-5xl font-display">
                         {repoDetails.name}
                     </h1>
                     {repoDetails.description && (
                         <p className="text-green-300 mt-4 text-lg leading-8">
                             {repoDetails.description}
                         </p>
                     )}
                 </div>
            </header>

            {/* --- Divisor --- */}
            <div className="w-full h-px bg-zinc-700 max-w-4xl mx-auto mb-12" />

            {/* --- Contenido del README --- */}
            <article className="px-4 pb-12 mx-auto max-w-4xl prose prose-invert prose-headings:text-green-400 prose-a:text-green-400 hover:prose-a:text-green-300 prose-strong:text-green-200">
                 {readmeContent ? (
                     <ReactMarkdown
                         rehypePlugins={[
                             rehypeSlug,
                             [rehypeAutolinkHeadings, {
                                 behavior: 'prepend',
                                 content: () => <span className="anchor-icon" aria-hidden="true">#</span>
                             }],
                         ]}
                         components={customMdxComponents}
                     >
                         {readmeContent}
                     </ReactMarkdown>
                 ) : (
                     <p className="text-center text-zinc-400 mt-10">No se encontró un archivo README.md o hubo un error.</p>
                 )}
            </article>
        </div>
    );
}