export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const focused = document.activeElement;
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.append(area);
    try {
      area.select();
      if (!document.execCommand('copy')) throw new Error('Clipboard unavailable');
    } finally {
      area.remove();
      focused?.focus({ preventScroll: true });
    }
  }
}
