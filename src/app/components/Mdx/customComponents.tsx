// src/components/Mdx/customComponents.ts
import Link from 'next/link';
import Image from "next/image"; // Aunque ReactMarkdown usa <img>, importarlo puede ser útil para referencias futuras o si adaptas 'img'
import * as React from "react";

// Función auxiliar para combinar clases (puedes instalar y usar `npm install clsx` si prefieres)
function clsx(...args: (string | undefined | null | false)[]) {
    return args.filter(Boolean).join(" ");
}

// Objeto con los componentes personalizados para ReactMarkdown
export const customMdxComponents: { [key: string]: React.ElementType } = {
    h1: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h1
            className={clsx(
                "mt-4 mb-2 scroll-m-20 text-4xl font-bold tracking-tight text-green-400",
                className
            )}
            {...props}
        />
    ),
    h2: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h2
            className={clsx(
                "mt-10 mb-2 scroll-m-20 border-b border-b-zinc-700 pb-2 text-3xl font-semibold tracking-tight first:mt-0 text-green-400",
                className
            )}
            {...props}
        />
    ),
    h3: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h3
            className={clsx(
                "mt-8 mb-2 scroll-m-20 text-2xl font-semibold tracking-tight text-green-400",
                className
            )}
            {...props}
        />
    ),
    h4: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h4
            className={clsx(
                "mt-6 mb-2 scroll-m-20 text-xl font-semibold tracking-tight text-green-400",
                className
            )}
            {...props}
        />
    ),
    h5: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h5
            className={clsx(
                "mt-5 mb-2 scroll-m-20 text-lg font-semibold tracking-tight text-green-400",
                className
            )}
            {...props}
        />
    ),
    h6: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h6
            className={clsx(
                "mt-5 mb-2 scroll-m-20 text-base font-semibold tracking-tight text-green-400",
                className
            )}
            {...props}
        />
    ),
    a: ({ className, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
        const isInternal = href && (href.startsWith('/') || href.startsWith('#'));
        const Component = isInternal ? Link : 'a';
        return (
            <Component
                href={href || '#'}
                className={clsx(
                    "font-medium text-blue-400 underline underline-offset-4 hover:text-blue-300",
                    className
                )}
                {...(Component === 'a' && !isInternal && { target: '_blank', rel: 'noopener noreferrer' })}
                {...props}
            />
        );
    },
    p: ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
        <p
            className={clsx("leading-7 text-green-300 [&:not(:first-child)]:mt-6", className)}
            {...props}
        />
    ),
    ul: ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
        <ul className={clsx("my-6 ml-6 list-disc text-green-300", className)} {...props} />
    ),
    ol: ({ className, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
        <ol className={clsx("my-6 ml-6 list-decimal text-green-300", className)} {...props} />
    ),
    li: ({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
        <li className={clsx("mt-2 text-green-300", className)} {...props} />
    ),
    blockquote: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
        <blockquote
            className={clsx(
                "mt-6 border-l-4 border-green-500 pl-6 italic text-zinc-400",
                className
            )}
            {...props}
        />
    ),
    img: ({ className, alt, src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            className={clsx("rounded-md border border-zinc-700 my-4 max-w-full h-auto", className)} // Añadido max-w-full y h-auto para responsividad
            alt={alt || ''}
            {...props}
        />
    ),
    hr: ({ ...props }: React.HTMLAttributes<HTMLHRElement>) => (
        <hr className="my-6 border-zinc-700" {...props} />
    ),
    table: ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
        <div className="my-6 w-full overflow-x-auto"> {/* Cambiado a overflow-x-auto para tablas anchas */}
            <table className={clsx("w-full border-collapse", className)} {...props} /> {/* Añadido border-collapse */}
        </div>
    ),
    tr: ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
        <tr
            className={clsx(
                "m-0 border-t border-zinc-700 p-0 even:bg-zinc-900/50",
                className
            )}
            {...props}
        />
    ),
    th: ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
        <th
            className={clsx(
                "border border-zinc-600 px-4 py-2 text-left font-bold text-green-400 [&[align=center]]:text-center [&[align=right]]:text-right", // Borde ligeramente más claro para celdas
                className
            )}
            {...props}
        />
    ),
    td: ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
        <td
            className={clsx(
                "border border-zinc-600 px-4 py-2 text-left text-green-300 [&[align=center]]:text-center [&[align=right]]:text-right",
                className
            )}
            {...props}
        />
    ),
    pre: ({ className, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
        <pre
            className={clsx(
                "mt-6 mb-4 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm",
                className
            )}
            {...props}
        />
    ),
    code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => {
        const hasLineBreaks = typeof children === 'string' && children.includes('\n');
        const probableBlock = hasLineBreaks; // Simplificación

        if (probableBlock) {
            // Estilo para bloques de código (dentro de <pre>)
            return <code className={clsx("text-green-300 font-mono", className)} {...props}>{children}</code>; // Asegurar fuente mono
        } else {
            // Estilo para código inline
            return (
                <code
                    className={clsx(
                        "relative rounded border border-zinc-700 bg-zinc-800 py-[0.2rem] px-[0.3rem] font-mono text-sm text-amber-400",
                        className
                    )}
                    {...props}
                >
                    {children}
                </code>
            );
        }
    },
    strong: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
        <strong className={clsx("font-semibold text-green-400", className)} {...props} />
    ),
    em: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
        <em className={clsx("italic text-green-300", className)} {...props} />
    ),
};