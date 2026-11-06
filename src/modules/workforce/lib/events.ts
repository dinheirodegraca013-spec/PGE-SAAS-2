export const workforceRefreshEvent = 'gestio:refresh-workforce';

export function requestWorkforceRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(workforceRefreshEvent));
}
