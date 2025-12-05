
import { NextResponse } from 'next/server';
import { getPublicRepositories } from '@/app/utils/github';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic'; // Ensure it's not cached at build time

export async function GET() {
  try {
    // 1. Obtener datos de GitHub (sin cache agresivo para este ejemplo, o usar el que ya tenemos)
    const githubData = await getPublicRepositories();

    // 2. Leer el perfil local
    const profilePath = path.join(process.cwd(), 'src/data/profile.json');
    const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

    // 3. Leer el prompt XML
    const xmlPath = path.join(process.cwd(), 'src/app/utils/expert_persona.xml');
    let xmlTemplate = fs.readFileSync(xmlPath, 'utf8');

    // 4. Inyectar contexto en el XML
    const systemInstruction = xmlTemplate
      .replace('{{PROFILE_CONTEXT}}', JSON.stringify(profileData, null, 2))
      .replace('{{GITHUB_CONTEXT}}', JSON.stringify(githubData, null, 2));

    return NextResponse.json({
      systemInstruction,
      context: {
        github: githubData,
        profile: profileData
      }
    });
  } catch (error) {
    console.error('Error generando contexto del agente:', error);
    return NextResponse.json(
      { error: 'Error interno generando contexto' },
      { status: 500 }
    );
  }
}
