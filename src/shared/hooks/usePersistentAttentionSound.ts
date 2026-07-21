import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ChannelState = {
  enabled: boolean;
  pending: boolean;
};

type Listener = () => void;

const SOUND_URL = "/sounds/Entregaiaudio.mp3";
const ARMED_STORAGE_KEY = "admin-attention-sound-armed:v1";

const readStoredArmedState = () => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ARMED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

const storeArmedState = () => {
  try {
    localStorage.setItem(ARMED_STORAGE_KEY, "true");
  } catch {
    // O armazenamento pode estar indisponível em modo privado/restrito.
  }
};

class PersistentAttentionSoundManager {
  private audio: HTMLAudioElement | null = null;
  private channels = new Map<string, ChannelState>();
  private listeners = new Set<Listener>();
  private playing = false;
  private armed = readStoredArmedState();
  private autoplayBlocked = false;
  private activationListenersAttached = false;

  getSnapshot() {
    return {
      armed: this.armed,
      autoplayBlocked: this.autoplayBlocked,
      playing: this.playing,
    };
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    this.attachActivationListeners();
    return () => {
      this.listeners.delete(listener);
    };
  }

  setChannel(channelId: string, state: ChannelState) {
    this.channels.set(channelId, state);
    this.sync();
  }

  removeChannel(channelId: string) {
    this.channels.delete(channelId);
    this.sync();
  }

  arm = () => {
    this.armed = true;
    storeArmedState();
    this.autoplayBlocked = false;
    this.ensureAudio();
    this.emit();
    this.sync();
  };

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  private attachActivationListeners() {
    if (typeof window === "undefined" || this.activationListenersAttached) return;
    this.activationListenersAttached = true;
    window.addEventListener("pointerdown", this.arm, { passive: true });
    window.addEventListener("keydown", this.arm);
  }

  private ensureAudio() {
    if (typeof Audio === "undefined") return null;
    if (this.audio) return this.audio;

    const audio = new Audio(SOUND_URL);
    audio.preload = "auto";
    // O loop nativo continua em abas ocultas. Timers JavaScript são limitados
    // pelo navegador e podem deixar o alerta silencioso em segundo plano.
    audio.loop = true;
    audio.addEventListener("ended", this.handleEnded);
    this.audio = audio;
    return audio;
  }

  private hasActivePending() {
    for (const channel of this.channels.values()) {
      if (channel.enabled && channel.pending) return true;
    }
    return false;
  }

  private sync() {
    if (!this.hasActivePending()) {
      this.stop();
      return;
    }

    if (this.armed && !this.playing) {
      void this.playNow();
    }
  }

  private async playNow() {
    if (!this.armed || !this.hasActivePending() || this.playing) return;
    const audio = this.ensureAudio();
    if (!audio) return;

    try {
      audio.pause();
      audio.currentTime = 0;
      this.playing = true;
      this.emit();
      await audio.play();
      this.autoplayBlocked = false;
      this.emit();
    } catch (error: any) {
      this.playing = false;
      this.autoplayBlocked = error?.name === "NotAllowedError";
      this.emit();
    }
  }

  private handleEnded = () => {
    this.playing = false;
    this.emit();
    if (!this.armed || !this.hasActivePending()) return;
    void this.playNow();
  };

  private stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    if (this.playing) {
      this.playing = false;
      this.emit();
    }
  }
}

const soundManager = new PersistentAttentionSoundManager();

export const getAlertSoundStorageKey = (
  lojaId: string | undefined | null,
  context: "salao" | "entrega" | "retirada",
) => `admin-alert-sound:v1:${lojaId || "sem-loja"}:${context}`;

export const useAlertSoundPreference = (
  lojaId: string | undefined | null,
  context: "salao" | "entrega" | "retirada",
) => {
  const storageKey = useMemo(() => getAlertSoundStorageKey(lojaId, context), [lojaId, context]);
  const [enabled, setEnabledState] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(storageKey) !== "false";
  });

  useEffect(() => {
    setEnabledState(localStorage.getItem(storageKey) !== "false");
  }, [storageKey]);

  const setEnabled = useCallback((nextEnabled: boolean) => {
    setEnabledState(nextEnabled);
    localStorage.setItem(storageKey, nextEnabled ? "true" : "false");
  }, [storageKey]);

  return { enabled, setEnabled };
};

export const usePersistentAttentionSound = (
  channelId: string,
  enabled: boolean,
  pending: boolean,
) => {
  const [snapshot, setSnapshot] = useState(() => soundManager.getSnapshot());
  const latestStateRef = useRef({ enabled, pending });

  useEffect(() => soundManager.subscribe(() => {
    setSnapshot(soundManager.getSnapshot());
  }), []);

  useEffect(() => {
    latestStateRef.current = { enabled, pending };
    soundManager.setChannel(channelId, latestStateRef.current);
    return () => {
      soundManager.removeChannel(channelId);
    };
  }, [channelId, enabled, pending]);

  return {
    ...snapshot,
    arm: soundManager.arm,
  };
};
