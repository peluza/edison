// src/app/components/Repositories/RepositoryDetails.tsx
import Link from 'next/link';
import { getReadmeContent, getRepositoryByName } from '@/app/utils/github';
import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
// *** PASO 1: Cambia la importación de iconos ***
// import { ArrowLeft, Github } from 'lucide-react'; // Quita esta línea
import { FaArrowLeft, FaGithub } from 'react-icons/fa'; // Añade esta línea (o usa otros de react-icons)
import './markdown.css';

interface RepositoryDetailsProps {
    repoName: string;
}

export default async function RepositoryDetails({ repoName }: RepositoryDetailsProps) {
    const [repoDetails, readmeContent] = await Promise.all([
        getRepositoryByName(repoName),
        getReadmeContent(repoName)
    ]);

    if (!repoDetails) {
        // ... (manejo de error)
        return (
             <div className="container mx-auto px-6 py-12 text-center">
                 <p className="text-red-500">Error: No se encontraron detalles para el repositorio "{repoName}".</p>
                 <Link href="/repositories" className="text-blue-400 hover:underline mt-4 inline-block">
                    {/* *** PASO 2: Usa el icono importado *** */}
                    <FaArrowLeft className="w-4 h-4 inline mr-1" /> Volver a la lista
                 </Link>
             </div>
         );
    }

    return (
        <div className="container mx-auto relative isolate overflow-hidden">
            <header className="relative py-16 sm:py-24 px-6 lg:px-8 text-center flex flex-col items-center">
                 <div className="w-full flex justify-between items-center mb-8 max-w-4xl">
                    <Link
                        href="/repositories"
                        className="duration-200 hover:font-medium text-green-400 hover:text-green-300 flex items-center gap-1"
                        title="Volver a la lista"
                    >
                        {/* *** PASO 2: Usa el icono importado *** */}
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
                            {/* *** PASO 2: Usa el icono importado *** */}
                            <FaGithub className="w-5 h-5" />
                            GitHub
                         </a>
                    )}
                 </div>

                 {/* Título y Descripción */}
                 <div className="mx-auto max-w-2xl lg:mx-0">
                     {/* ... (título y descripción) ... */}
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

            {/* Divisor opcional */}
            <div className="w-full h-px bg-zinc-800 max-w-4xl mx-auto mb-12" />

            {/* Contenido del README */}
            <article className="px-4 pb-12 mx-auto prose prose-zinc prose-invert lg:prose-lg max-w-4xl prose-headings:text-green-400 prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-strong:text-green-300 prose-code:text-amber-400 prose-code:bg-zinc-800 prose-code:p-1 prose-code:rounded prose-blockquote:border-l-green-500 prose-blockquote:text-zinc-400">
                {/* ... (ReactMarkdown) ... */}
                 {readmeContent ? (
                     <ReactMarkdown
                         rehypePlugins={[
                             rehypeSlug,
                             [rehypeAutolinkHeadings, { behavior: 'wrap' }],
                         ]}
                     >
                         {readmeContent}
                     </ReactMarkdown>
                 ) : (
                     <p className="text-center text-zinc-400 mt-10">No se encontró un archivo README.md para este repositorio o hubo un error al cargarlo.</p>
                 )}
            </article>

        </div>
    );
}