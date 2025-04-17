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

// (La interfaz GitHubReadme no es necesaria para getRepositoryByName, pero sí para getReadmeContent)
// interface GitHubReadme { ... }

// --- Headers Comunes ---
const commonHeaders: HeadersInit = { // Especificamos el tipo HeadersInit
  Accept: 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28',
};
// Añadimos Authorization solo si GITHUB_TOKEN existe
if (GITHUB_TOKEN) {
  commonHeaders['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
} else {
  // Advertimos solo una vez si falta el token
  console.warn('Missing GITHUB_TOKEN environment variable. GitHub API rate limits will be lower.');
}


// --- Función para obtener TODOS los repositorios públicos ---
export const getPublicRepositories = cache(async (): Promise<GitHubRepository[]> => {
  if (!REPO_OWNER) {
    console.error('Missing GITHUB_REPO_OWNER environment variable');
    return [];
  }

  const url = `${GITHUB_API_BASE_URL}/users/${REPO_OWNER}/repos?type=public&sort=updated&per_page=100`;
  console.log(`Fetching public repos from: ${url}`);

  try {
    const response = await fetch(url, {
      headers: commonHeaders,
      next: { revalidate: 3600 } // Revalidar cada hora
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repository list: ${response.status} ${response.statusText}`);
    }

    const repos = (await response.json()) as GitHubRepository[];
    console.log(`Fetched ${repos.length} public repositories.`);
    return repos;

  } catch (error) {
    console.error('Error fetching repository list from GitHub:', error);
    return []; // Devuelve array vacío en caso de error
  }
});

// --- *** NUEVA FUNCIÓN para obtener detalles de UN repositorio por nombre *** ---
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
  console.log(`Fetching repository details from: ${url}`);

  try {
    const response = await fetch(url, {
      headers: commonHeaders,
      next: { revalidate: 3600 } // Revalidar cada hora
    });

    if (response.ok) {
      const repoDetails = (await response.json()) as GitHubRepository;
      console.log(`Successfully fetched details for: ${repoName}`);
      return repoDetails;
    } else if (response.status === 404) {
      console.warn(`Repository not found: ${REPO_OWNER}/${repoName}`);
      // Podrías lanzar notFound() aquí si quieres que la página devuelva un 404
      // notFound();
      return null; // O devolver null para que el componente decida qué hacer
    } else {
      // Otro tipo de error (rate limit, error del servidor, etc.)
      throw new Error(`Failed to fetch repository details for ${repoName}: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error fetching details for ${repoName} from GitHub:`, error);
    return null; // Devuelve null en caso de error
  }
});


// --- Función para obtener el contenido del README ---
export const getReadmeContent = cache(async (repoName: string): Promise<string | null> => {
    if (!REPO_OWNER || !repoName) {
        console.error('Missing REPO_OWNER or repoName for getReadmeContent');
        return null;
    }

    const url = `${GITHUB_API_BASE_URL}/repos/${REPO_OWNER}/${repoName}/readme`;
    console.log(`Fetching README from: ${url}`);

    try {
        // Usamos 'application/vnd.github.raw+json' para obtener el contenido directamente
        const response = await fetch(url, {
            headers: {
                ...commonHeaders, // Incluye el token si existe
                Accept: 'application/vnd.github.raw+json', // Pide el contenido raw
            },
            next: { revalidate: 3600 } // Revalidar cada hora
        });

        if (response.ok) {
            const content = await response.text();
            console.log(`Successfully fetched README content for: ${repoName}`);
            return content; // Devuelve el contenido como texto plano
        } else if (response.status === 404) {
            console.log(`No README file found for repository: ${repoName}`);
            return null; // No hay README
        } else {
            throw new Error(`Failed to fetch README for ${repoName}: ${response.status} ${response.statusText}`);
        }

    } catch (error) {
        console.error(`Error fetching README for ${repoName} from GitHub:`, error);
        return null; // Error al obtener README
    }
});