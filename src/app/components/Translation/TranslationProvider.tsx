"use client";

import { usePathname } from "next/navigation";
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

interface TranslationContextType {
    isSupported: boolean;
    targetLanguage: string;
    setTargetLanguage: (lang: string) => void;
    translate: () => Promise<void>;
    isTranslating: boolean;
    modelStatus: string;
    autoTranslate: boolean;
    setAutoTranslate: (auto: boolean) => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const useTranslation = () => {
    const context = useContext(TranslationContext);
    if (!context) {
        throw new Error("useTranslation must be used within a TranslationProvider");
    }
    return context;
};

// Map browser languages to NLLB codes (simplified subset)
const LANGUAGE_MAP: Record<string, string> = {
    'en': 'eng_Latn',
    'es': 'spa_Latn',
    'fr': 'fra_Latn',
    'de': 'deu_Latn',
    'it': 'ita_Latn',
    'pt': 'por_Latn',
    'zh': 'zho_Hans',
    'ja': 'jpn_Jpan',
    'ko': 'kor_Hang',
    'ru': 'rus_Cyrl',
    'hi': 'hin_Deva',
    'ar': 'arb_Arab',
};

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isSupported, setIsSupported] = useState(false);
    const [targetLanguage, setTargetLanguage] = useState<string>('eng_Latn');
    const [isTranslating, setIsTranslating] = useState(false);
    const [modelStatus, setModelStatus] = useState<string>('');
    const [autoTranslate, setAutoTranslate] = useState(false);
    const [isActive, setIsActive] = useState(false); // Controlado por el coordinator

    // Refs for pipeline
    const translatorRef = useRef<any>(null);
    const tokenizerRef = useRef<any>(null);
    const isPipelineLoadingRef = useRef(false);

    // Escuchar eventos del ModelCoordinator
    useEffect(() => {
        const handleCoordinatorEvent = (event: CustomEvent<{ action: string }>) => {
            const { action } = event.detail;

            if (action === 'activate-translator') {
                console.log('[Translation] Received activate command from coordinator');
                setIsActive(true);
            } else if (action === 'dispose-translator') {
                console.log('[Translation] Received dispose command from coordinator');
                disposeTranslator();
                setIsActive(false);
            }
        };

        window.addEventListener('model-coordinator', handleCoordinatorEvent as EventListener);
        return () => {
            window.removeEventListener('model-coordinator', handleCoordinatorEvent as EventListener);
        };
    }, []);

    // Dispose function para liberar recursos ONNX
    const disposeTranslator = useCallback(() => {
        if (translatorRef.current) {
            console.log('[Translation] Disposing translator model...');
            try {
                // Intentar liberar recursos si el modelo tiene método dispose
                if (typeof translatorRef.current.dispose === 'function') {
                    translatorRef.current.dispose();
                }
            } catch (e) {
                console.warn('[Translation] Error during dispose:', e);
            }
            translatorRef.current = null;
            tokenizerRef.current = null;
            setModelStatus('');
            console.log('[Translation] Translator disposed');
        }
    }, []);

    // 1. Initial Resource & Language Check
    useEffect(() => {
        const checkCapabilities = async () => {
            // @ts-ignore
            const ram = (navigator as any).deviceMemory || 0;
            const hasWebGPU = !!(navigator as any).gpu;

            console.log(`[Translation] RAM: ${ram}GB, WebGPU: ${hasWebGPU}`);

            if (ram >= 4 && hasWebGPU) {
                setIsSupported(true);

                // Detectar idioma del navegador y traducir TODO a ese idioma
                // El contenido viene mezclado (español/inglés de GitHub), así que unificamos
                const browserLang = navigator.language.split('-')[0];
                console.log(`[Translation] Browser language: ${browserLang}`);

                const mappedLang = LANGUAGE_MAP[browserLang];
                if (mappedLang) {
                    setTargetLanguage(mappedLang);
                    console.log(`[Translation] Will unify all content to: ${mappedLang}`);
                } else {
                    // Fallback a inglés si el idioma no está mapeado
                    setTargetLanguage('eng_Latn');
                    console.log(`[Translation] Language ${browserLang} not mapped, defaulting to English`);
                }
                // NO activar autoTranslate aquí - el coordinator lo controla
            }
        };
        checkCapabilities();
    }, []);

    // 2. Initialize Translator cuando está activo
    const initTranslator = useCallback(async () => {
        if (translatorRef.current || isPipelineLoadingRef.current) return;

        isPipelineLoadingRef.current = true;
        setModelStatus('Cargando modelo de traducción...');

        try {
            const { AutoTokenizer, AutoModelForSeq2SeqLM, env } = await import('@huggingface/transformers');

            env.allowLocalModels = false;
            env.useBrowserCache = true;
            // @ts-ignore
            env.token = process.env.NEXT_PUBLIC_HF_TOKEN;

            const modelId = 'Xenova/nllb-200-distilled-600M';

            console.log('[Translation] Loading tokenizer...');
            const tokenizer = await AutoTokenizer.from_pretrained(modelId);
            tokenizerRef.current = tokenizer;

            console.log('[Translation] Loading model...');
            const model = await AutoModelForSeq2SeqLM.from_pretrained(modelId, {
                device: 'wasm',
                dtype: 'q8',
                progress_callback: (data: any) => {
                    if (data.status === 'progress') {
                        setModelStatus(`Descargando: ${Math.round(data.progress)}%`);
                    }
                }
            });

            translatorRef.current = model;
            setModelStatus('Traductor listo.');
            console.log('[Translation] Model loaded.');

            setTimeout(() => setModelStatus(''), 2000);

        } catch (error) {
            console.error("[Translation] Failed to load model:", error);
            setModelStatus('Error al cargar.');
            setIsSupported(false);
        } finally {
            isPipelineLoadingRef.current = false;
        }
    }, []);

    // Ref para saber si necesitamos traducción inicial
    const needsInitialTranslation = useRef(false);

    // Iniciar traductor cuando se activa
    useEffect(() => {
        if (isActive && isSupported && !translatorRef.current && !isPipelineLoadingRef.current) {
            console.log('[Translation] Activating - initializing model...');
            needsInitialTranslation.current = true;
            initTranslator().then(() => {
                setAutoTranslate(true);
            });
        }
    }, [isActive, isSupported, initTranslator]);

    // 3. Translation Logic (DOM Walker)
    const translate = useCallback(async () => {
        if (!isSupported || !isActive) {
            if (!isActive) console.log('[Translation] Skipping - Not active');
            return;
        }

        // Ensure model is loaded
        if (!translatorRef.current) {
            await initTranslator();
            if (!translatorRef.current) return;
        }

        setIsTranslating(true);
        setModelStatus('Traduciendo página...');

        // HELPER: Collect text nodes
        const textNodes: { node: Node, original: string }[] = [];
        const walk = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent?.trim();
                if (text && text.length > 2 && !node.parentElement?.closest('script, style, noscript, [data-no-translate]')) {
                    textNodes.push({ node, original: text });
                }
            } else {
                node.childNodes.forEach(walk);
            }
        }

        const contentRoot = document.getElementById('main-content') || document.body;
        walk(contentRoot);

        console.log(`[Translation] Found ${textNodes.length} text nodes to translate.`);

        try {
            const batchSize = 4;
            for (let i = 0; i < textNodes.length; i += batchSize) {
                // Check if still active before each batch
                if (!isActive) {
                    console.log('[Translation] Stopped - deactivated during translation');
                    break;
                }

                const batch = textNodes.slice(i, i + batchSize);
                const texts = batch.map(b => b.original);

                const inputs = await tokenizerRef.current(texts, { padding: true, truncation: true, return_tensors: 'pt' });

                let targetLangToken: any;
                if (typeof tokenizerRef.current.convert_tokens_to_ids === 'function') {
                    targetLangToken = tokenizerRef.current.convert_tokens_to_ids(targetLanguage);
                } else {
                    const encoded = await tokenizerRef.current(targetLanguage, { add_special_tokens: false });
                    if (encoded.input_ids) {
                        targetLangToken = encoded.input_ids.data ? encoded.input_ids.data[0] : encoded.input_ids[0];
                    } else if (Array.isArray(encoded)) {
                        targetLangToken = encoded[0];
                    }
                }

                if (targetLangToken === undefined) {
                    console.warn(`[Translation] Could not find token ID for ${targetLanguage}`);
                    continue;
                }

                const outputs = await translatorRef.current.generate({
                    ...inputs,
                    forced_bos_token_id: targetLangToken,
                    max_new_tokens: 128,
                });

                const decoded = await tokenizerRef.current.batch_decode(outputs, { skip_special_tokens: true });

                batch.forEach((item, idx) => {
                    if (decoded[idx]) {
                        item.node.textContent = decoded[idx];
                    }
                });

                await new Promise(r => setTimeout(r, 10));
                console.log(`[Translation] Progress: ${Math.round(((i + batchSize) / textNodes.length) * 100)}%`);
            }

            console.log('[Translation] Complete.');
            setModelStatus('');

        } catch (e) {
            console.error("Translation error", e);
            setModelStatus('');
        } finally {
            setIsTranslating(false);
        }

    }, [isSupported, isActive, targetLanguage, initTranslator]);

    // Ejecutar traducción inicial después de que el modelo esté listo
    useEffect(() => {
        if (needsInitialTranslation.current && translatorRef.current && isActive) {
            console.log('[Translation] Model ready, starting initial translation...');
            needsInitialTranslation.current = false;
            setTimeout(() => translate(), 500);
        }
    }, [autoTranslate, isActive, translate]);

    // 4. Auto-translation & Navigation Logic
    const pathname = usePathname();
    const lastPathnameRef = useRef(pathname);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // MutationObserver for dynamic content
    useEffect(() => {
        if (!autoTranslate || !isSupported || !isActive) return;

        const observer = new MutationObserver((mutations) => {
            const hasTextUpdates = mutations.some(m =>
                m.type === 'childList' && m.addedNodes.length > 0 ||
                (m.type === 'characterData' && m.target.textContent && m.target.textContent.length > 2)
            );

            if (hasTextUpdates) {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => {
                    console.log("[Translation] Dynamic content detected, translating...");
                    translate();
                }, 2000);
            }
        });

        const target = document.getElementById('main-content') || document.body;
        observer.observe(target, { childList: true, subtree: true, characterData: true });

        return () => {
            observer.disconnect();
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [autoTranslate, isSupported, isActive, translate]);

    useEffect(() => {
        if (!autoTranslate || !isSupported || !isActive) return;

        if (pathname !== lastPathnameRef.current || !lastPathnameRef.current) {
            console.log("[Translation] Route changed, translating...");

            if (debounceRef.current) clearTimeout(debounceRef.current);

            lastPathnameRef.current = pathname;
            setTimeout(() => translate(), 3000);
        }
    }, [pathname, autoTranslate, isSupported, isActive, translate]);


    return (
        <TranslationContext.Provider value={{
            isSupported,
            targetLanguage,
            setTargetLanguage,
            translate,
            isTranslating,
            modelStatus,
            autoTranslate,
            setAutoTranslate
        }}>
            {children}
        </TranslationContext.Provider>
    );
};
