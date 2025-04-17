// src/lib/github.ts o src/app/utils/github.ts
import { cache } from 'react';
import { notFound } from 'next/navigation';



const GITHUB_API_BASE_URL = process.env.GITHUB_API_URL || 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.GITHUB_REPO_OWNER; 


interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
}


interface GitHubReadme {
    content: string; 
    encoding: string;
    download_url: string;
}


const commonHeaders = {
  Accept: 'application/vnd.github.v3+json',
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  'X-GitHub-Api-Version': '2022-11-28',
};


export const getPublicRepositories = cache(async (): Promise<GitHubRepository[]> => {
  if (!REPO_OWNER) {
    console.error('Missing GITHUB_REPO_OWNER environment variable');
    return [];
  }
  if (!GITHUB_TOKEN) {
    console.warn('Missing GITHUB_TOKEN environment variable. Rate limits will be lower.');
  }

  
  const url = `${GITHUB_API_BASE_URL}/users/${REPO_OWNER}/repos?type=public&sort=updated&per_page=100`; // Trae hasta 100, ordenados por última actualización

  console.log(`Workspaceing public repos from: ${url}`);

  try {
    const response = await fetch(url, {
      headers: commonHeaders,
      next: { revalidate: 3600 } 
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repository list: ${response.status} ${response.statusText}`);
    }

    const repos = (await response.json()) as GitHubRepository[];
    console.log(`Workspaceed ${repos.length} public repositories.`);
    return repos;

  } catch (error) {
    console.error('Error fetching repository list from GitHub:', error);
    return []; 
  }
});

export const getReadmeContent = cache(async (repoName: string): Promise<string | null> => {
    if (!REPO_OWNER || !repoName) {
        console.error('Missing REPO_OWNER or repoName for getReadmeContent');
        return null;
    }
    if (!GITHUB_TOKEN) {
      console.warn('Missing GITHUB_TOKEN environment variable. Rate limits will be lower.');
    }

    const url = `${GITHUB_API_BASE_URL}/repos/${REPO_OWNER}/${repoName}/readme`;
    console.log(`Workspaceing README from: ${url}`);

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
            console.log(`Successfully fetched README content for: ${repoName}`);
            return content;
        } else if (response.status === 404) {
            console.log(`No README file found for repository: ${repoName}`);
            return null; 
        } else {
            throw new Error(`Failed to fetch README for ${repoName}: ${response.status} ${response.statusText}`);
        }

    } catch (error) {
        console.error(`Error fetching README for ${repoName} from GitHub:`, error);
        return null; 
    }
});
