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



// --- Componente ---
export default function ChatBotComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null); // Tipado del ref
  const [initialPrompt, setInitialPrompt] = useState<InitialPromptMessage[]>([]);

  const [isLoading, setIsLoading] = useState(false); // Para indicar que está generando respuesta

  // --- Inicialización del SDK de Gemini (como lo tenías) ---
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY as string;
  let genAI: GoogleGenerativeAI | null = null;
  let model: any = null; // Tipo 'any' para flexibilidad o usar tipo específico del SDK
  try {
    if (apiKey) {
      genAI = new GoogleGenerativeAI(apiKey);
      model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
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
    // MODIFICADO: Fetch del nuevo endpoint de contexto
    fetch('/api/agent-context')
      .then(response => response.json())
      .then(data => {
        if (data.systemInstruction) {
          // Guardamos la instrucción como un mensaje de sistema "falso" o en un estado separado
          // Para compatibilidad con la estructura anterior, lo guardamos como un array de un solo elemento
          setInitialPrompt([{ text: data.systemInstruction }]);
          console.log("Contexto del agente cargado correctamente.");
        } else {
          console.error("La respuesta de /api/agent-context no tiene systemInstruction:", data);
        }
      })
      .catch(error => {
        console.error('Error al cargar el contexto del agente:', error);
        // Fallback al archivo estático antiguo si falla la API
        fetch('/system_prompt.json')
          .then(res => res.json())
          .then(data => setInitialPrompt(data))
          .catch(err => console.error("Fallo también el fallback:", err));
      });
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
      setMessages(prev => [...prev, { role: 'assistant', content: 'Iniciando sistema... por favor espera.' }]);
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
      // NOTA: Con la nueva instrucción de sistema, ya no necesitamos concatenar todo en el prompt del usuario
      // si usamos la propiedad systemInstruction del modelo, pero para mantener compatibilidad y asegurar
      // que el contexto esté presente, lo pasamos explícitamente.

      const historyForPrompt = currentMessages.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');

      // El initialPrompt[0].text ahora contiene TODA la instrucción con el contexto inyectado
      const systemInstruction = initialPrompt[0].text;

      if (model) {
        // --- Usar el SDK de Gemini ---
        console.log("Using Gemini SDK with Enhanced Context");

        const result: GenerateContentResult = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: historyForPrompt }] }],
          generationConfig,
          systemInstruction: systemInstruction // Usamos la propiedad nativa de systemInstruction
        });

        assistantResponse = result.response.text();
        console.log("Response from SDK:", assistantResponse);
      } else {
        throw new Error("No model available (SDK).");
      }

      // Reemplazar el mensaje "pensando..." con la respuesta real
      setMessages(prev => {
        const updatedMessages = [...prev];
        const lastAssistantMsgIndex = updatedMessages.findLastIndex(msg => msg.role === 'assistant');
        let finalMessages = updatedMessages;
        if (lastAssistantMsgIndex !== -1 && updatedMessages[lastAssistantMsgIndex].content === '...') {
          updatedMessages[lastAssistantMsgIndex] = { role: 'assistant', content: assistantResponse || 'No se recibió respuesta.' };
          finalMessages = updatedMessages;
        } else {
          finalMessages = [...updatedMessages, { role: 'assistant', content: assistantResponse || 'No se recibió respuesta.' }];
          // Return valid React state update, but we need finalMessages for logging
          // React state updates are scheduled, so we can't trust 'messages' immediately.
          // However, we are inside a callback where we know the prev structure.
        }

        // --- LOGGING TO REDIS ---
        fetch('/api/log-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: finalMessages,
            timestamp: new Date().toISOString()
          })
        }).catch(err => console.error("Error logging chat:", err));

        return finalMessages;
      });


    } catch (error) {
      console.error('Error al comunicarse con la API de Gemini:', error);
      // Reemplazar el mensaje "pensando..." con el mensaje de error
      setMessages(prev => {
        const updatedMessages = [...prev];
        const lastAssistantMsgIndex = updatedMessages.findLastIndex(msg => msg.role === 'assistant');
        if (lastAssistantMsgIndex !== -1 && updatedMessages[lastAssistantMsgIndex].content === '...') {
          updatedMessages[lastAssistantMsgIndex] = { role: 'assistant', content: 'Lo siento, hubo un error técnico. Intenta de nuevo más tarde.' };
        } else {
          updatedMessages.push({ role: 'assistant', content: 'Lo siento, hubo un error técnico.' });
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
            <h5 className={styles.cardHeaderText}>Chat with CyberStack</h5>
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