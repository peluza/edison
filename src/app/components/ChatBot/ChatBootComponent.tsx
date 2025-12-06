"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaComment, FaMinus, FaTimes } from 'react-icons/fa';
import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai';
import styles from './ChatBotComponent.module.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Interfaces ---
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface InitialPromptMessage {
  text: string;
}

// RAM threshold for local model
const RAM_THRESHOLD_GB = 4;

// --- Browser Compatibility Check ---
interface CompatibilityResult {
  isCompatible: boolean;
  supportsWebGPU: boolean;
  supportsWASM: boolean;
  supportsSharedArrayBuffer: boolean;
  hasSufficientRAM: boolean;
  ramGB: number;
  reason?: string;
}

async function checkBrowserCompatibility(): Promise<CompatibilityResult> {
  const result: CompatibilityResult = {
    isCompatible: false,
    supportsWebGPU: false,
    supportsWASM: false,
    supportsSharedArrayBuffer: false,
    hasSufficientRAM: false,
    ramGB: 0,
  };

  // Check RAM
  // @ts-ignore
  result.ramGB = (navigator as any).deviceMemory || 0;
  result.hasSufficientRAM = result.ramGB >= RAM_THRESHOLD_GB;

  // Check SharedArrayBuffer (required for ONNX threading)
  result.supportsSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

  // Check WASM
  result.supportsWASM = typeof WebAssembly !== 'undefined';

  // Check WebGPU
  try {
    if ((navigator as any).gpu) {
      const adapter = await (navigator as any).gpu.requestAdapter();
      result.supportsWebGPU = !!adapter;
    }
  } catch {
    result.supportsWebGPU = false;
  }

  // Determine compatibility
  if (!result.hasSufficientRAM) {
    result.reason = `RAM insuficiente: ${result.ramGB}GB (mínimo ${RAM_THRESHOLD_GB}GB)`;
  } else if (!result.supportsSharedArrayBuffer) {
    result.reason = 'SharedArrayBuffer no disponible (requerido para ONNX)';
  } else if (!result.supportsWASM) {
    result.reason = 'WebAssembly no soportado';
  } else {
    result.isCompatible = true;
  }

  console.log('[ChatBot] Browser compatibility:', result);
  return result;
}

// --- Componente ---
export default function ChatBotComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [initialPrompt, setInitialPrompt] = useState<InitialPromptMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- Hybrid State ---
  const [backend, setBackend] = useState<'gemini' | 'local' | 'checking'>('checking');
  const [localModelStatus, setLocalModelStatus] = useState<string>('');
  const [compatibility, setCompatibility] = useState<CompatibilityResult | null>(null);

  // Refs for local model
  const localPipelineRef = useRef<any>(null);
  const isPipelineLoadingRef = useRef(false);
  const modelLoadAttempted = useRef(false);

  // --- Inicialización del SDK de Gemini (siempre disponible como fallback) ---
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY as string;
  let genAI: GoogleGenerativeAI | null = null;
  let geminiModel: any = null;
  try {
    if (apiKey) {
      genAI = new GoogleGenerativeAI(apiKey);
      geminiModel = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
    }
  } catch (error) {
    console.error("Error initializing Gemini SDK:", error);
  }

  const generationConfig = {
    temperature: 0.1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 2048,
  };

  // --- Initialize Local Model (Gemma) - LAZY ---
  const initLocalModel = useCallback(async () => {
    if (localPipelineRef.current || isPipelineLoadingRef.current || modelLoadAttempted.current) return;
    if (!compatibility?.isCompatible) {
      console.log('[ChatBot] Skipping local model - browser not compatible');
      setBackend('gemini');
      return;
    }

    modelLoadAttempted.current = true;
    isPipelineLoadingRef.current = true;
    setLocalModelStatus('Verificando compatibilidad...');

    try {
      const { AutoTokenizer, AutoModelForCausalLM, env } = await import('@huggingface/transformers');

      env.allowLocalModels = false;
      env.useBrowserCache = true;

      const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN;
      if (hfToken) {
        // @ts-ignore
        env.token = hfToken;
      }

      const modelId = 'onnx-community/gemma-3-1b-it-ONNX-GQA';

      setLocalModelStatus('Cargando tokenizer...');
      console.log("[ChatBot] Loading Gemma tokenizer...");
      const tokenizer = await AutoTokenizer.from_pretrained(modelId, {
        // @ts-ignore
        token: hfToken,
      });

      // Use WebGPU if available, otherwise WASM
      const device = compatibility.supportsWebGPU ? 'webgpu' : 'wasm';
      setLocalModelStatus(`Cargando modelo (${device})...`);
      console.log(`[ChatBot] Loading Gemma model with ${device}...`);

      const model = await AutoModelForCausalLM.from_pretrained(modelId, {
        device: device,
        dtype: 'q4',
        // @ts-ignore
        token: hfToken,
        progress_callback: (data: any) => {
          if (data.status === 'progress') {
            const percent = Math.round(data.progress || 0);
            setLocalModelStatus(`Descargando: ${percent}%`);
          }
        }
      });

      setLocalModelStatus('⚡ Gemma lista');

      localPipelineRef.current = async (prompt: string, options: any) => {
        const inputs = tokenizer(prompt, { return_tensors: 'pt', return_token_type_ids: false });

        const outputs = await model.generate({
          ...inputs,
          max_new_tokens: options.max_new_tokens || 256,
          temperature: options.temperature || 0.1,
          do_sample: options.do_sample || false,
        });

        const decoded = tokenizer.batch_decode(outputs as any, { skip_special_tokens: true })[0];
        return [{ generated_text: decoded }];
      };

      console.log("[ChatBot] Gemma model initialized successfully");
      setTimeout(() => setLocalModelStatus(''), 3000);

    } catch (error: any) {
      console.error("[ChatBot] Failed to load Gemma:", error);
      setLocalModelStatus('');
      setBackend('gemini');

      if (error.message?.includes('Aborted')) {
        console.warn("[ChatBot] ONNX Runtime crashed - this may be a browser/system limitation");
      }
    } finally {
      isPipelineLoadingRef.current = false;
    }
  }, [compatibility]);

  // --- Initial compatibility check ---
  useEffect(() => {
    const init = async () => {
      // Load agent context
      try {
        const response = await fetch('/api/agent-context');
        const data = await response.json();
        if (data.systemInstruction) {
          setInitialPrompt([{ text: data.systemInstruction }]);
          console.log("Contexto del agente cargado correctamente.");
        }
      } catch (error) {
        console.error('Error al cargar contexto:', error);
        try {
          const res = await fetch('/system_prompt.json');
          const data = await res.json();
          setInitialPrompt(data);
        } catch { }
      }

      // Check browser compatibility
      const compat = await checkBrowserCompatibility();
      setCompatibility(compat);

      if (compat.isCompatible) {
        setBackend('local');
        console.log("[ChatBot] Browser compatible - Preloading Gemma in background...");
        // Precargar modelo inmediatamente en background
        // El modelo estará listo cuando el usuario abra el chat
      } else {
        setBackend('gemini');
        console.log(`[ChatBot] Using Gemini API: ${compat.reason}`);
      }
    };

    init();
  }, []);

  // --- Preload model in background when compatible ---
  useEffect(() => {
    // Precargar inmediatamente si hay compatibilidad (no esperar a que abra el chat)
    if (compatibility?.isCompatible && backend === 'local' && !localPipelineRef.current && !isPipelineLoadingRef.current) {
      console.log("[ChatBot] Starting Gemma preload in background...");
      initLocalModel();
    }
  }, [compatibility, backend, initLocalModel]);

  // --- Textarea height ---
  useEffect(() => {
    const inputField = document.querySelector(`.${styles.inputField}`) as HTMLElement;
    if (inputField) {
      inputField.style.height = 'auto';
      inputField.style.height = `${Math.min(inputField.scrollHeight, 150)}px`;
    }
  }, [userInput]);

  // --- Scroll to bottom ---
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, localModelStatus]);

  const handleOpenChat = () => setIsOpen(!isOpen);

  // --- Send Message ---
  const handleSendMessage = async () => {
    if (userInput.trim() === '' || isLoading) return;
    if (initialPrompt.length === 0) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Iniciando sistema...' }]);
      return;
    }

    const newUserMessage: Message = { role: 'user', content: userInput };
    const currentMessages = [...messages, newUserMessage];
    setMessages(currentMessages);
    setUserInput('');
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '...' }]);

    try {
      let assistantResponse = '';
      const systemInstruction = initialPrompt[0].text;

      if (backend === 'local' && localPipelineRef.current) {
        // --- GEMMA LOCAL ---
        const conversationHistory = currentMessages.map(m =>
          `<start_of_turn>${m.role === 'user' ? 'user' : 'model'}\n${m.content}<end_of_turn>`
        ).join('\n');

        const fullPrompt = `<start_of_turn>user\n${systemInstruction}\n\nContext:\n${conversationHistory}<end_of_turn><start_of_turn>model\n`;

        console.log("Running Gemma local...");
        const output = await localPipelineRef.current(fullPrompt, {
          max_new_tokens: 256,
          temperature: 0.1,
          do_sample: false,
        });

        const rawText = output[0].generated_text;
        assistantResponse = rawText.startsWith(fullPrompt) ? rawText.slice(fullPrompt.length) : rawText;
        assistantResponse = assistantResponse.replace(/<end_of_turn>$/, '').trim();

      } else {
        // --- GEMINI API (fallback) ---
        console.log("Using Gemini API");
        if (!geminiModel) throw new Error("No Gemini model available.");

        const historyForPrompt = currentMessages.map(msg =>
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n');

        const result: GenerateContentResult = await geminiModel.generateContent({
          contents: [{ role: "user", parts: [{ text: historyForPrompt }] }],
          generationConfig,
          systemInstruction: systemInstruction
        });

        assistantResponse = result.response.text();
      }

      setMessages(prev => {
        const updatedMessages = [...prev];
        const lastMsgIndex = updatedMessages.length - 1;
        if (updatedMessages[lastMsgIndex].content === '...') {
          updatedMessages[lastMsgIndex] = { role: 'assistant', content: assistantResponse || 'No response.' };
        }

        fetch('/api/log-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: updatedMessages, timestamp: new Date().toISOString() })
        }).catch(err => console.error("Error logging:", err));

        return updatedMessages;
      });

    } catch (error: any) {
      console.error('Error:', error);
      setMessages(prev => {
        const updated = [...prev];
        if (updated[updated.length - 1].content === '...') {
          updated[updated.length - 1].content = `Error: ${error.message}`;
        }
        return updated;
      });

      if (backend === 'local') setBackend('gemini');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.chatBotWrapper}>
      <button className={`${styles.chatBotToggle} ${isOpen ? styles.dNone : ''}`} onClick={handleOpenChat}>
        <FaComment />
      </button>

      <div className={`${styles.chatBotContainer} ${isOpen ? styles.show : ''}`}>
        <div className={styles.cardBorder}>
          <div className={styles.cardHeader}>
            <div className="flex flex-col">
              <h5 className={styles.cardHeaderText}>Chat with CyberStack</h5>
              <span className="text-[10px] text-gray-400 opacity-80">
                {backend === 'local' ? '⚡ Gemma Local' : '☁️ Gemini API'}
              </span>
            </div>
            <button className={`${styles.minimizeBtn} ${styles.noMargin}`} onClick={handleOpenChat}>
              <FaMinus />
            </button>
          </div>

          <div className={styles.chatMessages} ref={chatContainerRef}>
            {backend === 'local' && localModelStatus && (
              <div className="w-full bg-gray-900/50 p-2 text-xs text-blue-300 text-center mb-2 border-b border-gray-800 flex justify-between items-center">
                <span className="flex-grow text-center">{localModelStatus}</span>
                <button
                  onClick={() => { setBackend('gemini'); setLocalModelStatus(''); }}
                  className="text-gray-400 hover:text-white ml-2 p-1"
                  title="Usar Gemini en su lugar"
                >
                  <FaTimes />
                </button>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className={`${styles.message} ${msg.role === 'user' ? styles.messageUser : styles.messageAssistant}`}>
                <div className={`${styles.messageAlert} ${msg.role === 'user' ? styles.messageUserAlert : styles.messageAssistantAlert}`}>
                  <strong className={styles.messageSender}>{msg.role === 'user' ? 'Tú' : 'CyberStack'}: </strong>
                  {msg.content === '...' ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.cardFooter}>
            <div className={styles.inputGroup}>
              <textarea
                className={styles.inputField}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Escribe tu mensaje..."
                rows={1}
                disabled={isLoading || (backend === 'local' && !!localModelStatus && !localPipelineRef.current)}
              />
              <button
                className={styles.buttonSend}
                onClick={handleSendMessage}
                disabled={isLoading || (backend === 'local' && !!localModelStatus && !localPipelineRef.current)}
              >
                {isLoading ? '...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}