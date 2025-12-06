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
  const [localModelStatus, setLocalModelStatus] = useState<string>(''); // For loading progress text

  // Refs for local model to avoid re-imports/re-loads
  const localPipelineRef = useRef<any>(null);
  const isPipelineLoadingRef = useRef(false);

  // --- Inicialización del SDK de Gemini ---
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

  // --- Initialize Local Model (Lazy -> Eager/Background) ---
  const initLocalModel = useCallback(async () => {
    if (localPipelineRef.current || isPipelineLoadingRef.current) return;

    isPipelineLoadingRef.current = true;
    setLocalModelStatus('Preparando modelo local en segundo plano...');

    try {
      // Dynamic import
      const { AutoTokenizer, AutoModelForCausalLM, env } = await import('@huggingface/transformers');

      // Configuration 
      env.allowLocalModels = false;
      env.useBrowserCache = true; // Ensures caching

      const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN;
      if (hfToken) {
        // @ts-ignore
        env.token = hfToken;
      }

      // SWITCH: Using the GQA version which is often better optimized for transformers.js
      const modelId = 'onnx-community/gemma-3-1b-it-ONNX-GQA';

      // Load tokenizer 
      const tokenizer = await AutoTokenizer.from_pretrained(modelId, {
        // @ts-ignore
        token: hfToken,
      });

      // Load model 
      // NOTE: We strictly request 'q4' to avoid downloading the full 4GB+ fp32 model which crashes 
      // the browser with OOM (3304506200 bytes error).
      const model = await AutoModelForCausalLM.from_pretrained(modelId, {
        device: 'webgpu',
        dtype: 'q4', // STRICTLY use q4
        // @ts-ignore
        token: hfToken,
        use_auth_token: hfToken,
        progress_callback: (data: any) => {
          if (data.status === 'progress') {
            const percent = Math.round(data.progress || 0);
            setLocalModelStatus(prev => `Descargando (GQA q4): ${percent}%`);
          } else if (data.status === 'done') {
            setLocalModelStatus('Modelo listo.');
          }
        }
      });

      setLocalModelStatus('Modelo local listo para usar.');

      // Wrap in a simple "pipeline-like" closure for the rest of the code to use
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

      console.log("Local model initialized successfully via background loader");
      // Don't clear status immediately so user sees "Ready" if they open chat
      setTimeout(() => setLocalModelStatus(''), 3000);

    } catch (error) {
      console.error("Failed to load local model:", error);
      setLocalModelStatus(`Error descarga segundo plano (${error}).`);
      setBackend('gemini');
    } finally {
      isPipelineLoadingRef.current = false;
    }
  }, []);

  // --- RAM Check & Context Load ---
  useEffect(() => {
    // 1. Load Context
    fetch('/api/agent-context')
      .then(response => response.json())
      .then(data => {
        if (data.systemInstruction) {
          setInitialPrompt([{ text: data.systemInstruction }]);
          console.log("Contexto del agente cargado correctamente.");
        }
      })
      .catch(error => {
        console.error('Error al cargar el contexto del agente:', error);
        fetch('/system_prompt.json')
          .then(res => res.json())
          .then(data => setInitialPrompt(data))
          .catch(err => console.error("Fallo también el fallback:", err));
      });

    // 2. Check RAM
    const checkRAM = async () => {
      // @ts-ignore - navigator.deviceMemory is experimental
      const ram = (navigator as any).deviceMemory || 0;
      console.log(`Detected RAM: ${ram} GB`);

      // USER REQUEST: Gemma 3 1B fits in ~1GB.
      if (ram >= 1) {
        setBackend('local');
        console.log("RAM >= 1GB detected. Suitable for Gemma 3 1B. Switching to Local Model.");
        // OPTIMIZATION: Start downloading immediately in background
        initLocalModel();
      } else {
        setBackend('gemini');
        console.log("Insufficient RAM (<1GB). Using Gemini API.");
      }
    };

    checkRAM();
  }, [initLocalModel]);


  // --- Efecto para ajustar altura del textarea ---
  useEffect(() => {
    const inputField = document.querySelector(`.${styles.inputField}`) as HTMLElement;
    if (inputField) {
      inputField.style.height = 'auto';
      inputField.style.height = `${Math.min(inputField.scrollHeight, 150)}px`;
    }
  }, [userInput]);

  // --- Efecto para hacer scroll al final ---
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, localModelStatus]);

  const handleOpenChat = () => setIsOpen(!isOpen);

  // --- Función para enviar mensajes ---
  const handleSendMessage = async () => {
    if (userInput.trim() === '' || isLoading) return;
    if (initialPrompt.length === 0) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Iniciando sistema... por favor espera.' }]);
      return;
    }

    const newUserMessage: Message = { role: 'user', content: userInput };
    const currentMessages = [...messages, newUserMessage];
    setMessages(currentMessages);
    setUserInput('');
    setIsLoading(true);

    // Initial placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '...' }]);

    try {
      let assistantResponse = '';
      const systemInstruction = initialPrompt[0].text;

      if (backend === 'local') {
        // --- LOCAL MODEL EXECUTION ---
        if (!localPipelineRef.current) {
          if (isPipelineLoadingRef.current) {
            throw new Error("El modelo local se está cargando, por favor espera un momento.");
          } else {
            await initLocalModel();
            if (!localPipelineRef.current) throw new Error("Modelo local no disponible.");
          }
        }

        // --- Prompt Construction for Gemma 3 ---
        const conversationHistory = currentMessages.map(m =>
          `<start_of_turn>${m.role === 'user' ? 'user' : 'model'}\n${m.content}<end_of_turn>`
        ).join('\n');

        const fullPrompt = `<start_of_turn>user\n${systemInstruction}\n\nContext:\n${conversationHistory}<end_of_turn><start_of_turn>model\n`;

        console.log("Running Local Gemma 3 1B...");
        const output = await localPipelineRef.current(fullPrompt, {
          max_new_tokens: 256,
          temperature: 0.1,
          do_sample: false,
        });

        const rawText = output[0].generated_text;
        assistantResponse = rawText.startsWith(fullPrompt) ? rawText.slice(fullPrompt.length) : rawText;
        assistantResponse = assistantResponse.replace(/<end_of_turn>$/, '').trim();

      } else {
        // --- GEMINI EXECUTION ---
        console.log("Using Gemini SDK");

        if (!geminiModel) throw new Error("No Gemini model available.");

        // History construction
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

      // Update UI with response
      setMessages(prev => {
        const updatedMessages = [...prev];
        const lastMsgIndex = updatedMessages.length - 1;
        if (updatedMessages[lastMsgIndex].content === '...') {
          updatedMessages[lastMsgIndex] = { role: 'assistant', content: assistantResponse || 'No res.' };
        } else {
          // In case of race conditions or React batching weirdness
          updatedMessages.push({ role: 'assistant', content: assistantResponse });
        }

        // Log to Redis
        fetch('/api/log-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages,
            timestamp: new Date().toISOString()
          })
        }).catch(err => console.error("Error logging chat:", err));

        return updatedMessages;
      });

    } catch (error: any) {
      console.error('Error generating response:', error);

      // Fallback message
      const errorMsg = error.message || 'Error desconocido';
      setMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg.content === '...') {
          lastMsg.content = `Error: ${errorMsg}. ${backend === 'local' ? 'Intenta recargar o usar Gemini.' : ''}`;
        }
        return updated;
      });

      // If local failed HARD, maybe switch to Gemini for next turn?
      if (backend === 'local' && (errorMsg.includes('unavailable') || errorMsg.includes('Model'))) {
        setBackend('gemini');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Renderizado ---
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
              <span className="text-[10px] text-gray-400 opacity-80" suppressHydrationWarning>
                {backend === 'local' ? '⚡ Running Locally (Gemma 3 1B)' : backend === 'gemini' ? '☁️ Powered by Gemini' : 'Checking hardware...'}
              </span>
            </div>
            <button className={`${styles.minimizeBtn} ${styles.noMargin}`} onClick={handleOpenChat}>
              <FaMinus />
            </button>
          </div>

          <div className={styles.chatMessages} ref={chatContainerRef}>
            {/* Show local loading status */}
            {backend === 'local' && localModelStatus && (
              <div className="w-full bg-gray-900/50 p-2 text-xs text-blue-300 text-center mb-2 border-b border-gray-800 flex justify-between items-center">
                <span className="flex-grow text-center">{localModelStatus}</span>
                <button
                  onClick={() => {
                    console.log("User aborted local load. Switching to Gemini.");
                    setBackend('gemini');
                    setLocalModelStatus('');
                  }}
                  className="text-gray-400 hover:text-white ml-2 p-1 focus:outline-none"
                  title="Cancelar y usar Gemini"
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
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
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
              <button className={styles.buttonSend} onClick={handleSendMessage} disabled={isLoading || (backend === 'local' && !!localModelStatus && !localPipelineRef.current)}>
                {isLoading ? '...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}