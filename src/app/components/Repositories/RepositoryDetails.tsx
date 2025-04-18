// src/app/components/Repositories/RepositoryDetails.tsx

import Link from 'next/link';
import { getReadmeContent, getRepositoryByName } from '@/app/utils/github';
import { getViews } from '@/app/utils/redis';
import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { FaArrowLeft, FaGithub, FaStar } from 'react-icons/fa';

// Importa los componentes base de MDX
import { customMdxComponents } from '@/app/components/Mdx/customComponents';
import ViewCounter from './ViewCounter';
import React from 'react'; // Necesario para JSX y tipos
import clsx from 'clsx'; // Asegúrate de tener clsx instalado (npm install clsx) o usa tu función helper

// --- Componente Principal ---
interface RepositoryDetailsProps {
    repoName: string;
}

const REPO_OWNER = process.env.GITHUB_REPO_OWNER;

export default async function RepositoryDetails({ repoName }: RepositoryDetailsProps) {

    const [repoDetails, readmeContent, initialViews] = await Promise.all([
        getRepositoryByName(repoName),
        getReadmeContent(repoName),
        getViews(repoName)
    ]);

    
    if (!REPO_OWNER) {
        console.error("Error Crítico: La variable de entorno GITHUB_REPO_OWNER no está configurada en el servidor.");
    
        return (
             <div className="container mx-auto px-6 py-12 text-center">
                 <p className="text-red-500 font-bold">Error de Configuración del Servidor.</p>
                 <p className="text-zinc-400 mt-2">Contacta al administrador.</p>
             </div>
         );
    }

    const ImageComponent = ({ className, alt, src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
        const defaultBranch = 'main';
        let finalSrc = src;

        if (typeof src === 'string' && REPO_OWNER && repoName && !src.startsWith('http://') && !src.startsWith('https://')) {
            const baseUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${repoName}/${defaultBranch}/`;
            try {
                const relativePath = src.startsWith('/') ? src.substring(1) : src;
                finalSrc = new URL(relativePath, baseUrl).href;
            } catch (e) {
                console.error(`Error constructing URL for relative image src "${src}"`, e);
                finalSrc = '#error-constructing-image-url'; // URL de fallback en caso de error
            }
        }

        const baseImageClasses = "rounded-md border border-zinc-700 my-4 max-w-full h-auto";

        return (
            <img
                src={finalSrc} 
                className={clsx(baseImageClasses, className)} 
                alt={alt || ''} 
                loading="lazy"
                {...props}
            />
        );
    };
   

    const componentsForRender = {
        ...customMdxComponents, 
        img: ImageComponent, 
    };

    if (!repoDetails) {
        return (
             <div className="container mx-auto px-6 py-12 text-center">
                 <p className="text-red-500">Error: No se encontraron detalles para el repositorio "{repoName}".</p>
                 <p className="text-zinc-400 mt-2">Verifica que el nombre sea correcto y que el repositorio exista.</p>
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
                 <div className="w-full flex mb-8 max-w-4xl">
                    {/* Contenedor para iconos y metadatos */}
                    <div className="flex items-center gap-4 mt-5 text-sm">
                        {repoDetails.html_url && (
                             <a
                                href={repoDetails.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="duration-200 hover:font-medium text-green-400 hover:text-green-300 flex items-center gap-1"
                                title="Ver en GitHub"
                            >
                                <FaGithub className="w-5 h-5" />
                                <span>GitHub</span> {/* Texto explícito */}
                             </a>
                        )}
                        {/* Estrellas */}
                        <span className="inline-flex items-center gap-1 text-zinc-400" title={`${repoDetails.stargazers_count} estrellas`}>
                           <FaStar className="w-4 h-4" />
                           {repoDetails.stargazers_count}
                        </span>
                        {/* === Integración del ViewCounter === */}
                        <ViewCounter
                            slug={repoName}
                            initialViews={initialViews}
                            trackView={true}
                        />
                        {/* ================================ */}
                    </div>
                 </div>
                 {/* Título y Descripción */}
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
                                 behavior: 'prepend', // O 'append' si prefieres el # al final
                                 properties: { className: ['anchor-link'] }, // Clase para estilizar el enlace del heading
                                 content: () => <span className="anchor-icon" aria-hidden="true">#</span> // Contenido del enlace
                             }],
                         ]}
                         // *** PASA LOS COMPONENTES PERSONALIZADOS AQUÍ ***
                         components={componentsForRender}
                     >
                         {readmeContent}
                     </ReactMarkdown>
                 ) : (
                     // Mensaje si no hay README o falla la carga
                     <p className="text-center text-zinc-400 mt-10 italic">No se encontró un archivo README.md o hubo un error al cargarlo.</p>
                 )}
            </article>
        </div>
    );
}