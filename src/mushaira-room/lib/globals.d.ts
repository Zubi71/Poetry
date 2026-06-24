// Ambient declarations for the vanilla-JS globals this bundle talks to.
// IMPORTANT: these are declared with top-level `const` in their own classic
// <script> files (js/router.js, js/auth.js, js/api.js, js/storage.js,
// js/components.js, js/voice-room.js, js/supabase.js, js/mushaira-events.js,
// js/pages.js) — top-level `const`/`let` in a classic script creates a
// shared *global lexical* binding, NOT a `window` property. So this bundle
// (also loaded as a classic <script>, sharing the same global scope) must
// reference them as bare identifiers, never `window.Router` etc. (the
// latter is either `undefined`, or — worse, for `Storage` — silently
// resolves to the unrelated native browser `Storage` API instead).
// Plain `function` declarations (getPoetById, avatarImg, ...) DO attach to
// `window` as usual, so those keep the `window.` prefix where used.
export {};

declare global {
  const VoiceRoomLive: any;
  const Auth: any;
  const API: any;
  const Storage: any;
  const Router: any;
  const Components: any;
  const Realtime: any;
  const SupabaseClient: any;
  const MushairaEvents: any;
  const Pages: any;
  const APP_DATA: any;

  interface Window {
    avatarImg: (name: string, className?: string, alt?: string, avatarUrl?: string) => string;
    getAvatarUrl: (name: string) => string;
    getAllMushairaEvents: () => any[];
    getMushairaEventById: (id: any) => any;
    getPoetById: (id: any) => any;
    MushairaRoomReact?: {
      mountRoom: (container: HTMLElement, meta: any) => any;
      mountListing: (container: HTMLElement, props?: any) => any;
      unmount: (root: any) => void;
    };
  }
}
