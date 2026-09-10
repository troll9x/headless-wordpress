'use client';

import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPause,
  faPlay,
  faShareNodes,
  faVolumeHigh,
} from '@fortawesome/free-solid-svg-icons';
import type { Locale } from '@/types/ngon-ngu';

interface ArticleVoiceControlsProps {
  contentId: string;
  locale: Locale;
  postId: number;
  postType?: 'post' | 'to-chuc';
  variant?: 'default' | 'organization';
}

interface LoadedChunk {
  url: string;
  chunkCount: number;
}

type PlaybackState = 'idle' | 'loading' | 'speaking' | 'paused';

const ACTION_BUTTON =
  'inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0118d8] shadow-sm transition hover:border-[#0118d8] hover:bg-[#0118d8] hover:text-white disabled:cursor-not-allowed disabled:opacity-40';

export function ArticleVoiceControls({
  contentId,
  locale,
  postId,
  postType = 'post',
  variant = 'default',
}: ArticleVoiceControlsProps) {
  const isEn = locale === 'en';
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const browserUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const loadedChunksRef = useRef(new Map<number, Promise<LoadedChunk>>());
  const playbackRequestRef = useRef(0);
  const [playback, setPlayback] = useState<PlaybackState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadedChunks = loadedChunksRef.current;

    return () => {
      playbackRequestRef.current += 1;
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
      audioRef.current = null;
      browserUtteranceRef.current = null;

      for (const chunkPromise of loadedChunks.values()) {
        void chunkPromise.then(({ url }) => URL.revokeObjectURL(url)).catch(() => undefined);
      }
      loadedChunks.clear();
    };
  }, [postId, postType]);

  function finishPlayback(requestId: number) {
    if (playbackRequestRef.current !== requestId) return;
    setPlayback('idle');
    audioRef.current = null;
    browserUtteranceRef.current = null;
  }

  function stopCurrentPlayback() {
    playbackRequestRef.current += 1;
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
    audioRef.current = null;
    browserUtteranceRef.current = null;
  }

  function speakEnglishWithBrowser(content: string, requestId: number) {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setErrorMessage('This browser does not support text-to-speech.');
      finishPlayback(requestId);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => {
      if (playbackRequestRef.current === requestId) setPlayback('speaking');
    };
    utterance.onend = () => finishPlayback(requestId);
    utterance.onerror = () => {
      setErrorMessage('Unable to play this article.');
      finishPlayback(requestId);
    };
    browserUtteranceRef.current = utterance;
    setPlayback('speaking');
    window.speechSynthesis.speak(utterance);
  }

  function loadVietnameseChunk(chunkIndex: number): Promise<LoadedChunk> {
    const existing = loadedChunksRef.current.get(chunkIndex);
    if (existing) return existing;

    const request = fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, postType, locale: 'vi', chunkIndex }),
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || `TTS HTTP ${response.status}`);
      }

      const chunkCount = Number.parseInt(response.headers.get('X-TTS-Chunk-Count') || '1', 10);
      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Viettel AI trả về file âm thanh rỗng.');

      return {
        url: URL.createObjectURL(blob),
        chunkCount: Number.isSafeInteger(chunkCount) && chunkCount > 0 ? chunkCount : 1,
      };
    }).catch((error) => {
      loadedChunksRef.current.delete(chunkIndex);
      throw error;
    });

    loadedChunksRef.current.set(chunkIndex, request);
    return request;
  }

  async function playVietnameseChunk(chunkIndex: number, requestId: number) {
    try {
      if (playbackRequestRef.current !== requestId) return;
      const chunk = await loadVietnameseChunk(chunkIndex);
      if (playbackRequestRef.current !== requestId) return;

      const audio = new Audio(chunk.url);
      audioRef.current = audio;
      audio.onplay = () => {
        if (playbackRequestRef.current === requestId) setPlayback('speaking');
      };
      audio.onended = () => {
        if (playbackRequestRef.current !== requestId) return;
        if (chunkIndex + 1 < chunk.chunkCount) {
          void playVietnameseChunk(chunkIndex + 1, requestId);
        } else {
          finishPlayback(requestId);
        }
      };
      audio.onerror = () => {
        if (playbackRequestRef.current !== requestId) return;
        setErrorMessage('Không thể phát file giọng đọc.');
        finishPlayback(requestId);
      };

      await audio.play();

      // Generate/download the next part while the current part is playing.
      if (chunkIndex + 1 < chunk.chunkCount) {
        void loadVietnameseChunk(chunkIndex + 1).catch(() => undefined);
      }
    } catch (error) {
      if (playbackRequestRef.current !== requestId) return;
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tạo giọng đọc.');
      finishPlayback(requestId);
    }
  }

  function speak() {
    const content = document.getElementById(contentId)?.innerText.trim();
    if (!content) return;

    stopCurrentPlayback();
    const requestId = playbackRequestRef.current;
    setErrorMessage('');

    if (isEn) {
      speakEnglishWithBrowser(content, requestId);
      return;
    }

    setPlayback('loading');
    void playVietnameseChunk(0, requestId);
  }

  function pause() {
    if (playback !== 'speaking') return;

    if (isEn) {
      window.speechSynthesis?.pause();
    } else {
      audioRef.current?.pause();
    }
    setPlayback('paused');
  }

  function resume() {
    if (playback !== 'paused') return;

    if (isEn) {
      window.speechSynthesis?.resume();
      setPlayback('speaking');
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    void audio.play().catch(() => {
      setErrorMessage('Không thể tiếp tục phát giọng đọc.');
      setPlayback('idle');
    });
  }

  const statusText = playback === 'loading'
    ? (isEn ? 'Preparing audio' : 'Đang tạo giọng đọc')
    : playback === 'speaking'
      ? (isEn ? 'Article is playing' : 'Đang đọc bài viết')
      : playback === 'paused'
        ? (isEn ? 'Playback paused' : 'Đã tạm dừng')
        : (isEn ? 'Playback stopped' : 'Đã dừng đọc');
  const actionButtonClass = variant === 'organization'
    ? 'inline-flex h-[46px] w-[46px] items-center justify-center rounded-full border-0 bg-[#b31b34] text-white shadow-[0_4px_10px_rgba(0,0,0,0.1)] transition hover:-translate-y-0.5 hover:bg-[#a0002e] active:scale-95 active:bg-[#870026] disabled:cursor-not-allowed disabled:opacity-40'
    : ACTION_BUTTON;

  return (
    <div className={variant === 'organization' ? '' : 'mb-5'} aria-label={isEn ? 'Listen to article' : 'Nghe bài viết'}>
      <div className={`flex items-center ${variant === 'organization' ? 'gap-3' : 'gap-2'}`}>
        {variant === 'default' && (
          <span className="mr-1 text-sm font-semibold text-slate-600">
            {isEn ? 'Listen:' : 'Nghe bài viết:'}
          </span>
        )}
        <button
          type="button"
          onClick={speak}
          disabled={playback === 'loading'}
          className={actionButtonClass}
          title={isEn ? 'Listen to article' : 'Nghe bài viết'}
          aria-label={isEn ? 'Listen to article' : 'Nghe bài viết'}
        >
          <FontAwesomeIcon icon={faVolumeHigh} className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={pause}
          disabled={playback !== 'speaking'}
          className={actionButtonClass}
          title={isEn ? 'Pause' : 'Tạm dừng'}
          aria-label={isEn ? 'Pause' : 'Tạm dừng'}
        >
          <FontAwesomeIcon icon={faPause} className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={resume}
          disabled={playback !== 'paused'}
          className={actionButtonClass}
          title={isEn ? 'Resume' : 'Tiếp tục'}
          aria-label={isEn ? 'Resume' : 'Tiếp tục'}
        >
          <FontAwesomeIcon icon={faPlay} className="h-4 w-4" />
        </button>
        {playback === 'loading' && (
          <span className="text-sm text-slate-500">{statusText}…</span>
        )}
      </div>
      {errorMessage && (
        <p className="mt-2 text-sm text-red-600" role="alert">{errorMessage}</p>
      )}
      <span className="sr-only" aria-live="polite">{errorMessage || statusText}</span>
    </div>
  );
}

export function ArticleShareButton({ locale, title }: { locale: Locale; title: string }) {
  const [copied, setCopied] = useState(false);
  const isEn = locale === 'en';

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href });
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-2 rounded-full border border-[#0118d8] px-5 py-2 text-sm font-semibold text-[#0118d8] transition hover:bg-[#0118d8] hover:text-white"
    >
      <FontAwesomeIcon icon={faShareNodes} className="h-4 w-4" />
      {copied ? (isEn ? 'Link copied' : 'Đã sao chép liên kết') : (isEn ? 'Share' : 'Chia sẻ')}
    </button>
  );
}
