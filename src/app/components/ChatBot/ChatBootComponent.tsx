"use client";
import React, { useState, useRef, useEffect } from 'react';
import { FaComment, FaMinus } from 'react-icons/fa';
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

// Interfaz para la sesión de window.ai (simplificada)
interface AiTextSession {
  prompt(input: string): Promise<string>;
  // promptStreaming is also available but not used in this basic example
}

// Extender la interfaz Window para incluir 'ai' (si usas TypeScript)
declare global {
  interface Window {
    ai?: {
      canCreateTextSession(): Promise<'readily' | 'after-download' | 'no' | string>; // El tipo exacto puede variar
      createTextSession(options?: any): Promise<AiTextSession>;
      // Otras propiedades/métodos posibles de window.ai
    };
  }
}

// --- Componente ---
export default function ChatBotComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null); // Tipado del ref
  const [initialPrompt, setInitialPrompt] = useState<InitialPromptMessage[]>([]);
  const [modelSource, setModelSource] = useState<'sdk' | 'nano'>('sdk'); // 'sdk' por defecto
  const [isLoading, setIsLoading] = useState(false); // Para indicar que está generando respuesta

  // --- Inicialización del SDK de Gemini (como lo tenías) ---
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY as string;
  let genAI: GoogleGenerativeAI | null = null;
  let model: any = null; // Tipo 'any' para flexibilidad o usar tipo específico del SDK
  try {
     if (apiKey) {
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
     } else {
        console.warn("API Key for Gemini SDK is missing.");
     }
  } catch (error) {
      console.error("Error initializing Gemini SDK:", error);
  }

  const generationConfig = {
    temperature: 0.1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 2048,
    // responseMimeType: "text/plain", // No compatible con window.ai
  };

  // --- Efecto para cargar el prompt inicial ---
  useEffect(() => {
    fetch('/system_prompt.json')
      .then(response => response.json())
      .then(data => {
        if (Array.isArray(data)) {
             setInitialPrompt(data)
        } else {
            console.error("system_prompt.json no contiene un array:", data);
            setInitialPrompt([]);
        }
      })
      .catch(error => {
        console.error('Error al cargar el prompt inicial:', error);
        setInitialPrompt([]);
      });
  }, []); // Ejecutar solo una vez al montar

  // --- Efecto para detectar window.ai ---
  useEffect(() => {
    const checkNanoAvailability = async () => {
      if (window.ai && typeof window.ai.canCreateTextSession === 'function') {
        try {
          const availability = await window.ai.canCreateTextSession();
          console.log('window.ai availability:', availability);
          // Usamos 'readily' ya que indica que está listo para usarse inmediatamente
          if (availability === 'readily') {
            setModelSource('nano');
            console.log('Using window.ai (Gemini Nano)');
          } else {
             console.log('window.ai found but not readily available, using SDK.');
             setModelSource('sdk');
          }
        } catch (error) {
          console.error('Error checking window.ai availability, using SDK:', error);
          setModelSource('sdk');
        }
      } else {
        console.log('window.ai not found, using SDK.');
        setModelSource('sdk');
      }
    };
    checkNanoAvailability();
  }, []); // Ejecutar solo una vez al montar

  // --- Efecto para ajustar altura del textarea ---
  useEffect(() => {
    const inputField = document.querySelector(`.${styles.inputField}`) as HTMLElement;
    if (inputField) {
      inputField.style.height = 'auto';
      inputField.style.height = `${Math.min(inputField.scrollHeight, 150)}px`; // Limitar altura máxima
    }
  }, [userInput]);

  // --- Efecto para hacer scroll al final ---
   useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);


  const handleOpenChat = () => setIsOpen(!isOpen);

  // --- Función para enviar mensajes ---
  const handleSendMessage = async () => {
    if (userInput.trim() === '' || isLoading) return; // Evitar envíos múltiples o vacíos
    if (initialPrompt.length === 0) {
        console.error("Prompt inicial no cargado.");
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error: El prompt inicial no se ha cargado correctamente.' }]);
        return;
    }


    const newUserMessage: Message = { role: 'user', content: userInput };
    const currentMessages = [...messages, newUserMessage]; // Guardar estado actual
    setMessages(currentMessages);
    setUserInput('');
    setIsLoading(true); // Indicar que está cargando

    // Añadir mensaje temporal de "pensando..."
    setMessages(prev => [...prev, { role: 'assistant', content: '...' }]);


    try {
      let assistantResponse = '';

      // Construir el historial de mensajes para el prompt
       const historyForPrompt = currentMessages.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
       const fullPrompt = initialPrompt.map(msg => msg.text).join('\n') + '\n' + historyForPrompt + '\nAssistant:'; // Añadir 'Assistant:' al final para guiar al modelo


      if (modelSource === 'nano' && window.ai) {
        // --- Usar window.ai (Nano) ---
        console.log("Attempting to use window.ai");
        try {
           const session = await window.ai.createTextSession(); // Podrías pasar 'generationConfig' aquí si la API lo soporta
           assistantResponse = await session.prompt(fullPrompt);
           console.log("Response from window.ai:", assistantResponse);
        } catch (nanoError) {
            console.error('Error using window.ai, falling back to SDK:', nanoError);
            // Fallback al SDK si Nano falla
            if (model) {
                const result: GenerateContentResult = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
                    generationConfig,
                    // systemInstruction: initialPrompt.map(msg => msg.text).join('\n') // Alternativa para pasar el system prompt si es compatible
                });
                assistantResponse = result.response.text();
            } else {
                 throw new Error("Gemini SDK model not available for fallback.");
            }
        }

      } else if (model) {
        // --- Usar el SDK de Gemini ---
        console.log("Using Gemini SDK");
        const result: GenerateContentResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }], // Pasar el prompt completo aquí
            generationConfig,
             // systemInstruction: initialPrompt.map(msg => msg.text).join('\n') // Alternativa para pasar el system prompt si es compatible
        });
         assistantResponse = result.response.text();
         console.log("Response from SDK:", assistantResponse);
      } else {
         throw new Error("No model available (SDK or Nano).");
      }

      // Reemplazar el mensaje "pensando..." con la respuesta real
       setMessages(prev => {
            const updatedMessages = [...prev];
            // Buscar el último mensaje del asistente (que debería ser "...")
            const lastAssistantMsgIndex = updatedMessages.findLastIndex(msg => msg.role === 'assistant');
            if (lastAssistantMsgIndex !== -1 && updatedMessages[lastAssistantMsgIndex].content === '...') {
                updatedMessages[lastAssistantMsgIndex] = { role: 'assistant', content: assistantResponse || 'No se recibió respuesta.' };
            } else {
                // Si no se encontró "..." (poco probable), añadir la respuesta al final
                updatedMessages.push({ role: 'assistant', content: assistantResponse || 'No se recibió respuesta.' });
            }
            return updatedMessages;
        });


    } catch (error) {
      console.error('Error al comunicarse con la API de Gemini:', error);
       // Reemplazar el mensaje "pensando..." con el mensaje de error
      setMessages(prev => {
            const updatedMessages = [...prev];
            const lastAssistantMsgIndex = updatedMessages.findLastIndex(msg => msg.role === 'assistant');
             if (lastAssistantMsgIndex !== -1 && updatedMessages[lastAssistantMsgIndex].content === '...') {
                updatedMessages[lastAssistantMsgIndex] = { role: 'assistant', content: 'Lo siento, hubo un error al procesar tu mensaje.' };
             } else {
                 updatedMessages.push({ role: 'assistant', content: 'Lo siento, hubo un error al procesar tu mensaje.' });
            }
            return updatedMessages;
        });
    } finally {
        setIsLoading(false); // Terminar carga
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
            <h5 className={styles.cardHeaderText}>Chat with CyberStack ({modelSource === 'nano' ? 'Nano' : 'SDK'})</h5> {/* Mostrar fuente */}
            <button className={`${styles.minimizeBtn} ${styles.noMargin}`} onClick={handleOpenChat}>
              <FaMinus />
            </button>
          </div>

          <div className={styles.chatMessages} ref={chatContainerRef}>
            {messages.map((msg, index) => (
              <div key={index} className={`${styles.message} ${msg.role === 'user' ? styles.messageUser : styles.messageAssistant}`}>
                <div className={`${styles.messageAlert} ${msg.role === 'user' ? styles.messageUserAlert : styles.messageAssistantAlert}`}>
                  <strong className={styles.messageSender}>{msg.role === 'user' ? 'Tú' : 'CyberStack'}: </strong>
                  {/* Evitar renderizar ReactMarkdown para el mensaje "..." */}
                  {msg.content === '...' ? (
                    '...'
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
             {/* Mostrar indicador de carga visualmente */}
             {isLoading && messages[messages.length - 1]?.content !== '...' && (
               <div className={`${styles.message} ${styles.messageAssistant}`}>
                 <div className={`${styles.messageAlert} ${styles.messageAssistantAlert}`}>
                   <strong className={styles.messageSender}>CyberStack: </strong>
                   ...
                 </div>
               </div>
             )}
          </div>

          <div className={styles.cardFooter}>
            <div className={styles.inputGroup}>
              <textarea
                className={styles.inputField}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                    // Enviar con Enter (sin Shift)
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault(); // Prevenir salto de línea
                        handleSendMessage();
                    }
                 }}
                placeholder="Escribe tu mensaje..."
                rows={1}
                disabled={isLoading} // Deshabilitar mientras carga
              />
              <button className={styles.buttonSend} onClick={handleSendMessage} disabled={isLoading}>
                {isLoading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}