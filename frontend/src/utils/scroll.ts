export function scrollToBottom(element: HTMLElement | null, behavior: ScrollBehavior = 'auto') {
  if (!element) return;

  // Use requestAnimationFrame to ensure the scroll happens after the DOM has been updated
  requestAnimationFrame(() => {
    element.scrollTo({ top: element.scrollHeight, behavior });
  });
}
