import axios from 'axios';
import { ArrowUp, ChevronDown, MessageCircle, LoaderCircle, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { askSupport } from '../../api/support';

import type { SupportSourceReference } from '../../types/support';

import './HelpChat.scss';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: SupportSourceReference[];
  failedQuestion?: string;
}

const MAX_QUESTION_LENGTH = 500;

const SUGGESTED_QUESTIONS = ['현재가는 어떻게 확인하나요?', '종목은 어떻게 검색하나요?'];

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) {
      return '지금은 도움말을 사용할 수 없습니다.';
    }

    const errorCode = error.response?.data?.errorCode;

    switch (errorCode) {
      case 'SUPPORT_0001':
        return '질문 내용을 확인해주세요.';
      case 'SUPPORT_0002':
        return '관련된 도움말을 찾지 못했습니다.';
      case 'SUPPORT_0003':
      case 'SUPPORT_0004':
        return '답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
      default:
        return '답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
    }
  }

  return '답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
};

const HelpChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());

  const nextMessageIdRef = useRef(1);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    messageEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [isOpen, messages, isSubmitting, expandedSources]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timerId = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 150);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (chatRef.current && !chatRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const createMessageId = () => {
    const id = nextMessageIdRef.current;
    nextMessageIdRef.current += 1;

    return id;
  };

  const sendQuestion = async (value: string) => {
    const trimmedQuestion = value.trim();

    if (!trimmedQuestion || isSubmitting) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmedQuestion,
    };

    setMessages((previous) => [...previous, userMessage]);
    setQuestion('');
    setIsSubmitting(true);

    try {
      const response = await askSupport(trimmedQuestion);

      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources ?? [],
      };

      setMessages((previous) => [...previous, assistantMessage]);
    } catch (error) {
      const failedMessage: ChatMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: getErrorMessage(error),
        failedQuestion: trimmedQuestion,
      };

      setMessages((previous) => [...previous, failedMessage]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void sendQuestion(question);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (!question.trim() || isSubmitting) {
      return;
    }

    void sendQuestion(question);
  };

  const handleSuggestedQuestion = (suggestedQuestion: string) => {
    if (isSubmitting) {
      return;
    }

    void sendQuestion(suggestedQuestion);
  };

  const handleRetry = (failedQuestion: string) => {
    if (isSubmitting) {
      return;
    }

    void sendQuestion(failedQuestion);
  };

  const handleToggleSources = (messageId: number) => {
    setExpandedSources((previous) => {
      const next = new Set(previous);

      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }

      return next;
    });
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div ref={chatRef} className={`help-chat ${isOpen ? 'help-chat--open' : ''}`}>
      {isOpen && (
        <section
          className="help-chat__panel"
          role="dialog"
          aria-label="SAJO 도움말"
          aria-modal="false"
        >
          <header className="help-chat__header">
            <div>
              <strong>SAJO 도움말</strong>
              <span>서비스 이용에 대해 물어보세요</span>
            </div>

            <button
              type="button"
              className="help-chat__close"
              aria-label="도움말 닫기"
              onClick={handleClose}
            >
              <X size={18} />
            </button>
          </header>

          <div className="help-chat__messages" aria-live="polite">
            {!hasMessages && (
              <div className="help-chat__welcome">
                <div className="help-chat__welcome-logo">
                  <img src="/4jo-logo-green.svg" alt="4JO" />
                </div>

                <strong>무엇이 궁금하신가요?</strong>

                <p>
                  SAJO 서비스 이용 중 궁금한 내용을
                  <br />
                  편하게 질문해주세요.
                </p>

                <div className="help-chat__suggestions">
                  {SUGGESTED_QUESTIONS.map((suggestedQuestion) => (
                    <button
                      key={suggestedQuestion}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSuggestedQuestion(suggestedQuestion)}
                    >
                      <span>{suggestedQuestion}</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => {
              const hasSources =
                message.role === 'assistant' &&
                message.sources !== undefined &&
                message.sources.length > 0;

              const isSourcesExpanded = expandedSources.has(message.id);

              return (
                <div
                  key={message.id}
                  className={`help-chat__message help-chat__message--${message.role}`}
                >
                  {message.role === 'assistant' && (
                    <span className="help-chat__message-name">SAJO</span>
                  )}

                  <div className="help-chat__bubble">
                    <p>{message.content}</p>
                  </div>

                  {hasSources && (
                    <div className="help-chat__sources">
                      <button
                        type="button"
                        className="help-chat__sources-toggle"
                        aria-expanded={isSourcesExpanded}
                        onClick={() => handleToggleSources(message.id)}
                      >
                        <span>참고한 내용 {message.sources?.length}개</span>

                        <ChevronDown
                          size={14}
                          className={
                            isSourcesExpanded
                              ? 'help-chat__sources-chevron help-chat__sources-chevron--open'
                              : 'help-chat__sources-chevron'
                          }
                        />
                      </button>

                      {isSourcesExpanded && (
                        <div className="help-chat__source-list">
                          {message.sources?.map((source, index) => (
                            <article
                              key={`${message.id}-${source.documentTitle}-${source.sectionTitle}-${index}`}
                              className="help-chat__source"
                            >
                              <strong>{source.documentTitle}</strong>

                              {source.sectionTitle && <span>{source.sectionTitle}</span>}

                              {source.excerpt && <p>{source.excerpt}</p>}
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {message.failedQuestion && (
                    <button
                      type="button"
                      className="help-chat__retry"
                      disabled={isSubmitting}
                      onClick={() => handleRetry(message.failedQuestion!)}
                    >
                      <RotateCcw size={13} />
                      다시 시도
                    </button>
                  )}
                </div>
              );
            })}

            {isSubmitting && (
              <div className="help-chat__message help-chat__message--assistant">
                <span className="help-chat__message-name">SAJO</span>

                <div className="help-chat__loading">
                  <LoaderCircle size={15} />
                  <span>관련 내용을 찾고 있어요</span>
                </div>
              </div>
            )}

            <div ref={messageEndRef} />
          </div>

          <form className="help-chat__composer" onSubmit={handleSubmit}>
            <div className="help-chat__input-wrap">
              <textarea
                ref={textareaRef}
                rows={1}
                maxLength={MAX_QUESTION_LENGTH}
                placeholder="무엇이든 물어보세요"
                value={question}
                disabled={isSubmitting}
                aria-label="도움말 질문"
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
              />

              <button
                type="submit"
                className="help-chat__send"
                disabled={!question.trim() || isSubmitting}
                aria-label="질문 보내기"
              >
                {isSubmitting ? <LoaderCircle size={16} /> : <ArrowUp size={17} />}
              </button>
            </div>

            <div className="help-chat__composer-meta">
              <span>Enter 전송 · Shift + Enter 줄바꿈</span>
              <span>
                {question.length}/{MAX_QUESTION_LENGTH}
              </span>
            </div>
          </form>
        </section>
      )}

      <div className="help-chat__launcher-wrap">
        {!isOpen && (
          <div className="help-chat__tooltip" role="tooltip">
            무엇이 궁금하세요?
          </div>
        )}

        <button
          type="button"
          className="help-chat__launcher"
          aria-label={isOpen ? 'SAJO 도움말 닫기' : 'SAJO 도움말 열기'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((previous) => !previous)}
        >
          {isOpen ? <X size={20} /> : <MessageCircle size={21} strokeWidth={1.9} />}
        </button>
      </div>
    </div>
  );
};

export default HelpChat;
