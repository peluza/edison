// src/app/components/Navigation/Navigation.tsx (o donde esté)

"use client";

import { FaArrowLeft } from "react-icons/fa";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from 'next/navigation';

export const Navigation: React.FC = () => {
    const ref = useRef<HTMLElement>(null);
    const [isIntersecting, setIntersecting] = useState(true);
    const currentPath = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!ref.current) return;
        const observer = new IntersectionObserver(([entry]) =>
            setIntersecting(entry.isIntersecting),
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    const isProjectsActive = currentPath === '/repositories' || currentPath.startsWith('/repositories/');
    const isContactActive = currentPath === '/contact';

    const handleGoBack = () => {
        router.back();
    };

    // Definimos el estilo base y hover que queremos para todos los elementos interactivos
    const commonLinkStyle = "duration-200 text-green-400 hover:text-green-300";
    // Para el botón, añadimos también los estilos de foco y cursor
    const commonButtonStyle = `${commonLinkStyle} focus:outline-none cursor-pointer`;

    return (
        <header ref={ref}>
            <div
                className={`fixed inset-x-0 top-0 z-50 backdrop-blur duration-200 border-b ${
                    isIntersecting
                        ? "bg-zinc-900/0 border-transparent"
                        : "bg-zinc-900/500 border-zinc-800"
                }`}
            >
                <div className="container flex flex-row-reverse items-center justify-between p-6 mx-auto">
                    {/* Links de Navegación */}
                    <div className="flex justify-between gap-8">
                        {/* Enlace Projects / Home */}
                        <Link
                            href={isProjectsActive ? '/' : '/repositories'}
                            // ---- INICIO CAMBIO Estilo ----
                            // Se aplica el estilo común directamente. Ya no cambia si está activo.
                            className={commonLinkStyle}
                            // ---- FIN CAMBIO Estilo ----
                        >
                            {isProjectsActive ? 'Home' : 'Projects'}
                        </Link>

                        {/* Enlace Contact / Home */}
                        <Link
                            href={isContactActive ? '/' : '/contact'}
                            // ---- INICIO CAMBIO Estilo ----
                            // Se aplica el estilo común directamente. Ya no cambia si está activo.
                            className={commonLinkStyle}
                            // ---- FIN CAMBIO Estilo ----
                        >
                            {isContactActive ? 'Home' : 'Contact'}
                        </Link>
                    </div>

                    {/* Botón "Atrás" */}
                    <button
                        onClick={handleGoBack}
                        type="button"
                        // ---- INICIO CAMBIO Estilo ----
                        // Se aplica el estilo común de botón (que incluye el de enlace + extras)
                        className={commonButtonStyle}
                        // ---- FIN CAMBIO Estilo ----
                        aria-label="Volver a la página anterior"
                    >
                        <FaArrowLeft className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </header>
    );
};