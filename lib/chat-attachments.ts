export const MAX_CHAT_FILES = 5;
export const MAX_CHAT_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_CHAT_TOTAL_BYTES = 20 * 1024 * 1024;
const mimeTypes: Record<string, string> = {
  pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  csv: "text/csv", txt: "text/plain", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
};
export const CHAT_FILE_ACCEPT = Object.keys(mimeTypes).map(extension => `.${extension}`).join(",");
const extension = (file: File) => file.name.split(".").at(-1)?.toLowerCase() ?? "";
export function validateChatFiles(files: File[]): void {
  if (files.length > MAX_CHAT_FILES) throw new Error(`Attach up to ${MAX_CHAT_FILES} files per message.`);
  for (const file of files) {
    if (!mimeTypes[extension(file)]) throw new Error(`${file.name}: use PDF, DOCX, CSV, TXT, JPG, PNG or WebP.`);
    if (!file.size) throw new Error(`${file.name} is empty.`);
    if (file.size > MAX_CHAT_FILE_BYTES) throw new Error(`${file.name} exceeds the 15 MB per-file limit.`);
  }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_CHAT_TOTAL_BYTES) throw new Error("Attachments must total 20 MB or less per message.");
}
export async function prepareChatAttachments(files: File[]) {
  validateChatFiles(files);
  return Promise.all(files.map(async file => ({
    name: file.name, contentType: mimeTypes[extension(file)],
    contentUrl: await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`Could not read ${file.name}. Please attach it again.`));
      reader.onabort = () => reject(new Error(`Reading ${file.name} was cancelled.`));
      reader.onload = () => typeof reader.result === "string" && reader.result.includes(",")
        ? resolve(`data:${mimeTypes[extension(file)]};base64,${reader.result.split(",")[1]}`)
        : reject(new Error(`Could not read ${file.name}.`));
      reader.readAsDataURL(file);
    }),
  })));
}
