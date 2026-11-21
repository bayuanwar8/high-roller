// Undo / redo — a plain stack of JSON snapshots of the studio state.
export function createHistory(limit = 60) {
  let past = [];
  let future = [];
  return {
    push(state) {
      past.push(JSON.stringify(state));
      if (past.length > limit) past.shift();
      future = [];
    },
    undo(current) {
      if (!past.length) return null;
      future.push(JSON.stringify(current));
      return JSON.parse(past.pop());
    },
    redo(current) {
      if (!future.length) return null;
      past.push(JSON.stringify(current));
      return JSON.parse(future.pop());
    },
    canUndo() { return past.length > 0; },
    canRedo() { return future.length > 0; },
  };
}
