'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Share2 } from 'lucide-react';
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
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<{ latitude: number; longitude: number; locality?: string } | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userCoordinatesRef = useRef<{ latitude: number; longitude: number; locality?: string } | null>(null);

  // Update ref whenever userCoordinates changes
  useEffect(() => {
    userCoordinatesRef.current = userCoordinates;
  }, [userCoordinates]);

  // Reverse geocode using Mappls API
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_MAPPLS_API_KEY;
      
      if (!apiKey) {
        console.error('❌ MAPPLS API key not configured');
        return 'Location coordinates captured';
      }
      
      const response = await fetch(
        `https://apis.mappls.com/advancedmaps/v1/${apiKey}/rev_geocode?lat=${lat}&lng=${lng}`
      );
      
      if (!response.ok) {
        console.warn('⚠️ Reverse geocode failed:', response.status);
        return `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
      
      const data = await response.json();
      const result = data?.results?.[0];
      
      if (result) {
        // Build detailed locality string
        const parts = [
          result.subSubLocality,
          result.subLocality,
          result.locality,
          result.subDistrict,
          result.district,
          result.city,
          result.state,
          result.pincode
        ].filter(Boolean);
        
        if (parts.length > 0) {
          const locality = parts.join(', ');
          console.log('✅ Reverse geocoded:', locality);
          return locality;
        }
      }
      
      console.warn('⚠️ No address components found');
      return `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('❌ Reverse geocode error:', error);
      return `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  // Get user's location when chatbot opens
  useEffect(() => {
    if (isOpen && !locationRequested) {
      setLocationRequested(true);
      
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            
            console.log('📍 Location captured:', latitude, longitude);
            
            // Get locality from reverse geocoding
            const locality = await reverseGeocode(latitude, longitude);
            console.log('📌 Locality:', locality);
            
            setUserCoordinates({
              latitude,
              longitude,
              locality,
            });
          },
          (error) => {
            console.warn('⚠️ Geolocation denied:', error.message);
            // Don't show error immediately - let user try to send message first
            // Error will be shown when they try to submit
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000, // 5 minutes
          }
        );
      } else {
        console.warn('⚠️ Geolocation not supported by browser');
        // Don't show error immediately - let user try to send message first
      }
    }
  }, [isOpen, locationRequested]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        role: 'assistant',
        content:
          'नमस्ते! मैं सेवा हूं, आपकी शिकायत दर्ज करने में मदद करूंगा। कृपया अपनी समस्या एक वाक्य में बताएं।\n\nउदाहरण: हमारे area में बिजली नहीं आ रही है\n\nHello! I am Seva, I will help you file your complaint. Please describe your problem in one sentence.\n\nExample: There is no electricity in our area',
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  const shareOnWhatsApp = () => {
    if (!trackingId) return;
    
    const text = `शिकायत दर्ज हो गई ✅\n\nट्रैकिंग ID: ${trackingId}\n\nस्थिति देखें:\n${window.location.origin}/track/${trackingId}`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const sendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    
    // Check if location is available - if still loading, wait a bit
    if (!userCoordinates) {
      const waitingMessage: Message = {
        role: 'assistant',
        content:
          '⏳ कृपया प्रतीक्षा करें, स्थान प्राप्त हो रहा है...\n\n⏳ Please wait, fetching your location...',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, waitingMessage]);
      
      // Wait up to 5 seconds for location (using ref to avoid TypeScript issues)
      for (let attempts = 0; attempts < 10; attempts++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        // Check ref which always has current value
        if (userCoordinatesRef.current?.locality) {
          break;
        }
      }
      
      // If still no location after waiting
      if (!userCoordinatesRef.current?.locality) {
        const errorMessage: Message = {
          role: 'assistant',
          content:
            '⚠️ स्थान प्राप्त नहीं हो सका। कृपया स्थान की अनुमति दें और पुनः प्रयास करें।\n\n⚠️ Unable to get location. Please allow location access and try again.',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }
    }

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
          coordinates: userCoordinates, // Include coordinates in every message
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
      if (data.trackingId) setTrackingId(data.trackingId);

      const botMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMessage]);

      if (data.state === 'SUBMITTED') {
        // Don't auto-close, let user share on WhatsApp
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

  const resetChat = () => {
    setMessages([]);
    setSessionId(null);
    setTrackingId(null);
    setLocationRequested(false);
    setUserCoordinates(null);
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

              {/* WhatsApp Share Button (after submission) */}
              {trackingId && (
                <div className="flex justify-center">
                  <div className="bg-white/[0.07] border border-white/[0.1] rounded-2xl p-4 max-w-[85%] backdrop-blur-sm">
                    <p className="text-slate-300 text-xs mb-3 text-center">
                      💾 ट्रैकिंग ID को save करें:
                    </p>
                    <button
                      onClick={shareOnWhatsApp}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20BA5A] text-white text-sm font-medium rounded-xl transition-colors mb-2"
                    >
                      <Share2 size={16} />
                      WhatsApp पर भेजें
                    </button>
                    <button
                      onClick={resetChat}
                      className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-300 text-xs rounded-lg transition-colors"
                    >
                      नई शिकायत दर्ज करें
                    </button>
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
                  placeholder={userCoordinates ? "Type your message…" : "Getting location... you can start typing"}
                  disabled={isLoading || !!trackingId}
                  className="flex-1 h-10 bg-white/[0.06] border-white/[0.12] text-slate-200 placeholder:text-zinc-500 focus-visible:border-emerald-500/40 focus-visible:ring-emerald-500/20 backdrop-blur-sm"
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !inputValue.trim() || !!trackingId}
                  size="icon"
                  className="h-10 w-10 shrink-0 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-900/30 border border-emerald-400/20"
                  title={!userCoordinates ? "Waiting for location..." : "Send message"}
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
