import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  X,
  Send,
  Loader2,
  Cpu,
  ShieldCheck,
  RotateCcw,
  Minimize2,
  Wrench,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { chatWithAgent } from '../api';

const STARTER_QUESTIONS = [
  "Which keyboard is quietest for late-night typing?",
  "Compare LG Gram 16 vs ThinkPad E14 for coding",
  "Recommend the best ANC headphones under $200",
  "What is the best 4K monitor for programming under $400?"
];

// Helper to format text, sanitize raw HTML, and render clean React nodes
function renderFormattedMessage(text) {
  if (!text) return null;

  // 1. Sanitize: Replace <br> and <br/> with standard newlines, and remove rogue HTML tags
  const sanitized = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '');

  // Split into paragraphs / lines
  const lines = sanitized.split('\n');

  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-slate-200">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();

        // Skip table separator lines (e.g., |---|---| or |-----|)
        if (/^\|?[-|\s:]+\|?$/.test(line)) {
          return null;
        }

        // If line is a markdown table row (contains | pipes)
        if (line.startsWith('|') && line.endsWith('|')) {
          const cells = line
            .split('|')
            .map((c) => c.trim())
            .filter(Boolean);

          // Skip if empty or just dashes
          if (cells.length === 0 || cells.every((c) => /^[-:]+$/.test(c))) {
            return null;
          }

          // Render table cells as clean card items
          return (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 my-2 space-y-1 shadow-sm"
            >
              {cells.map((cell, cIdx) => (
                <div key={cIdx} className="text-slate-200 leading-normal">
                  {renderInlineFormatting(cell)}
                </div>
              ))}
            </div>
          );
        }

        // Headers
        if (line.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-bold text-sm text-blue-300 mt-2.5 mb-1">
              {renderInlineFormatting(line.replace('### ', ''))}
            </h4>
          );
        }
        if (line.startsWith('## ') || line.startsWith('# ')) {
          return (
            <h3 key={idx} className="font-bold text-sm text-white mt-2.5 mb-1">
              {renderInlineFormatting(line.replace(/#+\s/, ''))}
            </h3>
          );
        }

        // Bullet points (supports *, -, •)
        if (line.startsWith('* ') || line.startsWith('- ') || line.startsWith('• ')) {
          const bulletContent = line.replace(/^[\*\-•]\s+/, '');
          return (
            <div key={idx} className="flex items-start space-x-2 ml-1 my-0.5">
              <span className="text-blue-400 font-bold shrink-0 mt-0.5">•</span>
              <span className="text-slate-300">{renderInlineFormatting(bulletContent)}</span>
            </div>
          );
        }

        // Numbered lists (e.g. 1. or 2.)
        if (/^\d+\.\s/.test(line)) {
          const numberMatch = line.match(/^\d+\./)[0];
          const content = line.replace(/^\d+\.\s+/, '');
          return (
            <div key={idx} className="flex items-start space-x-2 ml-1 my-1">
              <span className="text-indigo-400 font-bold shrink-0 mt-0.5">
                {numberMatch}
              </span>
              <span className="text-slate-200">{renderInlineFormatting(content)}</span>
            </div>
          );
        }

        // Empty lines
        if (!line) {
          return <div key={idx} className="h-1" />;
        }

        // Regular paragraph line
        return <p key={idx} className="text-slate-300">{renderInlineFormatting(rawLine)}</p>;
      })}
    </div>
  );
}

// Inline parser for bold and code tags
function renderInlineFormatting(str) {
  const parts = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="bg-slate-800 px-1 py-0.5 rounded text-[11px] font-mono text-blue-300 border border-slate-700/60"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex));
  }

  return parts;
}

export default function ChatDrawer({ isOpen, onToggle }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hello! I am **IntentCart**, your autonomous AI shopping assistant.\n\nI can search our 100 verified products, run mathematical budget policy checks, and help you find the exact tech gear for your workflow. What are you looking for today?",
      tools_invoked: []
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedToolsIdx, setExpandedToolsIdx] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages, isLoading]);

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputPrompt;
    if (!query.trim() || isLoading) return;

    const userMessage = { role: 'user', content: query.trim() };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Build conversation history format expected by backend
      const historyPayload = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content
      }));

      const data = await chatWithAgent(query.trim(), historyPayload.slice(-6));

      const assistantMessage = {
        role: 'assistant',
        content: data.response || "I was unable to formulate a response.",
        tools_invoked: data.tools_invoked || []
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat Agent Error:", err);
      const errorMessage = {
        role: 'assistant',
        content: `**Notice:** Failed to reach the AI Agent.\n\nError: ${err.message || 'Server connection error'}. Ensure your backend server is running on port 8000 and GROQ_API_KEY is configured in backend/.env.`
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          "Chat reset! Ask me anything about our verified tech catalog, compare items, or test our budget guardrails.",
        tools_invoked: []
      }
    ]);
  };

  return (
    <>
      {/* Floating Action Button in Bottom Right */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-6 right-6 z-40 flex items-center space-x-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-4 py-3 rounded-2xl shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-200 transform hover:scale-[1.03] active:scale-[0.98] border border-white/10 group"
          title="Open AI Shopping Assistant"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <span className="text-xs tracking-tight">Chat with AI Agent</span>
        </button>
      )}

      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 sm:w-[440px] w-[calc(100vw-24px)] h-[620px] max-h-[85vh] z-50 flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl animate-fade-in ring-1 ring-white/10">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-xs font-bold text-white tracking-tight">
                    IntentCart AI Agent
                  </h3>
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Groq
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  <span>Autonomous ReAct Loop Active</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title="Reset conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onToggle}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title="Minimize chat"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const tools = msg.tools_invoked || [];
              const isToolsExpanded = expandedToolsIdx === idx;

              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-br-sm shadow-md shadow-blue-600/20'
                        : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-bl-sm shadow-md'
                    }`}
                  >
                    {renderFormattedMessage(msg.content)}

                    {/* Agent Tools Transparency Pill */}
                    {tools.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/60">
                        <button
                          onClick={() =>
                            setExpandedToolsIdx(isToolsExpanded ? null : idx)
                          }
                          className="flex items-center space-x-1.5 text-[10px] text-indigo-300 hover:text-indigo-200 transition font-medium"
                        >
                          <Wrench className="w-3 h-3 text-indigo-400" />
                          <span>
                            {tools.length} Autonomous Tool{tools.length > 1 ? 's' : ''} Used
                          </span>
                          {isToolsExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        {isToolsExpanded && (
                          <div className="mt-1.5 space-y-1 bg-slate-900/80 rounded-xl p-2 font-mono text-[10px] text-slate-300">
                            {tools.map((t, tIdx) => (
                              <div key={tIdx} className="flex items-baseline space-x-1">
                                <span className="text-emerald-400">⚡ {t.tool}:</span>
                                <span className="text-slate-400 truncate">
                                  {JSON.stringify(t.arguments)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start space-x-2">
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-bl-sm p-3 max-w-[80%] flex items-center space-x-2 text-xs text-slate-300">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400 shrink-0" />
                  <span>AI Agent is searching & evaluating policy...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starter Chips (Shown when few messages exist) */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2 pt-1 border-t border-slate-800/60 flex flex-wrap gap-1.5 text-[11px]">
              {STARTER_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-white transition truncate max-w-full text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputPrompt);
            }}
            className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center space-x-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask AI agent about tech, budget rules..."
              disabled={isLoading}
              className="flex-1 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition flex items-center justify-center shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
