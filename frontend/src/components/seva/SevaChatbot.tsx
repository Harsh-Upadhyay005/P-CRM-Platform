'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  trackingId?: string;
}

export default function SevaChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        role: 'assistant',
        content:
          'नमस्ते! मैं सेवा हूं, आपकी शिकायत दर्ज करने में मदद करूंगा। कृपया अपना नाम बताएं।\n\nHello! I am Seva, I will help you file your complaint. Please provide your name.',
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/seva/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          message: trimmed,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const errMsg =
          payload?.message ||
          payload?.errors?.[0] ||
          `Request failed (${response.status})`;
        throw new Error(errMsg);
      }

      const data = payload?.data as ChatResponse | undefined;
      if (!data?.message) {
        throw new Error('Invalid response from server');
      }

      if (data.sessionId) setSessionId(data.sessionId);

      const botMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMessage]);

      if (data.state === 'SUBMITTED') {
        setTimeout(() => {
          setMessages([]);
          setSessionId(null);
        }, 8000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content:
          'क्षमा करें, कुछ गलत हो गया। कृपया पुनः प्रयास करें।\n\nSorry, something went wrong. Please try again.',
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

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 h-14 w-14 rounded-full z-50 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/40 hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-105 border border-white/10 backdrop-blur-sm"
          aria-label="Open Seva Chatbot"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 w-[min(100vw-2rem,24rem)] h-[min(100vh-6rem,600px)]">
          {/* Ambient glow */}
          <div className="absolute -inset-1 rounded-3xl bg-linear-to-br from-emerald-500/20 via-teal-500/10 to-transparent blur-xl pointer-events-none" />

          <div className="relative flex flex-col h-full rounded-2xl overflow-hidden border border-white/[0.12] bg-[#020617]/40 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_40px_160px_rgba(0,0,0,0.75)]">
            {/* Header */}
            <div className="shrink-0 bg-linear-to-r from-emerald-600/90 to-teal-600/90 backdrop-blur-md text-white px-4 py-3 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center border border-white/20 backdrop-blur-sm">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] leading-tight">Seva</h3>
                  <p className="text-[11px] text-emerald-100/75">Complaint assistant</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/15 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Scrollable messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 scroll-smooth"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(100,116,139,0.5) transparent' }}
            >
              {messages.map((message, index) => (
                <div
                  key={`${message.timestamp}-${index}`}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                      message.role === 'user'
                        ? 'bg-linear-to-r from-emerald-600/90 to-teal-600/90 text-white shadow-md shadow-emerald-900/25 border border-emerald-400/20'
                        : 'bg-white/[0.07] text-slate-200 border border-white/[0.1] backdrop-blur-sm'
                    }`}
                  >
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-[10px] mt-1.5 ${
                        message.role === 'user' ? 'text-emerald-100/60' : 'text-zinc-500'
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
                  <div className="rounded-2xl px-3.5 py-2.5 bg-white/[0.07] border border-white/[0.1] backdrop-blur-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 p-3 border-t border-white/[0.08] bg-[#020617]/60 backdrop-blur-md">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message…"
                  disabled={isLoading}
                  className="flex-1 h-10 bg-white/[0.06] border-white/[0.12] text-slate-200 placeholder:text-zinc-500 focus-visible:border-emerald-500/40 focus-visible:ring-emerald-500/20 backdrop-blur-sm"
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  size="icon"
                  className="h-10 w-10 shrink-0 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-900/30 border border-emerald-400/20"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
