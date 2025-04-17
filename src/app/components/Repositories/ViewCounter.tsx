"use client"; // Sigue siendo un componente cliente

import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
// NO importes 'incrementView' aquí
import { FaEye } from 'react-icons/fa';

interface ViewCounterProps {
  slug: string;
  initialViews: number;
  trackView?: boolean;
}

export default function ViewCounter({ slug, initialViews, trackView = false }: ViewCounterProps) {
  const [views, setViews] = useState(initialViews);
  const [hasTracked, setHasTracked] = useState(false);
  const [error, setError] = useState<string | null>(null); // Para mostrar errores de API

  useEffect(() => {
    if (trackView && !hasTracked && slug) { // Asegúrate que slug tiene valor
      const trackViewOnClient = async () => {
        setError(null); // Limpia errores anteriores
        try {
          // 1. Obtener o generar Unique ID desde la cookie
          let uniqueId = document.cookie
            .split('; ')
            .find((row) => row.startsWith('uniqueId='))
            ?.split('=')[1];

          if (!uniqueId) {
            uniqueId = uuidv4();
            document.cookie = `uniqueId=${uniqueId}; max-age=${31536000}; path=/; SameSite=Strict; Secure`;
          }

          setHasTracked(true); // Marca como intentado ANTES de la llamada a la API

          // 2. Llamar a la Ruta de API usando fetch
          const response = await fetch(`/api/views/${slug}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uniqueId: uniqueId }), // Enviar uniqueId en el cuerpo
          });

          // 3. Procesar la respuesta de la API
          if (!response.ok) {
            // Si la respuesta no es OK (ej: 400, 500)
            const errorData = await response.json();
            throw new Error(errorData.message || `API request failed with status ${response.status}`);
          }

          // Si la respuesta es OK (200)
          const data = await response.json();
          setViews(data.views); // Actualiza el estado con las vistas devueltas por la API

        } catch (err) {
          console.error('Error tracking view via API:', err);
          setError("Couldn't update view count."); // Establece un mensaje de error
          setHasTracked(false); // Permite reintentar si falla (opcional)
        }
      };

      trackViewOnClient();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, trackView, hasTracked]); // Dependencias

  return (
    <span className="inline-flex items-center gap-1 text-sm text-zinc-400" title={error ?? undefined}>
      <FaEye className={`w-4 h-4 ${error ? 'text-red-500' : ''}`} />
      {/* Muestra el conteo o un guion si hay error */}
      {error ? '-' : Intl.NumberFormat("en-US", { notation: "compact" }).format(views)}
    </span>
  );
}