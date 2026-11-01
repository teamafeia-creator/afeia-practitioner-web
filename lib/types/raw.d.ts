// Import de fichiers texte bruts (ex. content/consents/*.md?raw) : webpack (next.config.mjs) et vite (tests).
declare module '*?raw' {
  const content: string;
  export default content;
}
