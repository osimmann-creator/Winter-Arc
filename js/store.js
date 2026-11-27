'use strict';

/* The Worker owns sessions, group data and photo access. */
const Store = (() => {
  let group;
  let setupToken;
  let revision;
  let polling = false;
  let activeSession = false;
  let timer;
  const listeners = new Set();

  async function call(action, payload = {}) {
    const response = await fetch('/api/' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      credentials: 'same-origin',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || 'Winter Arc couldn’t connect. Try again.');
      error.status = response.status;
      throw error;
    }
    return result.data;
  }

  async function poll() {
    if (document.hidden || polling || !activeSession || !listeners.size) return;
    polling = true;
    try {
      const next = await call('getRevision');
      if (revision !== undefined && revision !== next) {
        if ((await Promise.all([...listeners].map(fn => fn()))).includes(false)) return;
      }
      revision = next;
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        await Promise.allSettled([...listeners].map(fn => fn()));
      }
    } finally {
      polling = false;
    }
  }

  return {
    mode: 'live',
    setupUsername: '',
    async init() {
      const invite = new URLSearchParams(location.hash.slice(1));
      setupToken = invite.get('setup');
      this.setupUsername = setupToken ? invite.get('user') || '' : '';
    },
    config() { return { ...CONFIG, ...group }; },
    async getAuth() {
      const auth = await call('getAuth');
      activeSession = auth.signedIn && !auth.mustChangePassword;
      return auth;
    },
    signIn: (username, password) => call('signIn', { username, password, setupToken }),
    async setPassword(password) {
      await call('setPassword', { password });
      if (setupToken) {
        setupToken = null;
        history.replaceState(null, '', location.pathname + location.search);
      }
    },
    async signOut() {
      await call('signOut');
      group = undefined;
      activeSession = false;
      revision = undefined;
    },
    getMe: () => call('getMe'),
    async getGroup() { group = await call('getGroup'); return group; },
    updateProfile: patch => call('updateProfile', patch),
    getPrefs: () => call('getPrefs'),
    updatePrefs: patch => call('updatePrefs', patch),
    async updateGroup(patch) { group = await call('updateGroup', patch); return group; },
    addFriend: input => call('addFriend', input),
    resetPassword: memberId => call('resetPassword', { memberId }),
    removeMember: memberId => call('removeMember', { memberId }),
    makeCommissioner: memberId => call('makeCommissioner', { memberId }),
    listMembers: () => call('listMembers'),
    listPosts: () => call('listPosts', { includeBike: true }),
    listSocial: () => call('listSocial'),
    addTextPost: body => call('addTextPost', { body }),
    createPoll: input => call('createPoll', input),
    votePoll: (id, choice) => call('votePoll', { id, choice }),
    addFeedComment: comment => call('addFeedComment', comment),
    setCommentHeart: (commentId, hearted) => call('setCommentHeart', { commentId, hearted }),
    createInjuryReport: report => call('createInjuryReport', report),
    resolveInjuryReport: id => call('resolveInjuryReport', { id }),
    uploadPhoto: dataUrl => call('uploadPhoto', { dataUrl }),
    addPost: post => call('addPost', post),
    editPost: post => call('editPost', post),
    deletePost: id => call('deletePost', { id }),
    toggleReaction: (postId, emoji) => call('toggleReaction', { postId, emoji }),
    setFeedReaction: (kind, target, emoji, active) => call('setFeedReaction', { kind, target, emoji, active }),
    voidPost: id => call('voidPost', { id }),
    listEvents: () => call('listEvents'),
    recordEvent: event => call('recordEvent', event),
    markSeen: id => call('markSeen', { id }),
    getXmas: () => call('getXmas'),
    castXmasVote: (target, choice) => call('castXmasVote', { target, choice }),
    subscribe(fn) {
      listeners.add(fn);
      if (!timer) {
        timer = setInterval(poll, 4000);
        document.addEventListener('visibilitychange', poll);
        poll();
      }
      return () => {
        listeners.delete(fn);
        if (listeners.size) return;
        clearInterval(timer);
        timer = undefined;
        document.removeEventListener('visibilitychange', poll);
      };
    },
  };
})();
