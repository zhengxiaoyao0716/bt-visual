const clipboardSalt = "// bt-visual-clipboard: ";

export default {
  async write<T>(key: string, data: T) {
    const dumps = `${clipboardSalt}${key}\r\n${JSON.stringify(data)}`;
    await navigator.clipboard.writeText(dumps);
  },
  async read<T>(key: string): Promise<T | null> {
    const loads = (await navigator.clipboard.readText()).replace("\r", "");
    if (!loads) return null;
    if (!loads.startsWith(clipboardSalt)) return null;
    const index = loads.indexOf("\n");
    if (index < 0 || index >= loads.length) return null;
    const comments = loads.slice(0, index);
    if (key !== comments.slice(clipboardSalt.length)) return null;
    const content = loads.slice(index + 1);
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error(
        `failed to parse clipboard content, content: ${content}, reason: ${e}`,
        e
      );
      return null;
    }
  },
};
