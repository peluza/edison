import { notFound } from "next/navigation";
import { allProjects } from "contentlayer/generated";
import ClientComponent from './client';

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = allProjects.find((p) => p.slug === slug);

  if (!project) {
    notFound();
  }

  // Aquí puedes obtener las views del proyecto, si las tienes disponibles
  const currentProjectViews = 0;

  return <ClientComponent project={project} slug={slug} initialViews={currentProjectViews} />;
}

export async function generateStaticParams() {
  return allProjects
    .filter((p) => p.published)
    .map((p) => ({
      params: {
        slug: p.slug,
      },
    }));
}