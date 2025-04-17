"use client";
import React, { useState, useRef, useEffect } from 'react';
import { FaComment, FaMinus } from 'react-icons/fa';
import { GoogleGenerativeAI } from '@google/generative-ai';
import styles from './ChatBotComponent.module.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface InitialPromptMessage {
  text: string;
}

export default function ChatBotComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const chatContainerRef = useRef(null);
  const [initialPrompt, setInitialPrompt] = useState<InitialPromptMessage[]>([]);

  // Inicializar genAI fuera del componente principal
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY as string;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
  const generationConfig = {
    temperature: 0.1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 2048,
    responseMimeType: "text/plain",
  };

  useEffect(() => {
    // Cargar el prompt inicial desde el archivo .json
    fetch('/system_prompt.json')
      .then(response => response.json())
      .then(setInitialPrompt)
      .catch(error => {
        console.error('Error al cargar el prompt inicial:', error);
        setInitialPrompt([]);
      });
  }, [messages]);

  useEffect(() => {
    const inputField = document.querySelector(`.${styles.inputField}`) as HTMLElement;
    if (inputField) {
      inputField.style.height = 'auto';
      inputField.style.height = `${inputField.scrollHeight}px`;
    }
  }, [userInput]);

  const handleOpenChat = () => setIsOpen(!isOpen);

  const handleSendMessage = async () => {
    if (userInput.trim() === '' || !initialPrompt) return;

    const newUserMessage: Message = { role: 'user', content: userInput };
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);
    setUserInput('');

    try {
      const fullPrompt = initialPrompt.map(msg => msg.text).join('\n') + '\n' +
        newMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig,
      });

      setMessages(prev => [...prev, { role: 'assistant', content: result.response.text() }]);
    } catch (error) {
      console.error('Error al comunicarse con la API de Gemini:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error al procesar tu mensaje.' }]);
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
            <h5 className={styles.cardHeaderText}>Chat with CyberStack</h5>
            <button className={`${styles.minimizeBtn} ${styles.noMargin}`} onClick={handleOpenChat}>
              <FaMinus />
            </button>
          </div>

          <div className={styles.chatMessages} ref={chatContainerRef}>
            {messages.map((msg, index) => (
              <div key={index} className={`${styles.message} ${msg.role === 'user' ? styles.messageUser : styles.messageAssistant}`}>
                <div className={`${styles.messageAlert} ${msg.role === 'user' ? styles.messageUserAlert : styles.messageAssistantAlert}`}>
                  <strong className={styles.messageSender}>{msg.role === 'user' ? 'User' : 'CyberStack'}: </strong>
                  <ReactMarkdown remarkPlugins={[remarkGfm as any]}>
                    {msg.content}
                  </ReactMarkdown>
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
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Escribe tu mensaje..."
                rows={1}
              />
              <button className={styles.buttonSend} onClick={handleSendMessage}>Enviar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
