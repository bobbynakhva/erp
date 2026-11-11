/* Presentation only: keep the existing menu renderer and permission checks.
 * Its anchors use viewport coordinates; constrain each flyout after rendering.
 */
(() => {
  const popup = document.getElementById("popup");
  if (!popup) return;
  let pending = false;

  function schedulePlacement() {
    if (popup.hidden || pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      if (popup.hidden) return;
      const rect = popup.getBoundingClientRect();
      const width = document.documentElement.clientWidth;
      const height = window.innerHeight;
      const left = Math.round(Math.max(8, Math.min(rect.left, width - rect.width - 8)));
      const top = Math.round(Math.max(8, Math.min(rect.top, height - rect.height - 8)));
      if (Math.abs(rect.left - left) > 0.5) popup.style.left = `${left}px`;
      if (Math.abs(rect.top - top) > 0.5) popup.style.top = `${top}px`;
    });
  }

  new MutationObserver(schedulePlacement).observe(popup, {
    childList: true,
    attributes: true,
    attributeFilter: ["hidden", "style"],
  });
  window.addEventListener("resize", schedulePlacement);
})();
