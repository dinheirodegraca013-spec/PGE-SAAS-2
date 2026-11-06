export const workforceRefreshEvent = 'gestio:refresh-workforce';

export function requestWorkforceRefresh() {
  window.dispatchEvent(new Event(workforceRefreshEvent));
}
