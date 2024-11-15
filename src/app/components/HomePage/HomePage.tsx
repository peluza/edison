"use client"
import React from 'react'
import { NavHomePage } from '../NavHomePage/NavHomePage'
import { MainParticles } from '../MainParticles/MainParticles'

export const HomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen overflow-hidden bg-gradient-to-tl from-black via-zinc-600/20 to-black">
      <NavHomePage/>
      <MainParticles/>
    </div>
  )
}
