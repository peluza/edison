"use client";

import { FaArrowLeft } from "react-icons/fa";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

export const Navigation: React.FC = () => {
    const ref = useRef<HTMLElement>(null);
    const [isIntersecting, setIntersecting] = useState(true);

    useEffect(() => {
        if (!ref.current) return;
        const observer = new IntersectionObserver(([entry]) =>
            setIntersecting(entry.isIntersecting),
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <header ref={ref}>
            <div
                className={`fixed inset-x-0 top-0 z-50 backdrop-blur  duration-200 border-b  ${
                    isIntersecting
                        ? "bg-zinc-900/0 border-transparent"
                        : "bg-zinc-900/500  border-zinc-800 "
                }`}
            >
                <div className="container flex flex-row-reverse items-center justify-between p-6 mx-auto">
                    <div className="flex justify-between gap-8">
                        <Link
                            href="/repositories"
                            className="duration-200 text-green-400 hover:text-green-300"
                        >
                            Projects
                        </Link>
                        <Link
                            href="/contact"
                            className="duration-200 text-green-400 hover:text-green-300"
                        >
                            Contact
                        </Link>
                    </div>

                    <Link
                        href="/"
                        className="duration-200 text-green-300 hover:text-green-400"
                    >
                        <FaArrowLeft className="w-6 h-6 " />
                    </Link>
                </div>
            </div>
        </header>
    );
};