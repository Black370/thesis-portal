import { useState, useRef, useEffect, useId } from 'react';
import { apiFetch } from './api';

const QUICK_PROMPTS = {
    guest: [
        'System overview',
        'How do I test as a Student or Professor?',
        'What can professors do?'
    ],
    admin: [
        'System overview',
        'How do I create a Student or Professor account?',
        'How do I edit or delete accounts?'
    ],
    professor: [
        'System overview',
        'What does archiving a topic do?',
        'How do I approve thesis choices?'
    ],
    student: [
        'System overview',
        'How do I join a class?',
        'Why is registration locked?'
    ]
};

const ALL_SUGGESTIONS = [
    'System overview',
    'How do I test as a Student or Professor?',
    'What is the demo admin login?',
    'What can students do?',
    'What can professors do?',
    'What can admins do?',
    'How do I join a class?',
    'How do I pick a thesis topic?',
    'Why is registration locked?',
    'What if my topic gets archived?',
    'How do I withdraw my registration?',
    'How do I create or edit a class?',
    'What does archiving a topic do?',
    'How do I approve student access requests?',
    'How do I approve or deny thesis choices?',
    'How do I create a Student or Professor account?',
    'How do I edit or delete accounts?',
    'What happens if I change a professor to a student?'
];

function renderGoogleSuggestion(suggestion, query) {
    const q = query.trim();
    if (!q) return suggestion;

    const lower = suggestion.toLowerCase();
    const idx = lower.indexOf(q.toLowerCase());
    if (idx === -1) return suggestion;

    // Google style: typed text is normal weight, suggested completion is bold
    const before = suggestion.slice(0, idx);
    const matched = suggestion.slice(idx, idx + q.length);
    const after = suggestion.slice(idx + q.length);

    return (
        <>
            {before && <strong>{before}</strong>}
            <span>{matched}</span>
            {after && <strong>{after}</strong>}
        </>
    );
}

function getInitialMessages(currentUser) {
    if (!currentUser) {
        return [
            {
                id: 'welcome-intro',
                role: 'model',
                isWelcome: true,
                text: [
                    '### Welcome to the Graduation Thesis Portal (Tester Version)',
                    'Hi there! I am your friendly portal guide. This system helps manage graduation theses across three roles:',
                    '',
                    '- **Students** browse classes, request access, register for a thesis topic, and track approval status or faculty feedback.',
                    '- **Professors** create classes, publish or archive thesis topics, and approve or deny student requests.',
                    '- **Admins** create, search, edit, and manage user accounts.'
                ].join('\n')
            },
            {
                id: 'welcome-demo-account',
                role: 'model',
                isWelcome: true,
                text: [
                    '### Try It Out with the Tester Admin Account',
                    'Sign in on the login box to test around:',
                    '',
                    '- **Username:** `admin`',
                    '- **Password:** `123`',
                    '',
                    'From the Admin Dashboard, you can also create test **Professor** and **Student** accounts to explore every role. Say **overview** or ask me what any feature does!'
                ].join('\n')
            }
        ];
    }

    const displayName = currentUser.role === 'admin'
        ? 'Admin'
        : (currentUser.name || currentUser.username);

    return [
        {
            id: 'welcome-user',
            role: 'model',
            isWelcome: true,
            text: `Hi ${displayName}! Welcome to the **Tester Version**. Ask me what any feature on your **${currentUser.role}** dashboard does, or say **overview** for a quick rundown.`
        }
    ];
}

function AssistantAvatar({ size = 48, isThinking = false, className = '' }) {
    const uid = useId();
    const bgId = `${uid}-bg`;
    const capId = `${uid}-cap`;

    return (
        <span
            className={`ai-avatar-wrap ${isThinking ? 'ai-avatar-thinking' : ''} ${className}`}
            style={{ width: size, height: size }}
            aria-hidden="true"
        >
            <svg viewBox="0 0 64 64" width={size} height={size} className="ai-avatar-svg">
                <defs>
                    <linearGradient id={bgId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#c42222" />
                        <stop offset="100%" stopColor="#B31B1B" />
                    </linearGradient>
                    <linearGradient id={capId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2c3e50" />
                        <stop offset="100%" stopColor="#16202a" />
                    </linearGradient>
                </defs>

                {/* Circular backdrop */}
                <circle cx="32" cy="32" r="32" fill={`url(#${bgId})`} />
                <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />

                {/* Subtle sparkle */}
                <path
                    d="M52 14 L53.4 17.6 L57 19 L53.4 20.4 L52 24 L50.6 20.4 L47 19 L50.6 17.6 Z"
                    fill="#f8c471"
                    className="ai-avatar-sparkle"
                />

                {/* Shoulders */}
                <path d="M16 58 C18 47 46 47 48 58" fill="#ffffff" opacity="0.92" />
                <path d="M27 49 L32 54 L37 49" fill="none" stroke="#B31B1B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

                {/* Friendly robot/guide head */}
                <rect x="17" y="22" width="30" height="25" rx="12" fill="#ffffff" />
                <rect x="20" y="26" width="24" height="17" rx="8.5" fill="#fff5f5" />

                {/* Rosy cheeks */}
                <circle cx="22.5" cy="36.5" r="2.2" fill="#f5b7b1" opacity="0.85" />
                <circle cx="41.5" cy="36.5" r="2.2" fill="#f5b7b1" opacity="0.85" />

                {/* Blinking eyes */}
                <g className="ai-avatar-eyes">
                    <circle cx="26.5" cy="33" r="2.6" fill="#2c3e50" />
                    <circle cx="37.5" cy="33" r="2.6" fill="#2c3e50" />
                    <circle cx="27.4" cy="32.1" r="0.9" fill="#ffffff" />
                    <circle cx="38.4" cy="32.1" r="0.9" fill="#ffffff" />
                </g>

                {/* Warm smile */}
                <path
                    d="M28 38.2 Q32 41.8 36 38.2"
                    fill="none"
                    stroke="#B31B1B"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                />

                {/* Graduation cap (mortarboard) */}
                <polygon points="32,8 50,15.5 32,22.5 14,15.5" fill={`url(#${capId})`} />
                <path d="M22 18.5 L22 23 C22 25.2 42 25.2 42 23 L42 18.5" fill="#1d2a36" />

                {/* Gold tassel */}
                <g className="ai-avatar-tassel">
                    <path d="M32 15.5 L45 19 L45 27" fill="none" stroke="#f5b041" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="45" cy="28" r="2.2" fill="#f5b041" />
                </g>
            </svg>
        </span>
    );
}

function renderInline(text) {
    const nodes = [];
    const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }
        if (match[2] !== undefined) {
            nodes.push(<strong key={`b-${match.index}`}>{match[2]}</strong>);
        } else if (match[3] !== undefined) {
            nodes.push(<em key={`i-${match.index}`}>{match[3]}</em>);
        } else if (match[4] !== undefined) {
            nodes.push(<code key={`c-${match.index}`} className="ai-inline-code">{match[4]}</code>);
        }
        lastIndex = pattern.lastIndex;
    }

    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    return nodes;
}

function FormattedMessage({ text }) {
    const lines = text.split(/\r?\n/);
    const blocks = [];
    let currentList = null;

    const flushList = () => {
        if (currentList) {
            blocks.push(currentList);
            currentList = null;
        }
    };

    lines.forEach((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) {
            flushList();
            return;
        }

        const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
        if (headingMatch) {
            flushList();
            blocks.push({ type: 'heading', key: `h-${idx}`, content: headingMatch[1] });
            return;
        }

        const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
        if (bulletMatch) {
            if (!currentList || currentList.type !== 'ul') {
                flushList();
                currentList = { type: 'ul', key: `ul-${idx}`, items: [] };
            }
            currentList.items.push({ key: `li-${idx}`, content: bulletMatch[1] });
            return;
        }

        const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);
        if (orderedMatch) {
            if (!currentList || currentList.type !== 'ol') {
                flushList();
                currentList = { type: 'ol', key: `ol-${idx}`, items: [] };
            }
            currentList.items.push({ key: `oli-${idx}`, content: orderedMatch[1] });
            return;
        }

        flushList();
        blocks.push({ type: 'p', key: `p-${idx}`, content: line });
    });

    flushList();

    return (
        <div className="ai-formatted">
            {blocks.map(block => {
                if (block.type === 'heading') {
                    return <div key={block.key} className="ai-md-heading">{renderInline(block.content)}</div>;
                }
                if (block.type === 'ul') {
                    return (
                        <ul key={block.key} className="ai-md-list">
                            {block.items.map(item => (
                                <li key={item.key}>{renderInline(item.content)}</li>
                            ))}
                        </ul>
                    );
                }
                if (block.type === 'ol') {
                    return (
                        <ol key={block.key} className="ai-md-list">
                            {block.items.map(item => (
                                <li key={item.key}>{renderInline(item.content)}</li>
                            ))}
                        </ol>
                    );
                }
                return <p key={block.key} className="ai-md-p">{renderInline(block.content)}</p>;
            })}
        </div>
    );
}

const HEAD_SIZE = 66;
const VIEWPORT_PADDING = 8;

function clampPosition(x, y, width, height) {
    const maxX = Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING);
    const maxY = Math.max(VIEWPORT_PADDING, window.innerHeight - height - VIEWPORT_PADDING);
    return {
        x: Math.max(VIEWPORT_PADDING, Math.min(maxX, x)),
        y: Math.max(VIEWPORT_PADDING, Math.min(maxY, y))
    };
}

export default function AiAssistant({ currentUser }) {
    const role = currentUser?.role || 'guest';
    const [isOpen, setIsOpen] = useState(false);
    const [showTeaser, setShowTeaser] = useState(!currentUser);
    const [unreadCount, setUnreadCount] = useState(() => (!currentUser ? 2 : 1));
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [messages, setMessages] = useState(() => getInitialMessages(currentUser));

    // Free-move positions anywhere on screen (null = default bottom-right)
    const [headPos, setHeadPos] = useState(null);
    const [isDraggingHead, setIsDraggingHead] = useState(false);
    const headDragRef = useRef({ active: false, moved: false, startX: 0, startY: 0, origX: 0, origY: 0 });

    const [widgetPos, setWidgetPos] = useState(null);
    const [isDraggingWidget, setIsDraggingWidget] = useState(false);
    const widgetRef = useRef(null);
    const widgetDragRef = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0, width: 380, height: 500 });

    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isSending, isOpen]);

    useEffect(() => {
        const handleResize = () => {
            setHeadPos(prev => (prev ? clampPosition(prev.x, prev.y, HEAD_SIZE, HEAD_SIZE) : prev));
            setWidgetPos(prev => {
                if (!prev) return prev;
                const rect = widgetRef.current?.getBoundingClientRect();
                return clampPosition(prev.x, prev.y, rect?.width || 380, rect?.height || 480);
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const openChat = () => {
        setIsOpen(true);
        setShowTeaser(false);
        setUnreadCount(0);
    };

    const closeChat = () => {
        setIsOpen(false);
    };

    const handleHeadPointerDown = (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        const rect = e.currentTarget.getBoundingClientRect();
        headDragRef.current = {
            active: true,
            moved: false,
            startX: e.clientX,
            startY: e.clientY,
            origX: rect.left,
            origY: rect.top
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handleHeadPointerMove = (e) => {
        if (!headDragRef.current.active) return;
        const dx = e.clientX - headDragRef.current.startX;
        const dy = e.clientY - headDragRef.current.startY;
        if (!headDragRef.current.moved && Math.hypot(dx, dy) < 6) return;

        if (!headDragRef.current.moved) {
            headDragRef.current.moved = true;
            setIsDraggingHead(true);
        }

        setHeadPos(clampPosition(headDragRef.current.origX + dx, headDragRef.current.origY + dy, HEAD_SIZE, HEAD_SIZE));
    };

    const handleHeadPointerUp = (e) => {
        if (!headDragRef.current.active) return;
        const wasDragged = headDragRef.current.moved;
        headDragRef.current.active = false;
        setIsDraggingHead(false);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }

        if (!wasDragged) {
            openChat();
        }
    };

    const handleWidgetPointerDown = (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        if (e.target.closest('button')) return;
        const rect = widgetRef.current?.getBoundingClientRect();
        if (!rect) return;

        widgetDragRef.current = {
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            origX: rect.left,
            origY: rect.top,
            width: rect.width,
            height: rect.height
        };
        setIsDraggingWidget(true);
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handleWidgetPointerMove = (e) => {
        if (!widgetDragRef.current.active) return;
        const dx = e.clientX - widgetDragRef.current.startX;
        const dy = e.clientY - widgetDragRef.current.startY;
        const { origX, origY, width, height } = widgetDragRef.current;
        setWidgetPos(clampPosition(origX + dx, origY + dy, width, height));
    };

    const handleWidgetPointerUp = (e) => {
        if (!widgetDragRef.current.active) return;
        widgetDragRef.current.active = false;
        setIsDraggingWidget(false);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    };

    const sendMessage = async (textToSend) => {
        const trimmed = textToSend.trim();
        if (!trimmed || isSending) return;

        const history = messages
            .filter(m => !m.isWelcome && !m.isError)
            .slice(-10)
            .map(m => ({ role: m.role, text: m.text }));

        const userMsg = {
            id: `u-${Date.now()}`,
            role: 'user',
            text: trimmed
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsSending(true);

        try {
            const data = await apiFetch('/api/assistant', 'POST', {
                message: trimmed,
                role,
                history
            });

            setMessages(prev => [
                ...prev,
                {
                    id: `m-${Date.now()}`,
                    role: 'model',
                    text: data.reply || 'No response received.'
                }
            ]);
        } catch (err) {
            setMessages(prev => [
                ...prev,
                {
                    id: `e-${Date.now()}`,
                    role: 'model',
                    text: err.message || 'Could not reach the assistant right now. Please try again.',
                    isError: true
                }
            ]);
        } finally {
            setIsSending(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage(input);
    };

    const defaultPrompts = QUICK_PROMPTS[role] || QUICK_PROMPTS.guest;
    const trimmedInput = input.trim().toLowerCase();
    const suggestions = trimmedInput
        ? ALL_SUGGESTIONS.filter(item => item.toLowerCase().includes(trimmedInput)).slice(0, 3)
        : defaultPrompts;

    if (!isOpen) {
        const isOnLeftHalf = headPos ? headPos.x + HEAD_SIZE / 2 < window.innerWidth / 2 : false;
        const headStyle = headPos
            ? { left: `${headPos.x}px`, top: `${headPos.y}px`, right: 'auto', bottom: 'auto' }
            : undefined;

        return (
            <div
                className={`ai-head-anchor ${isOnLeftHalf ? 'ai-dock-left' : ''} ${isDraggingHead ? 'ai-dragging' : ''}`}
                style={headStyle}
            >
                {showTeaser && !isDraggingHead && (
                    <div className="ai-teaser" role="status" onClick={openChat}>
                        <button
                            type="button"
                            className="ai-teaser-dismiss"
                            aria-label="Dismiss welcome preview"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowTeaser(false);
                            }}
                        >
                            &times;
                        </button>
                        <div className="ai-teaser-tag">Tester Version</div>
                        <div className="ai-teaser-text">
                            Tap for a quick portal overview &amp; demo admin login (<strong>admin</strong> / <strong>123</strong>)!
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    className={`ai-chat-head ${unreadCount > 0 ? 'ai-chat-head-unread' : ''}`}
                    onPointerDown={handleHeadPointerDown}
                    onPointerMove={handleHeadPointerMove}
                    onPointerUp={handleHeadPointerUp}
                    onPointerCancel={handleHeadPointerUp}
                    aria-label={unreadCount > 0 ? `Open Portal Guide (${unreadCount} new messages)` : 'Open Portal Guide'}
                    title="Portal Guide — Click to chat or drag anywhere"
                >
                    <AssistantAvatar size={60} />
                    {unreadCount > 0 && (
                        <span className="ai-unread-badge" aria-hidden="true">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </div>
        );
    }

    const widgetStyle = widgetPos
        ? { left: `${widgetPos.x}px`, top: `${widgetPos.y}px`, right: 'auto', bottom: 'auto' }
        : undefined;

    return (
        <aside
            ref={widgetRef}
            className={`ai-widget ${widgetPos ? 'ai-widget-moved' : ''} ${isDraggingWidget ? 'ai-dragging' : ''}`}
            style={widgetStyle}
            aria-label="Portal AI Assistant"
        >
            <div
                className="ai-header"
                onPointerDown={handleWidgetPointerDown}
                onPointerMove={handleWidgetPointerMove}
                onPointerUp={handleWidgetPointerUp}
                onPointerCancel={handleWidgetPointerUp}
                title="Drag to move chat window anywhere"
            >
                <div className="ai-header-left">
                    <div className="ai-header-avatar-box">
                        <AssistantAvatar size={40} isThinking={isSending} />
                        <span className="ai-online-dot" aria-hidden="true" />
                    </div>
                    <div>
                        <div className="ai-header-title">
                            Portal Guide <span className="ai-tester-pill">Tester</span>
                        </div>
                        <div className="ai-header-subtitle">
                            {isSending ? 'Typing a reply...' : 'Online — Ask me anything'}
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    className="ai-close-btn"
                    onClick={closeChat}
                    aria-label="Minimize Portal Guide"
                    title="Minimize to chat bubble"
                >
                    &minus;
                </button>
            </div>

            <div className="ai-messages">
                {messages.map(msg => (
                    <div
                        key={msg.id}
                        className={`ai-msg-row ${msg.role === 'user' ? 'ai-msg-row-user' : 'ai-msg-row-model'}`}
                    >
                        {msg.role === 'model' && (
                            <AssistantAvatar size={28} className="ai-msg-mini-avatar" />
                        )}
                        <div
                            className={`ai-msg ${msg.role === 'user' ? 'ai-msg-user' : 'ai-msg-model'} ${msg.isError ? 'ai-msg-error' : ''}`}
                        >
                            {msg.role === 'model' ? <FormattedMessage text={msg.text} /> : msg.text}
                        </div>
                    </div>
                ))}
                {isSending && (
                    <div className="ai-msg-row ai-msg-row-model">
                        <AssistantAvatar size={28} isThinking className="ai-msg-mini-avatar" />
                        <div className="ai-msg ai-msg-model ai-typing-bubble" aria-label="Assistant is typing">
                            <span className="ai-typing-dot" />
                            <span className="ai-typing-dot" />
                            <span className="ai-typing-dot" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {suggestions.length > 0 && (
                <div className="ai-suggestions" aria-label="Recommended questions">
                    {suggestions.map(suggestion => (
                        <button
                            key={suggestion}
                            type="button"
                            className="ai-suggest-item"
                            disabled={isSending}
                            onClick={() => sendMessage(suggestion === 'System overview' ? 'overview' : suggestion)}
                        >
                            <svg className="ai-suggest-icon" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                                <path
                                    fill="currentColor"
                                    d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                                />
                            </svg>
                            <span className="ai-suggest-text">
                                {renderGoogleSuggestion(suggestion, input)}
                            </span>
                            <span className="ai-suggest-arrow" aria-hidden="true">&#8598;</span>
                        </button>
                    ))}
                </div>
            )}

            <form className="ai-input-row" onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="ai-input"
                    placeholder="Ask what any feature does..."
                    value={input}
                    disabled={isSending}
                    onChange={e => setInput(e.target.value)}
                />
                <button
                    type="submit"
                    className="ai-send-btn"
                    disabled={isSending || !input.trim()}
                >
                    Send
                </button>
            </form>
        </aside>
    );
}