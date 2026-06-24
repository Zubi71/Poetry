/**
 * Thin DOM-lifecycle adapter between the vanilla-JS router/pages and the
 * compiled React bundle (dist/mushaira-room/mushaira-room.js). Mirrors
 * VoiceRoomLive.init()'s own "always destroy previous before creating new"
 * idiom so repeated navigation (including same-route/different-id jumps
 * that router.js's prefix-based exemption doesn't catch) never leaks a
 * React root or double-mounts.
 */
window.MushairaRoomBridge = {
  _root: null,

  mountRoom(container, meta) {
    this.unmount();
    if (!window.MushairaRoomReact) {
      console.warn('Mushaira React bundle not loaded yet');
      return;
    }
    this._root = window.MushairaRoomReact.mountRoom(container, meta);
  },

  mountListing(container) {
    this.unmount();
    if (!window.MushairaRoomReact) {
      console.warn('Mushaira React bundle not loaded yet');
      return;
    }
    this._root = window.MushairaRoomReact.mountListing(container);
  },

  unmount() {
    if (this._root && window.MushairaRoomReact) {
      window.MushairaRoomReact.unmount(this._root);
    }
    this._root = null;
  }
};
