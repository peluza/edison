import { createClient } from 'redis';

// Asegúrate de tener REDIS_URL en tus variables de entorno de Vercel
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn("REDIS_URL environment variable not set. View counting will not work.");
}

// Creamos una instancia del cliente sin conectar inmediatamente.
// La conexión se manejará donde se use.
export const redisClient = redisUrl
  ? createClient({ url: redisUrl })
  : null;

// Función auxiliar para conectar si no está conectado
async function connectRedis() {
  if (redisClient && !redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.log("Connected to Redis.");
    } catch (err) {
      console.error("Failed to connect to Redis:", err);
      // Podrías retornar null o lanzar el error dependiendo de cómo quieras manejar fallos de conexión
      return null;
    }
  }
  return redisClient;
}

// --- Funciones para interactuar con Redis ---

// Obtener vistas para un slug específico
export async function getViews(slug: string): Promise<number> {
  const client = await connectRedis();
  if (!client) return 0; // O manejar el error como prefieras

  try {
    const views = await client.get(`views:${slug}`);
    return views ? parseInt(views, 10) : 0;
  } catch (error) {
    console.error(`Error getting views for ${slug}:`, error);
    return 0; // Devuelve 0 en caso de error
  }
  // No desconectamos aquí para reutilizar la conexión si es posible
}

// Obtener vistas para múltiples slugs
export async function getMultipleViews(slugs: string[]): Promise<Record<string, number>> {
    const client = await connectRedis();
    if (!client || slugs.length === 0) return {};

    try {
        const keys = slugs.map(slug => `views:${slug}`);
        const viewsArray = await client.mGet(keys);

        const viewsMap: Record<string, number> = {};
        slugs.forEach((slug, index) => {
            viewsMap[slug] = viewsArray[index] ? parseInt(viewsArray[index] as string, 10) : 0;
        });
        return viewsMap;
    } catch (error) {
        console.error('Error getting multiple views:', error);
        // Devolver un objeto vacío o con ceros según prefieras
        const errorMap: Record<string, number> = {};
        slugs.forEach(slug => { errorMap[slug] = 0; });
        return errorMap;
    }
}


// Incrementar vistas y manejar deduplicación
export async function incrementView(slug: string, uniqueId: string): Promise<number> {
  const client = await connectRedis();
  if (!client) return 0; // O manejar error

  const deduplicationKey = `deduplication:${uniqueId}:${slug}`;
  const viewKey = `views:${slug}`;

  try {
    // Intenta establecer la clave de deduplicación.
    // NX: Solo establece si la clave no existe.
    // EX: Expira después de N segundos (86400 = 1 día). Ajusta si lo necesitas más largo.
    const didSet = await client.set(deduplicationKey, '1', { NX: true, EX: 86400 });

    if (didSet) {
      // Si se estableció, significa que es una nueva vista de este usuario para este slug hoy.
      // Incrementa el contador de vistas. INCR devuelve el nuevo valor.
      const newViews = await client.incr(viewKey);
      console.log(`Incremented view count for ${slug} to ${newViews}`);
      return newViews;
    } else {
      // Si no se estableció, el usuario ya vio esta página hoy.
      // Simplemente obtenemos y devolvemos el conteo actual sin incrementar.
      console.log(`User ${uniqueId} already viewed ${slug} today.`);
      const currentViews = await client.get(viewKey);
      return currentViews ? parseInt(currentViews, 10) : 0;
    }
  } catch (error) {
    console.error(`Error incrementing view for ${slug}:`, error);
    // En caso de error, intentar devolver el conteo actual o 0
    try {
        const currentViewsOnError = await client.get(viewKey);
        return currentViewsOnError ? parseInt(currentViewsOnError, 10) : 0;
    } catch (getError) {
        console.error(`Error getting views for ${slug} after increment error:`, getError);
        return 0;
    }
  }
  // Considera desconectar si no vas a hacer más operaciones pronto:
  // await client.quit();
}