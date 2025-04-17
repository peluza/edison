"use client"
import { SiLinkedin, SiGithub } from "react-icons/si";
import { AiOutlineMail } from "react-icons/ai";

import React from 'react'
import Link from "next/link";
import { Navigation } from "@/app/components/Nav/nav";
import { Card } from "@/app/components/Card/card";


const socials = [
    {
        icon: <SiLinkedin size={20} />, 
        href: "https://www.linkedin.com/in/edison-isaza",
        label: "Linkedin",
        handle: "@edison",
    },
    {
        icon: <AiOutlineMail size={20} />,
        href: "mailto:edisonisaza@gmail.com",
        label: "Email",
        handle: "edisonisaza@gmail.com",
    },
    {
        icon: <SiGithub size={20} />,
        href: "https://github.com/peluza",
        label: "Github",
        handle: "peluza",
    },
];

export default function Contact() {
  return (
    <div className="bg-gradient-to-tl from-black via-zinc-600/20 to-black">
            <Navigation />
            <div className="container flex items-center justify-center min-h-screen px-4 mx-auto">
                <div className="grid w-full grid-cols-1 gap-8 mx-auto mt-32 sm:mt-0 sm:grid-cols-3 lg:gap-16">
                    {socials.map((s) => (
                        <Card key={s.label}>
                            <Link
                                href={s.href}
                                target="_blank"
                                className="p-4 relative flex flex-col items-center gap-4 duration-700 group md:gap-8 md:py-24  lg:pb-48  md:p-16"
                            >
                                <span
                                    className="absolute w-px h-2/3 bg-gradient-to-b from-green-400 via-green-400/50 to-transparent"
                                    aria-hidden="true"
                                />
                                <span className="relative z-10 flex items-center justify-center w-12 h-12 text-sm duration-1000 border rounded-full text-white group-hover:text-green-400 border-green-400 bg-green-700 group-hover:bg-white group-hover:border-white drop-shadow-orange">
                                    {s.icon}
                                </span>{" "}
                                <div className="z-10 flex flex-col items-center">
                                    <span className="lg:text-xl font-medium duration-150 xl:text-3xl text-green-400 group-hover:text-white font-display">
                                        {s.handle}
                                    </span>
                                    <span className="mt-4 text-sm text-center duration-1000 text-green-300 group-hover:text-green-400">
                                        {s.label}
                                    </span>
                                </div>
                            </Link>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
  )
}