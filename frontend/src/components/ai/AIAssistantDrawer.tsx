import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Sparkles, X, Send, Trash2, Copy, Volume2, 
  Mic, MicOff, Star, HelpCircle, FileText, Download 
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { toast } from '../common/Toast';

interface Message {
  sender: 'user' | 'ai';
  message_text: string;
  created_at: string;
}

interface Favorite {
  id: number;
  prompt_text: string;
}

export const AIAssistantDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);

  // Speech integration states
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('/api/ai/conversations');
      if (res.data.length > 0) {
        // Load the most recent session
        const latest = res.data[0];
        setConversationId(latest.id);
        setMessages(latest.messages);
      } else {
        // Welcoming message
        setMessages([
          {
            sender: 'ai',
            message_text: "Hello!\n\nI'm your Smart Invoice Validation Assistant.\n\nI can help explain invoice validation results, identify duplicate invoices, analyze VAT calculations, and suggest corrections. Ask me anything!",
            created_at: new Date().toISOString()
          }
        ]);
      }
      
      const resFavs = await axios.get('/api/ai/favorites');
      setFavorites(resFavs.data);
    } catch (err) {
      // offline fallback
      setMessages([
        {
          sender: 'ai',
          message_text: "Welcome! Sandbox Mode active. I can help explain invoice mathematical parameters. Ask me why an invoice failed or about VAT rules!",
          created_at: new Date().toISOString()
        }
      ]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Voice recognition setup (Web Speech API)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      
      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setInputText(text);
      };
      
      recognitionRef.current = rec;
    }
  }, []);

  const handleMicToggle = () => {
    if (!recognitionRef.current) {
      toast('warning', 'Notice', 'Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const speakText = (text: string) => {
    // Strip markdown formatting for cleaner speech synthesis
    const cleanText = text.replace(/[*#`$_]/g, '');
    const synth = window.speechSynthesis;
    if (synth) {
      // Cancel ongoing speech
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      synth.speak(utterance);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    // Add user message to UI immediately
    const userMsg: Message = {
      sender: 'user',
      message_text: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await axios.post('/api/ai/ask', {
        prompt: text,
        conversation_id: conversationId || undefined
      });
      
      setConversationId(res.data.conversation_id);
      
      // Add AI response
      const aiMsg: Message = {
        sender: 'ai',
        message_text: res.data.message,
        created_at: res.data.timestamp
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      // Offline fallback
      let mockReply = "I failed to query the backend database settings. Let me check the connection parameters.";
      if (text.toLowerCase().includes("vat")) {
        mockReply = "Standard VAT recalculation is computed using: `Expected VAT = Subtotal * 0.15`. If the invoice amount lists a different value, validation fails.";
      } else if (text.toLowerCase().includes("fail")) {
        mockReply = "Invoices usually fail validation checks due to arithmetic variances between subtotal and grand total, or missing registration numbers.";
      }
      
      setMessages(prev => [...prev, {
        sender: 'ai',
        message_text: mockReply,
        created_at: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await axios.post('/api/ai/conversations/clear');
      setConversationId(null);
      setMessages([
        {
          sender: 'ai',
          message_text: "Conversation cleared. How can I assist you with your tax invoice validation tasks?",
          created_at: new Date().toISOString()
        }
      ]);
      toast('success', 'Chat Cleared', 'Message history log deleted.');
    } catch (err) {
      toast('danger', 'Error', 'Failed to clear chat history.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast('success', 'Copied', 'AI response text copied to clipboard.');
  };

  const defaultSuggestions = [
    { title: "Why did this invoice fail?", text: "Why did the last invoice fail validation?" },
    { title: "Explain the VAT math", text: "Explain the VAT calculations formula." },
    { title: "Show duplicate uploads", text: "Show duplicate invoices in database." }
  ];

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-tr from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600 text-white p-3.5 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 group active:scale-95"
        title="Open AI Financial Assistant"
      >
        <Sparkles size={20} className="group-hover:animate-pulse" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out font-sans text-xs font-semibold pl-0 group-hover:pl-2 whitespace-nowrap">
          AI Copilot
        </span>
      </button>

      {/* Sliding Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between border-l dark:border-slate-800 animate-slide-in font-sans">
            
            {/* Header */}
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950/20 border-b dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-850 dark:text-slate-200">AI Financial Assistant</h3>
                  <Badge variant="success" className="text-[8px] uppercase tracking-wider">Copilot Active</Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleClearChat} className="text-slate-400 hover:text-danger" title="Clear Conversations Logs">
                  <Trash2 size={15} />
                </button>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>
            </div>

            {/* Chat Body messages logs */}
            <div className="flex-grow overflow-y-auto p-5 space-y-4 bg-slate-50/20 dark:bg-slate-950/5">
              
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm relative group ${
                    m.sender === 'user'
                      ? 'bg-primary text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-900 border dark:border-slate-850 text-slate-700 dark:text-slate-300 rounded-bl-none'
                  }`}>
                    
                    {/* Message text */}
                    <div className="text-xs leading-relaxed whitespace-pre-line font-medium">
                      {m.message_text}
                    </div>
                    
                    {/* Footer tags */}
                    <div className="flex items-center justify-between gap-4 mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-850 text-[8px] text-slate-400 font-semibold font-sans">
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      
                      {m.sender === 'ai' && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => copyToClipboard(m.message_text)} className="hover:text-primary" title="Copy Response"><Copy size={10} /></button>
                          <button onClick={() => speakText(m.message_text)} className="hover:text-primary" title="Read Aloud"><Volume2 size={10} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Dot Simulator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-900 border dark:border-slate-850 rounded-2xl rounded-bl-none p-4 shadow-sm">
                    <div className="flex gap-1 items-center py-1">
                      <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Suggested prompts chips layout */}
            {messages.length < 3 && (
              <div className="p-4 border-t dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/10 space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Suggested Questions</span>
                <div className="flex flex-wrap gap-2">
                  {defaultSuggestions.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(sug.text)}
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border dark:border-slate-850 hover:border-primary dark:hover:border-primary rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors text-left"
                    >
                      {sug.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-4 border-t dark:border-slate-850 flex items-center gap-2.5 bg-white dark:bg-slate-900">
              <button
                onClick={handleMicToggle}
                className={`p-2 rounded-lg border transition-colors ${
                  isListening 
                    ? 'border-danger bg-danger/10 text-danger' 
                    : 'border-slate-200 dark:border-slate-850 text-slate-400 hover:text-slate-600'
                }`}
                title={isListening ? "Listening..." : "Speech input"}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              
              <input
                type="text"
                placeholder="Ask AI Copilot..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(inputText)}
                className="flex-grow px-3 py-2 text-xs border border-slate-200 dark:border-slate-850 bg-white/50 dark:bg-slate-950/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-slate-100"
              />
              
              <Button
                size="sm"
                onClick={() => handleSend(inputText)}
                disabled={!inputText.trim()}
                className="p-2 rounded-lg bg-primary text-white flex items-center justify-center"
              >
                <Send size={14} />
              </Button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
export default AIAssistantDrawer;
