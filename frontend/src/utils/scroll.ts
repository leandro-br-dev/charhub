export function scrollToBottom(element: HTMLElement | null, behavior: ScrollBehavior = 'auto') {
  if (!element) return;

  // Use requestAnimationFrame to ensure the scroll happens after the DOM has been updated
  requestAnimationFrame(() => {
    // Calculate the actual scrollable height
    // scrollHeight includes the total content height
    // clientHeight is the visible area
    // The difference is what we can scroll
    const maxScrollTop = element.scrollHeight - element.clientHeight;

    element.scrollTo({
      top: maxScrollTop,
      behavior
    });
  });
}

/**
 * Scrolls to make a specific element visible, accounting for fixed footers
 * @param container - The scrollable container
 * @param targetElement - The element to scroll into view
 * @param offset - Additional offset from bottom (e.g., footer height)
 * @param behavior - Scroll behavior ('auto' or 'smooth')
 */
export function scrollIntoView(
  container: HTMLElement | null,
  targetElement: HTMLElement | null,
  offset: number = 0,
  behavior: ScrollBehavior = 'smooth'
) {
  if (!container || !targetElement) return;

  requestAnimationFrame(() => {
    const containerRect = container.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    // Calculate the position of the target relative to the container
    const targetTop = targetRect.top - containerRect.top + container.scrollTop;

    // Calculate where to scroll so the target is visible above the footer
    // We want the target to be visible in the viewport, accounting for the offset (footer)
    const scrollTarget = targetTop - containerRect.height + targetRect.height + offset;

    container.scrollTo({
      top: Math.max(0, scrollTarget),
      behavior
    });
  });
}
