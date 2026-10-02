export function usePortfolioClipboard() {
  const notice = ref("");
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function copy(text: string, label: string) {
    clearTimeout(timer);
    try {
      await navigator.clipboard.writeText(text);
      notice.value = `${label} copied`;
    } catch {
      notice.value = "Copy unavailable. Please select and copy the text.";
    }
    timer = setTimeout(() => {
      notice.value = "";
    }, 3000);
  }

  onBeforeUnmount(() => clearTimeout(timer));
  return reactive({ notice, copy });
}
