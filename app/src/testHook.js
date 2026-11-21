// Test hook — the deterministic API the screenshot helper and the grader use.
// window.coverStudio.ready resolves once fonts + samples + first render are done.
import { renderCoverDataURL as render, faceReport as report, panelDiagnostics, tagDiagnostics } from './renderCover.js';

export function installTestHook(getState, setGrade, setLayout) {
  const api = {
    ready: null,
    renderCoverDataURL(size) { return render(getState(), size); },
    faceReport() { return report(getState()); },
    diagnostics() { return panelDiagnostics(getState()); },
    tagDiagnostics() { return tagDiagnostics(getState()); },
    setGrade(name) { setGrade(name); },
    setLayout(name) { setLayout(name); },
  };
  api.ready = new Promise((resolve) => { api._resolveReady = resolve; });
  window.coverStudio = api;
  return api;
}
