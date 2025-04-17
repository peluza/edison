// src/app/components/Repositories/RepositoryDetails.tsx
import Link from 'next/link';
import { getReadmeContent, getRepositoryByName } from '@/app/utils/github';
import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { FaArrowLeft, FaGithub, FaLink } from 'react-icons/fa'; // Importa FaLink si lo usas
import { customMdxComponents } from '@/app/components/Mdx/customComponents'; // Ajusta la ruta si es necesario

// --- Componente Principal ---
interface RepositoryDetailsProps {
    repoName: string;
}

export default async function RepositoryDetails({ repoName }: RepositoryDetailsProps) {
    const [repoDetails, readmeContent] = await Promise.all([
        getRepositoryByName(repoName),
        getReadmeContent(repoName)
    ]);

    // --- CORRECCIÓN AQUÍ ---
    if (!repoDetails) {
        // Reemplaza el comentario con el JSX real para el error
        return (
             <div className="container mx-auto px-6 py-12 text-center">
                 <p className="text-red-500">Error: No se encontraron detalles para el repositorio "{repoName}".</p>
                 <Link href="/repositories" className="text-blue-400 hover:underline mt-4 inline-block">
                    <FaArrowLeft className="w-4 h-4 inline mr-1" /> Volver a la lista
                 </Link>
             </div>
         );
    }
    // --- FIN CORRECCIÓN ---

    return (
        <div className="container mx-auto relative overflow-hidden">
            {/* --- Header --- */}
            <header className="relative py-16 sm:py-24 px-6 lg:px-8 text-center flex flex-col items-center">
                 <div className="w-full flex justify-between items-center mb-8 max-w-4xl">
                    <Link
                        href="/repositories" // Asegúrate que esta ruta sea correcta
                        className="duration-200 hover:font-medium text-green-400 hover:text-green-300 flex items-center gap-1"
                        title="Volver a la lista"
                    >
                        <FaArrowLeft className="w-5 h-5" />
                        Volver
                    </Link>
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
            <article className="px-4 pb-12 mx-auto max-w-4xl">
                 {readmeContent ? (
                     <ReactMarkdown
                         rehypePlugins={[
                             rehypeSlug,
                             [rehypeAutolinkHeadings, {
                                 behavior: 'prepend', // O 'append'
                                 content: (node: any) => (
                                     <span className="anchor-icon" aria-hidden="true">
                                         {/* Usa un icono si prefieres */}
                                         {/* <FaLink className="inline w-4 h-4" /> */} #
                                     </span>
                                 )
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