"use client"
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../util/firebaseConfig';
import { useEffect, useState } from 'react';
import { Mdx } from "../../components/Mdx/mdx";
import { Header } from "./header";
import { v4 as uuidv4 } from 'uuid';

type ClientComponentProps = {
  project: any;
  slug: string;
  initialViews: number;
};

const ClientComponent = ({ project, slug, initialViews }: ClientComponentProps) => {
  const [views, setViews] = useState(initialViews);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleView = async () => {
      try {
        let uniqueId = document.cookie
          .split('; ')
          .find((row) => row.startsWith('uniqueId='))
          ?.split('=')[1];

        if (!uniqueId) {
          uniqueId = uuidv4();
          document.cookie = `uniqueId=${uniqueId}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Strict`;
        }

        const MAX_RETRIES = 3;
        let retries = 0;

        while (retries < MAX_RETRIES) {
          try {
            // Crea una variable temporal y asígnale el valor de 'db'
            const firestore = db; 

            // Verifica si 'firestore' es null antes de llamar a runTransaction
            if (!firestore) {
              throw new Error('Firestore no está inicializado');
            }

            await runTransaction(firestore, async (transaction) => { 
              const userDeduplicationRef = doc(firestore, 'deduplication', uniqueId);
              const projectDeduplicationRef = doc(userDeduplicationRef, 'viewedProjects', slug);
              const deduplicationSnap = await transaction.get(projectDeduplicationRef);

              const pageviewRef = doc(firestore, 'pageviews', slug);
              const pageviewSnap = await transaction.get(pageviewRef);

              if (!deduplicationSnap.exists()) {
                // Registrar la vista
                transaction.set(projectDeduplicationRef, { timestamp: serverTimestamp() }, { merge: true });

                let newViews = 1;
                if (pageviewSnap.exists()) {
                  newViews = (pageviewSnap.data()?.views || 0) + 1;
                  transaction.update(pageviewRef, { views: newViews }); 
                } else {
                  transaction.set(pageviewRef, { views: 1 });
                }

                return newViews;
              } else {
                // El usuario ya ha visto este proyecto, no hacer nada
                return pageviewSnap.data()?.views || 0;
              }
            }).then((newViews) => {
              setViews(newViews);
            });

            break; // Salir del bucle si la transacción tiene éxito
          } catch (e) {
            console.error('Error en la transacción:', e);
            retries++;
            // Puedes agregar un pequeño retraso aquí antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 500)); // Retraso de 500ms
          }
        }

        if (retries === MAX_RETRIES) {
          console.error("La transacción falló después de los reintentos máximos.");
          setError("Error al registrar la vista. Por favor, inténtalo de nuevo más tarde."); 
        }
      } catch (error) {
        console.error('Error general en handleView:', error);
        setError("Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde."); 
      }
    };

    handleView();
  }, [slug]); 

  return (
    <div className="bg-gradient-to-tl from-black via-zinc-600/20 to-black min-h-screen">
      <Header project={project} views={views} />
      {error && <div className="text-red-500">{error}</div>}
      <article className="px-4 py-12 mx-auto prose prose-zinc prose-quoteless text-green-400">
        <Mdx code={project.body.code} />
      </article>
    </div>
  );
};

export default ClientComponent;