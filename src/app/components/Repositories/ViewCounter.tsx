"use client"; // Sigue siendo un componente cliente

import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
// NO importes 'incrementView' aquí
import { FaEye } from 'react-icons/fa';

interface ViewCounterProps {
  slug: string;
  initialViews: number;
  trackView?: boolean; // If true, POST to increment
  shouldFetch?: boolean; // If true (and not tracking), GET to update
}

export default function ViewCounter({ slug, initialViews, trackView = false, shouldFetch = false }: ViewCounterProps) {
  const [views, setViews] = useState(initialViews);
  const [hasTracked, setHasTracked] = useState(false);
  const [error, setError] = useState<string | null>(null); // Para mostrar errores de API

  const fetchCalled = React.useRef(false); // Ref to track if API was called in Strict Mode

  useEffect(() => {
    if (!slug) return;

    // CASE 1: TRACKING (Increment)
    if (trackView && !fetchCalled.current) {
      const trackViewOnClient = async () => {
        fetchCalled.current = true;
        setError(null);

        try {
          let uniqueId = document.cookie
            .split('; ')
            .find((row) => row.startsWith('uniqueId='))
            ?.split('=')[1];

          if (!uniqueId) {
            uniqueId = uuidv4();
            document.cookie = `uniqueId=${uniqueId}; max-age=${31536000}; path=/; SameSite=Strict; Secure`;
          }

          setHasTracked(true);

          const response = await fetch(`/api/views/${slug}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uniqueId }),
          });

          if (!response.ok) {
            let errorMessage = `API request failed with status ${response.status}`;
            try {
              const contentType = response.headers.get("content-type");
              if (contentType && contentType.indexOf("application/json") !== -1) {
                const errorData = await response.json();
                if (errorData.message) errorMessage = errorData.message;
              } else {
                await response.text(); // consume body
              }
            } catch (e) { /* ignore */ }
            throw new Error(errorMessage);
          }

          const data = await response.json();
          setViews(data.views);

        } catch (err) {
          console.error('Error tracking view via API:', err);
          setError("Couldn't update view count.");
        }
      };
      trackViewOnClient();
    }
    // CASE 2: FETCHING ONLY (Read-only update)
    else if (!trackView && shouldFetch) {
      const fetchViews = async () => {
        try {
          const response = await fetch(`/api/views/${slug}`);
          if (response.ok) {
            const data = await response.json();
            setViews(data.views);
          } else {
            // Start of robust error handling
            let errorMessage = `API request failed with status ${response.status}`;
            try {
              const contentType = response.headers.get("content-type");
              if (contentType && contentType.indexOf("application/json") !== -1) {
                const errorData = await response.json();
                if (errorData.message) errorMessage = errorData.message;
              } else {
                // Body is likely HTML or empty, consume it to clean up but ignore
                await response.text();
              }
            } catch (e) {
              // ignore JSON parse error
            }
            throw new Error(errorMessage);
          }
        } catch (e) {
          console.error("Error fetching views", e);
          // Don't show error to user for fetch-only, just keep 'initialViews' or 0
          // setError("Couldn't fetch view count."); 
        }
      };
      fetchViews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, trackView, shouldFetch]);

  return (
    <span className="inline-flex items-center gap-1 text-sm text-zinc-400" title={error ?? undefined}>
      <FaEye className={`w-4 h-4 ${error ? 'text-red-500' : ''}`} />
      {/* Muestra el conteo o un guion si hay error */}
      {error ? '-' : Intl.NumberFormat("en-US", { notation: "compact" }).format(views)}
    </span>
  );
}