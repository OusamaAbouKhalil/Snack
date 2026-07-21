import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Order } from '../types';

interface FeedOptions {
  /** Play the chime for new online orders (default true). Keep exactly one
   *  sounding subscriber — the admin shell — so alerts fire on every view. */
  sound?: boolean;
}

/**
 * Realtime feed of newly created orders for the admin panel.
 * Fires the callback (with the new order row) and optionally plays a chime.
 */
export function useAdminOrderFeed(onNewOrder: (order: Order) => void, options: FeedOptions = {}) {
  const cbRef = useRef(onNewOrder);
  cbRef.current = onNewOrder;
  const sound = options.sound !== false;

  useEffect(() => {
    const channel = supabase
      .channel(`admin-orders-feed-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const order = payload.new as Order;
          cbRef.current(order);
          if (sound && order.source === 'online' && !isMuted()) playChime();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sound]);
}

const MUTE_KEY = 'besweet_admin_muted';

export function isMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === '1';
}

export function setMuted(muted: boolean) {
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
}

// Real notification sound (public/sounds/new-order.mp3); falls back to a
// synthesized WebAudio chime if playback is blocked (e.g. autoplay policy)
// or the file fails to load, so an alert always has a shot at being heard.
export function playChime() {
  try {
    const audio = new Audio('/sounds/new-order.mp3');
    audio.volume = 1;
    audio.play().catch(() => playSynthChime());
  } catch {
    playSynthChime();
  }
}

function playSynthChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const play = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    play(880, 0, 0.25);
    play(1174, 0.18, 0.35);
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // audio blocked — badge still shows
  }
}
