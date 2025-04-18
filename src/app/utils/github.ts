// src/app/utils/github.ts
import { cache } from 'react';
import { notFound } from 'next/navigation';

// --- Variables de Entorno y Constantes ---
const GITHUB_API_BASE_URL = process.env.GITHUB_API_URL || 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Tu token de acceso personal de GitHub
const REPO_OWNER = process.env.GITHUB_REPO_OWNER; // Tu nombre de usuario de GitHub

// --- Interfaces ---
interface GitHubRepository {
  id: number;
  name: string;
  full_name: string; // Incluido por si acaso
  html_url: string; // URL al repositorio en GitHub
  description: string | null;
  language: string | null;
  stargazers_count: number;
  // Puedes añadir más campos si los necesitas (forks_count, open_issues_count, etc.)
}

// --- Headers Comunes ---
const commonHeaders: HeadersInit = {
  Accept: 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28',
};
if (GITHUB_TOKEN) {
  commonHeaders['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
} else {
  console.warn('Missing GITHUB_TOKEN environment variable. GitHub API rate limits will be lower.');
}

// --- Función para obtener el contenido del README (sin cambios) ---
export const getReadmeContent = cache(async (repoName: string): Promise<string | null> => {
    if (!REPO_OWNER || !repoName) {
        console.error('Missing REPO_OWNER or repoName for getReadmeContent');
        return null;
    }

    const url = `${GITHUB_API_BASE_URL}/repos/${REPO_OWNER}/${repoName}/readme`;
    // Quitamos el log de fetching para no llenar la consola en el bucle
    // console.log(`Workspaceing README from: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                ...commonHeaders,
                Accept: 'application/vnd.github.raw+json',
            },
            next: { revalidate: 3600 }
        });

        if (response.ok) {
            const content = await response.text();
            // console.log(`Successfully fetched README content for: ${repoName}`);
            return content;
        } else if (response.status === 404) {
            // console.log(`No README file found for repository: ${repoName}`);
            return null;
        } else {
            // No lanzamos error aquí, simplemente logueamos y retornamos null
            // para que el filtro pueda manejarlo
            console.error(`Failed to fetch README for ${repoName}: ${response.status} ${response.statusText}`);
            // throw new Error(`Failed to fetch README for ${repoName}: ${response.status} ${response.statusText}`);
            return null; // Indica fallo o ausencia de README
        }

    } catch (error) {
        console.error(`Error fetching README for ${repoName} from GitHub:`, error);
        return null; // Error al obtener README
    }
});


// --- Función MODIFICADA para obtener y FILTRAR repositorios públicos ---
export const getPublicRepositories = cache(async (): Promise<GitHubRepository[]> => {
  if (!REPO_OWNER) {
    console.error('Missing GITHUB_REPO_OWNER environment variable');
    return [];
  }

  const url = `${GITHUB_API_BASE_URL}/users/${REPO_OWNER}/repos?type=public&sort=updated&per_page=100`; // Considera paginación si tienes más de 100
  console.log(`Workspaceing public repos list from: ${url}`);

  let initialRepos: GitHubRepository[] = [];

  try {
    const response = await fetch(url, {
      headers: commonHeaders,
      next: { revalidate: 3600 } // Revalidar cada hora
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repository list: ${response.status} ${response.statusText}`);
    }

    initialRepos = (await response.json()) as GitHubRepository[];
    console.log(`Workspaceed ${initialRepos.length} initial public repositories.`);

  } catch (error) {
    console.error('Error fetching initial repository list from GitHub:', error);
    return []; // Devuelve array vacío en caso de error inicial
  }

  // --- Inicio del Filtrado ---
  console.log('Filtering repositories based on README content and length...');

  // 1. Crear promesas para obtener el README de cada repositorio
  //    Usamos Promise.all para ejecutarlas en paralelo (más rápido)
  const readmeCheckPromises = initialRepos.map(async (repo) => {
    const readmeContent = await getReadmeContent(repo.name); // Usa la función de caché
    return {
      repo, // Mantenemos la información original del repo
      hasValidReadme: readmeContent !== null && readmeContent.length >= 100 // Condición de filtro
    };
  });

  // 2. Esperar a que todas las promesas de verificación de README se completen
  let reposWithReadmeStatus: Array<{ repo: GitHubRepository; hasValidReadme: boolean }> = [];
  try {
    reposWithReadmeStatus = await Promise.all(readmeCheckPromises);
  } catch (error) {
      // Aunque getReadmeContent maneja errores, Promise.all podría fallar por otras razones
      console.error("Error during parallel README fetching:", error);
      // Podrías decidir devolver la lista sin filtrar o una lista vacía
      // return initialRepos; // Opción: devolver sin filtrar si algo falla
      return []; // Opción: devolver vacío
  }


  // 3. Filtrar la lista basada en el resultado de la verificación del README
  const filteredRepos = reposWithReadmeStatus
    .filter(item => item.hasValidReadme) // Quédate solo con los que tienen README válido
    .map(item => item.repo); // Extrae solo la información del repositorio

  console.log(`Finished filtering. Kept ${filteredRepos.length} out of ${initialRepos.length} repositories.`);

  return filteredRepos;
  // --- Fin del Filtrado ---

});


// --- Función para obtener detalles de UN repositorio por nombre (sin cambios) ---
export const getRepositoryByName = cache(async (repoName: string): Promise<GitHubRepository | null> => {
  if (!REPO_OWNER) {
    console.error('Missing GITHUB_REPO_OWNER environment variable');
    return null;
  }
  if (!repoName) {
    console.error('repoName parameter is missing for getRepositoryByName');
    return null;
  }

  const url = `${GITHUB_API_BASE_URL}/repos/${REPO_OWNER}/${repoName}`;
  console.log(`Workspaceing repository details from: ${url}`);

  try {
    const response = await fetch(url, {
      headers: commonHeaders,
      next: { revalidate: 3600 }
    });

    if (response.ok) {
      const repoDetails = (await response.json()) as GitHubRepository;
      console.log(`Successfully fetched details for: ${repoName}`);
      return repoDetails;
    } else if (response.status === 404) {
      console.warn(`Repository not found: ${REPO_OWNER}/${repoName}`);
      return null;
    } else {
      throw new Error(`Failed to fetch repository details for ${repoName}: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error fetching details for ${repoName} from GitHub:`, error);
    return null;
  }
});