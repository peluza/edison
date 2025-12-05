import { NextResponse } from 'next/server';
import { incrementView, getViews } from '@/app/utils/redis';

// Handler for POST requests (Increment view count)
export async function POST(request: Request) {
  let slug: string | undefined;

  try {
    // 1. Extraer el slug manualmente de la URL
    const url = new URL(request.url);
    const pathnameParts = url.pathname.split('/'); // Ej: ['', 'api', 'views', 'el-slug']
    slug = pathnameParts.pop(); // Obtiene el último segmento ('el-slug')

    // 2. Validar el slug extraído
    if (!slug || slug === '[slug]') { // Verifica que no sea vacío o el nombre literal
      console.error('API Error: Could not extract valid slug from URL', url.pathname);
      return NextResponse.json({ message: 'Invalid or missing slug in URL path' }, { status: 400 });
    }

    // 3. Procesa el cuerpo de la solicitud
    const body = await request.json();
    const uniqueId = body.uniqueId;

    // 4. Valida uniqueId
    if (!uniqueId) {
      return NextResponse.json({ message: 'Unique ID is required in body' }, { status: 400 });
    }

    // 5. Llama a la función de Redis
    const newViews = await incrementView(slug, uniqueId);

    // 6. Invalida la cache de Next.js para que la lista y el detalle se actualicen
    try {
        const { revalidatePath } = await import('next/cache');
        revalidatePath('/repositories'); // Actualiza la lista principal
        revalidatePath(`/repositories/${slug}`); // Actualiza la página de detalle actual
    } catch (err) {
        console.error('Error revalidating path:', err);
    }

    // 7. Devuelve la respuesta
    return NextResponse.json({ views: newViews });

  } catch (error: any) {
    const errorSlug = slug || 'unknown';
    if (error instanceof SyntaxError) {
        console.error(`API Error parsing JSON body for slug ${errorSlug}:`, error);
        return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }
    console.error(`API Error incrementing view for slug ${errorSlug}:`, error);
    return NextResponse.json({ message: 'Error incrementing view count' }, { status: 500 });
  }
}

// Handler for GET requests (Fetch view count)
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
    const resolvedParams = await context.params;
    const slug = resolvedParams.slug;

    if (!slug) {
        return NextResponse.json({ message: 'Slug is required' }, { status: 400 });
    }

    try {
        const views = await getViews(slug);
        return NextResponse.json({ views });
    } catch (error) {
        console.error(`API Error getting views for slug ${slug}:`, error);
        return NextResponse.json({ message: 'Error fetching view count' }, { status: 500 });
    }
}