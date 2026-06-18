'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatResponse {
  sessionId: string;
  message: string;
  state: string;
  language: 'en' | 'hi';
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SevaChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationState, setConversationState] = useState<string>('INITIAL');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Welcome message when chatbot opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        role: 'assistant',
        content: 'नमस्ते! मैं सेवा हूं, आपकी शिकायत दर्ज करने में मदद करूंगा। कृपया अपना नाम बताएं।\n\nHello! I am Seva, I will help you file your complaint. Please provide your name.',
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/seva/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          sessionId: sessionId,
          message: inputValue,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: { data: ChatResponse } = await response.json();
      
      // Update session ID
      if (data.data.sessionId) {
        setSessionId(data.data.sessionId);
      }

      // Update conversation state
      if (data.data.state) {
        setConversationState(data.data.state);
      }

      const botMessage: Message = {
        role: 'assistant',
        content: data.data.message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMessage]);

      // If state is READY, show submit button
      if (data.data.state === 'READY') {
        const confirmMessage: Message = {
          role: 'assistant',
          content: 'Ready to submit! Type "yes" to confirm or type your changes.',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, confirmMessage]);
      }

      // If state is SUBMITTED, show success and reset
      if (data.data.state === 'SUBMITTED') {
        setTimeout(() => {
          setMessages([]);
          setSessionId(null);
          setConversationState('INITIAL');
        }, 5000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'क्षमा करें, कुछ गलत हो गया। कृपया पुनः प्रयास करें।\n\nSorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  const openChat = () => {
    setIsOpen(true);
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          onClick={openChat}
          className="fixed bottom-6 left-6 h-14 w-14 rounded-full z-50 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/40 hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-105"
          aria-label="Open Seva Chatbot"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 left-6 w-96 h-[600px] z-50 flex flex-col overflow-hidden border border-white/[0.13] bg-[#020617]/95 backdrop-blur-2xl shadow-[0_40px_160px_rgba(0,0,0,0.75)]">
          {/* Header */}
          <div className="bg-linear-to-r from-emerald-600 to-teal-600 text-white p-4 flex items-center justify-between shadow-lg shadow-emerald-900/30">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center border border-white/20">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Seva Chatbot</h3>
                <p className="text-xs text-emerald-100/80">AI-powered complaint assistant</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeChat}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4 bg-[#020617]/50" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl p-3 ${
                      message.role === 'user'
                        ? 'bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/30'
                        : 'bg-white/[0.06] text-slate-200 border border-white/[0.13]'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-emerald-100/70' : 'text-zinc-500'
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-xl p-3 bg-white/[0.06] border border-white/[0.13]">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 bg-[#020617]/80 border-t border-white/[0.08]">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 bg-white/[0.06] border-white/[0.13] text-slate-200 placeholder:text-zinc-500 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-900/30"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-zinc-500 mt-2 text-center">
              State: {conversationState}
            </p>
          </div>
        </Card>
      )}
    </>
  );
}
