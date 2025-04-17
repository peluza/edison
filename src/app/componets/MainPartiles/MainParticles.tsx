"use client"
import React from 'react'
import Particles from "@/app/componets/Particles/particles";

export const MainParticles = () => {
  return (
    <main className='flex flex-col items-center justify-center w-full h-full overflow-hidden'>
      <div className="hidden w-screen h-px animate-glow md:block animate-fade-left bg-gradient-to-r from-green-400/0 via-green-400/50 to-green-400/0" />
      <Particles
        className="absolute inset-0 -z-10 animate-fade-in"
        quantity={100}
        color="#00ff00"
      />
      <h1 className="py-3.5 px-0.5 z-10 text-4xl text-transparent duration-1000 bg-white cursor-default text-edge-outline animate-title font-display sm:text-6xl md:text-9xl whitespace-nowrap bg-clip-text ">
        EDISON
      </h1>

      <div className="hidden w-screen h-px animate-glow md:block animate-fade-right bg-gradient-to-r from-green-400/0 via-green-400/50 to-green-400/0" />
      <div className="my-16 text-center animate-fade-in">
        <h2 className="text-sm text-white ">
          I am a full stack software developer, with knowledge of ethical hacking
        </h2>
      </div>
    </main>
  )
}
