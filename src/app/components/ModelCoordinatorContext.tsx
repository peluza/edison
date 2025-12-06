"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

interface ModelCoordinatorContextType {
    hasEnoughRAM: boolean;
    activeModel: 'translator' | 'chatbot' | 'none' | 'preloading';
    preloadComplete: boolean;
    requestSwitchToChatbot: () => void;
    requestSwitchToTranslator: () => void;
    ramGB: number;
}

const ModelCoordinatorContext = createContext<ModelCoordinatorContextType | undefined>(undefined);

export const useModelCoordinator = () => {
    const context = useContext(ModelCoordinatorContext);
    if (!context) {
        throw new Error("useModelCoordinator must be used within a ModelCoordinatorProvider");
    }
    return context;
};

// Threshold de RAM en GB para usar modelos locales
const RAM_THRESHOLD_GB = 4;

export const ModelCoordinatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hasEnoughRAM, setHasEnoughRAM] = useState(false);
    const [ramGB, setRamGB] = useState(0);
    const [activeModel, setActiveModel] = useState<'translator' | 'chatbot' | 'none' | 'preloading'>('none');
    const [preloadComplete, setPreloadComplete] = useState(false);

    // Refs para tracking de precarga
    const translatorPreloaded = useRef(false);
    const chatbotPreloaded = useRef(false);

    // Verificar RAM al inicio
    useEffect(() => {
        const checkRAM = () => {
            // @ts-ignore - navigator.deviceMemory is experimental
            const ram = (navigator as any).deviceMemory || 0;
            setRamGB(ram);

            console.log(`[ModelCoordinator] Detected RAM: ${ram}GB, Threshold: ${RAM_THRESHOLD_GB}GB`);

            // TRADUCCIÓN DESHABILITADA TEMPORALMENTE
            // La lógica está lista, pero el rendimiento es muy lento para uso en producción.
            // TODO: Optimizar con:
            // - Traducción batch más grande
            // - Web Worker para no bloquear UI
            // - Caché de traducciones
            // - Modelo más ligero
            console.log('[ModelCoordinator] Translation DISABLED - Performance optimization needed');
            setHasEnoughRAM(false);
            setActiveModel('none');

            /* LÓGICA ORIGINAL - Descomentar cuando esté optimizado:
            if (ram >= RAM_THRESHOLD_GB) {
                setHasEnoughRAM(true);
                setActiveModel('preloading');
                console.log('[ModelCoordinator] RAM sufficient - Will preload both models');
            } else {
                setHasEnoughRAM(false);
                setActiveModel('none');
                console.log('[ModelCoordinator] RAM insufficient - Using Gemini API only, no translator');
            }
            */
        };

        checkRAM();
    }, []);

    // Precargar ambos modelos cuando hay suficiente RAM
    useEffect(() => {
        if (!hasEnoughRAM || preloadComplete) return;

        const preloadModels = async () => {
            console.log('[ModelCoordinator] Starting model preload...');

            try {
                // Importar transformers para precargar
                const { AutoTokenizer, AutoModelForSeq2SeqLM, AutoModelForCausalLM, env } =
                    await import('@huggingface/transformers');

                env.allowLocalModels = false;
                env.useBrowserCache = true;

                const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN;
                if (hfToken) {
                    // @ts-ignore
                    env.token = hfToken;
                }

                // Precargar traductor (NLLB) - Solo descarga, no crea sesión
                console.log('[ModelCoordinator] Preloading translator tokenizer...');
                const translatorModelId = 'Xenova/nllb-200-distilled-600M';
                await AutoTokenizer.from_pretrained(translatorModelId);
                translatorPreloaded.current = true;
                console.log('[ModelCoordinator] Translator tokenizer preloaded');

                // Precargar chatbot (Gemma) - Solo descarga, no crea sesión
                console.log('[ModelCoordinator] Preloading chatbot tokenizer...');
                const chatbotModelId = 'onnx-community/gemma-3-1b-it-ONNX-GQA';
                await AutoTokenizer.from_pretrained(chatbotModelId, {
                    // @ts-ignore
                    token: hfToken
                });
                chatbotPreloaded.current = true;
                console.log('[ModelCoordinator] Chatbot tokenizer preloaded');

                setPreloadComplete(true);
                // Activar traductor por defecto después de precargar
                setActiveModel('translator');
                console.log('[ModelCoordinator] Preload complete - Translator active by default');

                // Emitir evento para que el traductor se active
                window.dispatchEvent(new CustomEvent('model-coordinator', {
                    detail: { action: 'activate-translator' }
                }));

            } catch (error) {
                console.error('[ModelCoordinator] Preload failed:', error);
                setHasEnoughRAM(false);
                setActiveModel('none');
            }
        };

        preloadModels();
    }, [hasEnoughRAM, preloadComplete]);

    // Solicitar cambio a chatbot
    const requestSwitchToChatbot = useCallback(() => {
        if (!hasEnoughRAM) {
            console.log('[ModelCoordinator] No RAM - Using Gemini API instead');
            return;
        }

        console.log('[ModelCoordinator] Switching to chatbot...');
        setActiveModel('chatbot');

        // Primero desactivar traductor
        window.dispatchEvent(new CustomEvent('model-coordinator', {
            detail: { action: 'dispose-translator' }
        }));

        // Luego activar chatbot (con delay para permitir cleanup)
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('model-coordinator', {
                detail: { action: 'activate-chatbot' }
            }));
        }, 100);
    }, [hasEnoughRAM]);

    // Solicitar cambio a traductor
    const requestSwitchToTranslator = useCallback(() => {
        if (!hasEnoughRAM) {
            console.log('[ModelCoordinator] No RAM - No translator available');
            return;
        }

        console.log('[ModelCoordinator] Switching to translator...');
        setActiveModel('translator');

        // Primero desactivar chatbot
        window.dispatchEvent(new CustomEvent('model-coordinator', {
            detail: { action: 'dispose-chatbot' }
        }));

        // Luego activar traductor (con delay para permitir cleanup)
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('model-coordinator', {
                detail: { action: 'activate-translator' }
            }));
        }, 100);
    }, [hasEnoughRAM]);

    return (
        <ModelCoordinatorContext.Provider value={{
            hasEnoughRAM,
            activeModel,
            preloadComplete,
            requestSwitchToChatbot,
            requestSwitchToTranslator,
            ramGB
        }}>
            {children}
        </ModelCoordinatorContext.Provider>
    );
};
