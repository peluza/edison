"use client";
import React, { useState, useEffect } from "react";
import { allProjects } from "../../../.contentlayer/generated";
import { Navigation } from "../components/Nav/nav";
import { Card } from "../components/Card/card";
import { Article } from "./article";
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../util/firebaseConfig';

interface ProjectsPageProps {}

export default function ProjectsPage({ }: ProjectsPageProps) {
  const [views, setViews] = useState<Record<string, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const firestore = db;

        if (!firestore) {
          throw new Error('Firestore no está inicializado');
        }

        const viewsSnapshot = await getDocs(collection(firestore, 'pageviews'));
        const viewsData: Record<string, number> = {};
        viewsSnapshot.forEach((doc) => {
          viewsData[doc.id] = doc.data().views || 0;
        });
        setViews(viewsData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        setError("Ocurrió un error al cargar los proyectos. Por favor, inténtalo de nuevo más tarde.");
      }
    };

    fetchData();
  }, []);

  const featured = allProjects.find((project) => project.slug === "airbnb_clone")!;
  const top2 = allProjects.find((project) => project.slug === "printf")!;
  const top3 = allProjects.find((project) => project.slug === "ntp_server")!;

  const sorted = allProjects
    .filter((p) => p.published)
    .filter(
      (project) =>
        project.slug !== featured.slug &&
        project.slug !== top2.slug &&
        project.slug !== top3.slug,
    )
    .sort(
      (a, b) =>
        new Date(b.date ?? Number.POSITIVE_INFINITY).getTime() -
        new Date(a.date ?? Number.POSITIVE_INFINITY).getTime(),
    );

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="relative pb-16 bg-gradient-to-tl from-black via-zinc-600/20 to-black">
      <Navigation />
      <div className="px-6 pt-20 mx-auto space-y-8 max-w-7xl lg:px-8 md:space-y-16 md:pt-24 lg:pt-32">
        <div className="max-w-2xl mx-auto lg:mx-0">
          <h2 className="text-3xl font-bold tracking-tight text-green-400 sm:text-4xl">
            Projects
          </h2>
          <p className="mt-4 text-green-300">
            Some of the projects are from work and some are on my own time.
          </p>
        </div>
        <div className="w-full h-px bg-zinc-800" />

        <div className="grid grid-cols-1 gap-8 mx-auto lg:grid-cols-2 ">
          {/* Aplicamos 'Article' a 'featured' */}
          <Card key={featured.slug}>
            <Article project={featured} views={views ? views[featured.slug] ?? 0 : 0} />
          </Card>

          <div className="flex flex-col w-full gap-8 mx-auto border-t border-gray-900/10 lg:mx-0 lg:border-t-0 ">
            {[top2, top3].map((project) => (
              <Card key={project.slug}>
                <Article project={project} views={views ? views[project.slug] ?? 0 : 0} />
              </Card>
            ))}
          </div>
        </div>
        <div className="hidden w-full h-px md:block bg-zinc-800" />

        <div className="grid grid-cols-1 gap-4 mx-auto lg:mx-0 md:grid-cols-3">
          <div className="grid grid-cols-1 gap-4">
            {sorted
              .filter((_, i) => i % 3 === 0)
              .map((project) => (
                <Card key={project.slug}>
                  <Article project={project} views={views ? views[project.slug] ?? 0 : 0} />
                </Card>
              ))}
          </div>
          <div className="grid grid-cols-1 gap-4">
            {sorted
              .filter((_, i) => i % 3 === 1)
              .map((project) => (
                <Card key={project.slug}>
                  <Article project={project} views={views ? views[project.slug] ?? 0 : 0} />
                </Card>
              ))}
          </div>
          <div className="grid grid-cols-1 gap-4">
            {sorted
              .filter((_, i) => i % 3 === 2)
              .map((project) => (
                <Card key={project.slug}>
                  <Article project={project} views={views ? views[project.slug] ?? 0 : 0} />
                </Card>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}