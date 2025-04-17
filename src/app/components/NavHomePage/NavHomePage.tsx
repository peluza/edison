"use client"
import React from 'react'
import Link from 'next/link';

const navigation = [
    { name: "Projects", href: "/repositories" },
    { name: "Contact", href: "/contact" },
  ];

export const NavHomePage = () => {
  return (
    <nav className="my-16 animate-fade-in">
        <ul className="flex items-center justify-center gap-4">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm duration-500 text-white hover:text-green-300"
            >
              {item.name}
            </Link>
          ))}
        </ul>
      </nav>
  )
}
