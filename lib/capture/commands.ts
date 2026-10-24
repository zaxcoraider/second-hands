/**
 * Hands-free voice commands via the browser's speech recognition (Chrome on Android/desktop).
 * Ignores anything heard while the app itself is speaking, so it never reacts to its own voice.
 */

export type Command = "next" | "back" | "repeat" | "check" | "override" | "pause" | "resume";

// Checked in order; the first match wins. Phrases are lowercase.
const PHRASES: [Command, RegExp][] = [
  ["override", /\b(i'?m right|i am right|that'?s (right|fine|correct)|override|ignore (it|that))\b/],
  ["back", /\b(go back|back|previous|undo)\b/],
  ["next", /\b(next( step)?|skip( it| step)?|done|finished)\b/],
  ["repeat", /\b(repeat|say (it )?again)\b/],
  ["check", /\b(check( me| it| now)?|look( now)?)\b/],
  ["resume", /\b(resume|continue|start( again)?)\b/],
  ["pause", /\b(pause|hold on|wait)\b/],
];

export function parseCommand(text: string): Command | null {
  const t = text.toLowerCase();
  for (const [cmd, re] of PHRASES) if (re.test(t)) return cmd;
  return null;
}

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const commandsSupported = () => recognitionCtor() !== null;

/** Starts listening; returns a stop function. Restarts itself when the browser ends a session. */
export function listenForCommands(handlers: {
  onCommand: (cmd: Command, heard: string) => void;
  onError?: (error: string) => void;
}): () => void {
  const Ctor = recognitionCtor();
  if (!Ctor) return () => {};
  let stopped = false;
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.continuous = true;
  rec.interimResults = false;

  rec.onresult = (e) => {
    // The app talking to itself isn't a command.
    if (typeof speechSynthesis !== "undefined" && speechSynthesis.speaking) return;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (!e.results[i].isFinal) continue;
      const heard = e.results[i][0].transcript.trim();
      const cmd = parseCommand(heard);
      if (cmd) handlers.onCommand(cmd, heard);
    }
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") {
      stopped = true;
      handlers.onError?.("Microphone blocked. Allow it in site settings to use voice commands.");
    }
  };
  rec.onend = () => {
    if (!stopped) {
      try {
        rec.start();
      } catch {
        // already started
      }
    }
  };
  try {
    rec.start();
  } catch {
    handlers.onError?.("Voice commands couldn't start.");
  }
  return () => {
    stopped = true;
    rec.stop();
  };
}
