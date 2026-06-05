import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useDragControls, animate } from 'framer-motion';
import Send from 'lucide-react/dist/esm/icons/send';
import X from 'lucide-react/dist/esm/icons/x';
import CalendarIcon from 'lucide-react/dist/esm/icons/calendar';
import Minimize2 from 'lucide-react/dist/esm/icons/minimize-2';
import Maximize2 from 'lucide-react/dist/esm/icons/maximize-2';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isCalendarPicker?: boolean;
  calendarSubmitted?: boolean;
  buttons?: { name: string }[];
}

interface ConsultationResponse {
  text: string;
  hasCalendarPicker: boolean;
  buttons?: { name: string }[];
}

const STORAGE_KEY = 'ask_ted_history';

/** Send the conversation to Ted's brain (Gemini via /api/chat). */
const askTed = async (
  history: { role: 'user' | 'assistant'; content: string }[],
  type: 'text' | 'launch' = 'text'
): Promise<ConsultationResponse> => {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, type }),
    });

    let json: any;
    try {
      json = await res.json();
    } catch (e) {
      console.error('Failed to parse response', e);
      return {
        text: "I do apologize — I'm having trouble hearing you. Might you try again in a moment?",
        hasCalendarPicker: false,
      };
    }

    return {
      text: typeof json.text === 'string' ? json.text : '',
      hasCalendarPicker: Boolean(json.hasCalendarPicker),
      buttons: Array.isArray(json.buttons) ? json.buttons : undefined,
    };
  } catch (error) {
    console.error('Ask Ted fetch error:', error);
    return {
      text: "My apologies — the line went quiet. Please try that once more.",
      hasCalendarPicker: false,
    };
  }
};

export const AskTed = ({ defaultOpen = false }: { defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isFloating, setIsFloating] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse chat history', e);
        }
      }
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showInitialTooltip, setShowInitialTooltip] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasPlayedSoundRef = useRef(false);

  // Newest message sits at index 0 (we prepend).
  const latestMessage = messages.length > 0 ? messages[0] : null;
  const isInputHidden =
    latestMessage?.role === 'assistant' &&
    ((latestMessage.buttons && latestMessage.buttons.length > 0) ||
      (latestMessage.isCalendarPicker && !latestMessage.calendarSubmitted));

  // Restrict the calendar to future selections.
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const minDateTime = now.toISOString().slice(0, 16);

  // Briefly show a greeting tooltip on the bell.
  useEffect(() => {
    setShowInitialTooltip(true);
    const timer = setTimeout(() => setShowInitialTooltip(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch the opening greeting the first time the chat opens.
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const fetchGreeting = async () => {
        setIsTyping(true);
        try {
          const response = await askTed([], 'launch');
          if (response.text.trim() !== '' || response.buttons) {
            setMessages([
              {
                id: Date.now().toString(),
                role: 'assistant',
                content: response.text,
                isCalendarPicker: response.hasCalendarPicker,
                buttons: response.buttons,
              },
            ]);
          }
        } catch (error) {
          console.error('Failed to fetch greeting:', error);
        } finally {
          setIsTyping(false);
        }
      };
      fetchGreeting();
    }
  }, [isOpen, messages.length]);

  // Persist history.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Keep the view pinned to the latest message.
  useEffect(() => {
    if (messages.length > 0 && isOpen) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [messages, isOpen, isFloating]);

  // Draggable window logic.
  const dragControls = useDragControls();
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  useEffect(() => {
    if (!isFloating) {
      dragX.set(0);
      dragY.set(0);
    }
  }, [isFloating, dragX, dragY]);

  const handleDragEnd = (_event: any, info: any) => {
    if (!isFloating) return;
    const projectedY = dragY.get() + info.velocity.y * 0.1;
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const snapPoints = isMobile ? [0, -(h * 0.22), -(h * 0.46)] : [0, -200, -450];
    const closest = snapPoints.reduce((prev, curr) =>
      Math.abs(curr - projectedY) < Math.abs(prev - projectedY) ? curr : prev
    );
    animate(dragY, closest, { type: 'spring', bounce: 0.15, duration: 0.6 });
  };

  // Magnetic bell button.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
  const mouseY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.35);
    y.set((e.clientY - centerY) * 0.35);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const buildHistory = (msgs: Message[]) =>
    [...msgs].reverse().map((m) => ({ role: m.role, content: m.content }));

  const onSend = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    const next = [userMsg, ...messages];
    setMessages(next);
    setInput('');
    setIsTyping(true);

    try {
      const response = await askTed(buildHistory(next));
      if (response.text.trim() !== '' || response.hasCalendarPicker || response.buttons) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.text,
          isCalendarPicker: response.hasCalendarPicker,
          buttons: response.buttons,
        };
        setMessages((prev) => [assistantMsg, ...prev]);
      }
    } catch (error) {
      console.error('onSend error:', error);
      setMessages((prev) => [
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "My apologies — something interrupted us. Please try again.",
        },
        ...prev,
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const onCalendarSubmit = async (messageId: string, isoString: string, humanReadable: string) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, calendarSubmitted: true } : m)));

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: humanReadable };
    const next = [userMsg, ...messages.map((m) => (m.id === messageId ? { ...m, calendarSubmitted: true } : m))];
    setMessages(next);
    setIsTyping(true);

    try {
      const history = buildHistory(next);
      // Give the model the precise ISO time as context for the latest turn.
      history[history.length - 1] = {
        role: 'user',
        content: `I'd like to book a private fitting for ${humanReadable} (${isoString}).`,
      };
      const response = await askTed(history);
      if (response.text.trim() !== '' || response.hasCalendarPicker || response.buttons) {
        setMessages((prev) => [
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.text,
            isCalendarPicker: response.hasCalendarPicker,
            buttons: response.buttons,
          },
          ...prev,
        ]);
      }
    } catch (error) {
      console.error('onCalendarSubmit error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleOpen = () => {
    if (!hasPlayedSoundRef.current) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
      if (!isMobile) {
        const audio = new Audio(`/freesound_community-bell-98033.mp3?v=${Date.now()}`);
        audio.volume = 0.005;
        audio.play().catch((e) => console.error('Audio blocked:', e));
      }
      hasPlayedSoundRef.current = true;
    }
    setIsOpen(!isOpen);
  };

  const resetConversation = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <>
      {/* Trigger Bell */}
      <AnimatePresence>
        {!isOpen && (
          <div className="fixed sm:bottom-10 sm:right-10 bottom-6 right-6 z-[100]">
            <motion.div
              onMouseMove={handleMouseMove}
              onMouseLeave={() => {
                handleMouseLeave();
                setIsHovered(false);
              }}
              onMouseEnter={() => setIsHovered(true)}
              style={{ x: mouseX, y: mouseY }}
              className="relative group"
            >
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={toggleOpen}
                className="sm:w-24 sm:h-24 w-20 h-20 flex items-center justify-center relative group"
              >
                <div className="absolute inset-4 rounded-full bg-gold-300/5 blur-2xl group-hover:bg-gold-300/10 transition-colors duration-1000" />
                <motion.div
                  initial={false}
                  animate={{ backgroundColor: '#050E17', borderColor: 'rgba(212, 175, 55, 0.3)' }}
                  className="absolute inset-2 rounded-full border shadow-2xl"
                />
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full fill-none overflow-visible">
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="47"
                      stroke="#D4AF37"
                      strokeWidth="1"
                      strokeOpacity="0.5"
                      initial={false}
                      animate={{ strokeDasharray: isHovered ? '300 0' : '60 87.6' }}
                      transition={{ duration: 0.8, ease: 'easeInOut' }}
                    />
                  </svg>
                </motion.div>
                <div className="relative z-10 flex items-center justify-center">
                  <img
                    src="/concierge bell icon-2.png"
                    alt="Ask Ted"
                    className="sm:w-16 sm:h-16 w-11 h-11 object-contain opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 brightness-110"
                  />
                </div>
              </motion.button>

              <AnimatePresence mode="wait">
                {showInitialTooltip ? (
                  <motion.div
                    key="load-greeting"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: -12 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.5 }}
                    className="absolute right-full top-1/2 -translate-y-1/2 -mt-6 whitespace-nowrap px-8 py-4 border-r border-gold-300/40 pointer-events-none mr-2"
                  >
                    <div className="flex flex-col items-end justify-center h-full">
                      <span className="font-serif italic text-xl text-white leading-none">Ask Ted</span>
                      <p className="font-sans text-[10px] tracking-[0.5em] uppercase text-gold-300/60 mt-2 font-medium">
                        Personal Concierge
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="standard-tooltip"
                    initial={{ opacity: 0, x: 10 }}
                    whileHover={{ opacity: 1, x: -12 }}
                    className="absolute right-full top-1/2 -translate-y-1/2 -mt-6 whitespace-nowrap px-8 py-4 border-r border-gold-300/40 pointer-events-none mr-2"
                  >
                    <div className="flex flex-col items-end justify-center h-full">
                      <span className="font-serif italic text-xl text-white leading-none">The Silver Standard</span>
                      <p className="font-sans text-[10px] tracking-[0.5em] uppercase text-gold-300/60 mt-2 font-medium">
                        Established 1899
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            drag={isFloating ? 'y' : false}
            onDragEnd={handleDragEnd}
            dragConstraints={{
              top:
                typeof window !== 'undefined'
                  ? window.innerWidth < 640
                    ? -window.innerHeight * 0.46
                    : -450
                  : -450,
              bottom: 0,
            }}
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            style={{ transformOrigin: '100% 100%', ...(isFloating ? { x: dragX, y: dragY } : {}) }}
            initial={{ opacity: 0, x: isFloating ? 0 : '100%', scale: isFloating ? 0.9 : 1 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: isFloating ? 0 : '100%', scale: isFloating ? 0.9 : 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed z-[100] flex flex-col overflow-hidden backdrop-blur-xl bg-[#091521]/95 border-gold-300/20 shadow-2xl ${
              isFloating
                ? 'w-[90vw] sm:w-[400px] h-[60vh] sm:h-[600px] bottom-6 sm:bottom-10 left-0 right-0 mx-auto sm:left-auto sm:right-10 rounded-2xl border'
                : 'top-0 right-0 w-full sm:w-[450px] h-[100dvh] rounded-none border-l'
            }`}
          >
            {isFloating && (
              <>
                <div onPointerDown={(e) => dragControls.start(e)} style={{ touchAction: 'none' }} className="absolute top-0 left-0 right-0 h-10 z-[60] cursor-grab active:cursor-grabbing touch-none" />
                <div onPointerDown={(e) => dragControls.start(e)} style={{ touchAction: 'none' }} className="absolute bottom-0 left-0 right-0 h-6 z-[60] cursor-grab active:cursor-grabbing touch-none" />
                <div onPointerDown={(e) => dragControls.start(e)} style={{ touchAction: 'none' }} className="absolute top-0 bottom-0 left-0 w-6 z-[60] cursor-grab active:cursor-grabbing touch-none" />
                <div onPointerDown={(e) => dragControls.start(e)} style={{ touchAction: 'none' }} className="absolute top-0 bottom-0 right-0 w-6 z-[60] cursor-grab active:cursor-grabbing touch-none" />
              </>
            )}

            {/* Pinstripe backdrop */}
            <div
              className="absolute inset-0 z-0 pointer-events-none opacity-40"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(212, 175, 55, 0.025) 39px, rgba(212, 175, 55, 0.025) 40px)',
              }}
            />

            {/* Header */}
            <div className="absolute top-0 w-full text-center pt-6 pb-20 z-40 bg-gradient-to-b from-[#091521] via-[#091521]/95 via-40% to-transparent pointer-events-none">
              <span className="font-serif italic text-gold-300/90 text-[19px]">Ask Ted</span>
            </div>

            {/* Reset + Close */}
            <button
              onClick={resetConversation}
              className="absolute top-6 left-6 z-50 font-sans text-[9px] tracking-[0.25em] uppercase text-white/30 hover:text-gold-300/80 transition-colors"
            >
              New Chat
            </button>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 z-50 flex items-center justify-center p-2 rounded-full hover:bg-white/10 transition-colors group"
            >
              <X className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
            </motion.button>

            {/* Messages */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              className={`relative z-10 w-full flex-1 px-6 overflow-y-auto overscroll-contain flex flex-col scrollbar-hide pt-[110px] transition-[padding] duration-500 ${
                isInputHidden ? 'pb-12' : 'pb-4'
              }`}
              style={{
                transformOrigin: 'bottom',
                maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 98%, transparent)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 12%, black 98%, transparent)',
              }}
            >
              <div className="mt-auto" />
              <AnimatePresence initial={false} mode="popLayout">
                {[...messages].reverse().map((msg, idx, arr) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                    }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    className={`flex mb-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
                      {msg.role === 'assistant' && (
                        <div className="mt-1 flex-shrink-0">
                          <div className="w-8 h-8 rounded-full border border-gold-300/30 overflow-hidden bg-black/40">
                            <img src="/tedsilveraibot.jpg" alt="Ted" className="w-full h-full object-cover grayscale" />
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col">
                        <div
                          className={`${
                            msg.role === 'assistant'
                              ? 'font-serif font-normal text-[19px] text-white/90 leading-snug italic'
                              : 'font-sans text-[12px] tracking-[0.15em] uppercase text-gold-300/70 border-r border-gold-300/20 pr-3 leading-normal'
                          } whitespace-pre-line`}
                        >
                          {msg.role === 'assistant'
                            ? msg.content
                                .split('\n\n')
                                .filter((p) => p.trim())
                                .map((para, i, paras) => (
                                  <div key={i} className={i !== paras.length - 1 ? 'mb-3' : ''}>
                                    {para.trim()}
                                  </div>
                                ))
                            : msg.content}
                        </div>

                        {msg.role === 'assistant' && msg.buttons && msg.buttons.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {msg.buttons.map((btn, bIdx) => {
                              const isLatest = idx === arr.length - 1;
                              const disabled = !isLatest || isTyping;
                              return (
                                <button
                                  key={bIdx}
                                  disabled={disabled}
                                  onClick={() => onSend(btn.name)}
                                  className={`border rounded-[14px] py-1.5 px-3 font-sans text-[11.5px] tracking-wide transition-all duration-300 text-left ${
                                    disabled
                                      ? 'border-gold-300/10 text-white/20 bg-transparent cursor-not-allowed'
                                      : 'border-gold-300/40 text-white/90 bg-gold-900/10 hover:bg-gold-500/20 hover:border-gold-300 cursor-pointer'
                                  }`}
                                >
                                  {btn.name}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {msg.role === 'assistant' && msg.isCalendarPicker && !msg.calendarSubmitted && (
                          <div className="mt-4 flex flex-col gap-3">
                            <div className="relative w-full">
                              <input
                                type="datetime-local"
                                id={`calendar-${msg.id}`}
                                step="1800"
                                min={minDateTime}
                                className="w-full bg-black/40 border border-gold-300/30 text-white/90 rounded-md p-2 pl-3 pr-10 font-sans text-sm focus:outline-none focus:border-gold-300/60 transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full cursor-pointer"
                              />
                              <button
                                aria-label="Open Calendar"
                                onClick={() => {
                                  const inputEl = document.getElementById(`calendar-${msg.id}`) as HTMLInputElement;
                                  if (inputEl && typeof inputEl.showPicker === 'function') {
                                    try {
                                      inputEl.showPicker();
                                    } catch (e) {
                                      console.log('showPicker unsupported', e);
                                    }
                                  }
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gold-300/70 hover:text-gold-300 hover:bg-white/5 rounded-md transition-colors pointer-events-none sm:pointer-events-auto"
                              >
                                <CalendarIcon className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex flex-col gap-1 px-1 -mt-1 text-white/50">
                              <span className="text-[10px] sm:text-[11px] font-sans tracking-wide">
                                Appointments: Mon–Fri 10AM–6PM, Sat 10AM–5PM
                              </span>
                              <span className="text-[10px] sm:text-[11px] font-sans tracking-wide italic">
                                (Only book in 30-minute intervals)
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                const inputEl = document.getElementById(`calendar-${msg.id}`) as HTMLInputElement;
                                if (inputEl && inputEl.value) {
                                  const dateValue = inputEl.value;
                                  const isoString = `${dateValue}:00-05:00`;
                                  const [datePart, timePart] = dateValue.split('T');
                                  const [yyyy, mm, dd] = datePart.split('-');
                                  const [HH, min] = timePart.split(':');
                                  const dateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(HH), Number(min));

                                  const dayOfWeek = dateObj.getDay();
                                  const hour = dateObj.getHours();
                                  let isValid = true;
                                  if (dayOfWeek === 0) isValid = false;
                                  if (hour < 10) isValid = false;
                                  if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 18) isValid = false;
                                  if (dayOfWeek === 6 && hour >= 17) isValid = false;

                                  if (!isValid) {
                                    setMessages((prev) => [
                                      {
                                        id: Date.now().toString(),
                                        role: 'assistant',
                                        content:
                                          "I do apologize — that moment falls outside our hours. We're here Monday through Friday, 10 AM to 6 PM, and Saturday, 10 AM to 5 PM. What other time might suit you?",
                                      },
                                      ...prev,
                                    ]);
                                    return;
                                  }

                                  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                                  const month = monthNames[dateObj.getMonth()];
                                  const day = dateObj.getDate();
                                  let suffix = 'th';
                                  if (day === 1 || day === 21 || day === 31) suffix = 'st';
                                  else if (day === 2 || day === 22) suffix = 'nd';
                                  else if (day === 3 || day === 23) suffix = 'rd';
                                  let hours = dateObj.getHours();
                                  const ampm = hours >= 12 ? 'PM' : 'AM';
                                  hours = hours % 12;
                                  hours = hours ? hours : 12;
                                  const displayStr = `${month} ${day}${suffix} at ${hours}:${min} ${ampm}`;

                                  onCalendarSubmit(msg.id, isoString, displayStr);
                                }
                              }}
                              className="bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 border border-gold-300/30 rounded-full py-2 px-4 font-sans text-xs tracking-wider uppercase transition-colors self-start"
                            >
                              Confirm Appointment
                            </button>
                          </div>
                        )}

                        {msg.role === 'assistant' && <div className="mt-3 w-12 h-[1px] bg-gold-300/30" />}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-4 mb-4"
                >
                  <div className="w-10 flex-shrink-0 flex justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-2 h-2 rounded-full bg-gold-300 shadow-[0_0_10px_rgba(212,175,55,0.8)]"
                    />
                  </div>
                  <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-white/20">Tailoring your advice</span>
                </motion.div>
              )}
              <div ref={messagesEndRef} className="h-8 w-full shrink-0" />
            </motion.div>

            {/* Dock / Float toggle */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`absolute right-6 z-50 transition-all duration-500 ${isInputHidden ? 'bottom-8' : 'bottom-[120px]'}`}
                >
                  <button
                    onClick={() => setIsFloating(!isFloating)}
                    className="w-10 h-10 bg-black/60 border border-gold-300/30 hover:border-gold-300/60 hover:bg-gold-900/20 text-gold-300 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md transition-all duration-300 group relative"
                  >
                    {isFloating ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
                    <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-[#050E17]/90 border border-gold-300/20 text-gold-300/90 text-[10px] uppercase tracking-wider px-3 py-1.5 rounded whitespace-nowrap pointer-events-none transition-opacity">
                      {isFloating ? 'Dock to Sidebar' : 'Float Window'}
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <AnimatePresence>
              {!isInputHidden && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformOrigin: 'bottom' }}
                  className="relative z-20 w-full px-6 py-6 shrink-0 bg-[#091521]/95 border-t border-white/[0.02]"
                >
                  <div className="relative group">
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-gold-300/20 via-white/5 to-gold-300/20 rounded-full blur-sm opacity-70 group-focus-within:opacity-100 transition-opacity duration-1000" />
                    <div className="relative bg-black/80 backdrop-blur-2xl border border-white/20 rounded-full flex items-center p-1 pl-5 pr-1 transition-all duration-500 focus-within:border-gold-300/40">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSend(input)}
                        placeholder="Message Ted..."
                        className="flex-1 bg-transparent py-3 text-white/90 placeholder:text-white/40 text-[16px] focus:outline-none font-sans tracking-wide"
                      />
                      <button onClick={() => onSend(input)} disabled={!input.trim() || isTyping} className="group ml-2">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                            !input.trim() || isTyping
                              ? 'bg-white/5 opacity-30'
                              : 'bg-gold-500 hover:bg-gold-400 cursor-pointer shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                          }`}
                        >
                          <Send className={`w-4 h-4 transition-colors ${!input.trim() || isTyping ? 'text-white' : 'text-black'}`} />
                        </div>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
