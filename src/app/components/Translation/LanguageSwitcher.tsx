"use client";

import React, { useState } from 'react';
import { useTranslation } from './TranslationProvider';
import { FaLanguage, FaSpinner, FaCheck, FaGlobeAmericas } from 'react-icons/fa';

export default function LanguageSwitcher() {
    const { isSupported, targetLanguage, setTargetLanguage, translate, isTranslating, modelStatus } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    // If HW not supported, don't render anything (as per requirements)
    if (!isSupported) return null;

    const languages = [
        { code: 'eng_Latn', label: 'English', flag: '🇺🇸' },
        { code: 'spa_Latn', label: 'Español', flag: '🇪🇸' },
        { code: 'fra_Latn', label: 'Français', flag: '🇫🇷' },
        { code: 'deu_Latn', label: 'Deutsch', flag: '🇩🇪' },
        { code: 'ita_Latn', label: 'Italiano', flag: '🇮🇹' },
        { code: 'pt_Latn', label: 'Português', flag: '🇵🇹' },
        { code: 'zho_Hans', label: '中文', flag: '🇨🇳' },
        { code: 'jpn_Jpan', label: '日本語', flag: '🇯🇵' },
    ];

    const handleTranslate = () => {
        setIsOpen(false);
        translate();
    };

    return (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2">
            {/* Main Toggle */}
            <div className="relative">
                {isOpen && (
                    <div className="absolute bottom-full mb-3 right-0 bg-gray-900/95 border border-gray-700 rounded-xl shadow-2xl overflow-hidden min-w-[160px] backdrop-blur-md">
                        <div className="p-2 border-b border-gray-800 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                            Translate to...
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => setTargetLanguage(lang.code)}
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors ${targetLanguage === lang.code
                                        ? 'bg-blue-600/20 text-blue-400'
                                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                        }`}
                                >
                                    <span className="text-lg">{lang.flag}</span>
                                    <span className="flex-1">{lang.label}</span>
                                    {targetLanguage === lang.code && <FaCheck className="text-xs" />}
                                </button>
                            ))}
                        </div>
                        <div className="p-2 border-t border-gray-800">
                            <button
                                onClick={handleTranslate}
                                disabled={isTranslating}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isTranslating ? 'Translating...' : 'Translate Page'}
                            </button>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`p-4 rounded-full shadow-lg transition-all transform hover:scale-110 active:scale-95 ${isTranslating
                        ? 'bg-blue-600 animate-pulse cursor-wait'
                        : isOpen
                            ? 'bg-gray-700 text-white rotate-90'
                            : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20'
                        }`}
                    title="Translate Page"
                >
                    {isTranslating ? <FaSpinner className="animate-spin text-xl" /> : <FaGlobeAmericas className="text-xl" />}
                </button>
            </div>
        </div>
    );
}
