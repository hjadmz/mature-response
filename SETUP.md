# Setup

A one-time setup, then double-click to run. No coding required.

## 1. Install the two prerequisites (once)

1. **Node.js** — <https://nodejs.org> · download the **LTS** version and run the installer.
2. **Ollama** — <https://ollama.com> · download and install. It runs quietly in the background.

## 2. Add a model (once)

Open **Terminal** (macOS) or **Command Prompt** (Windows) and run:

```bash
ollama pull llama3:8b
```

That downloads the local AI (a few GB, one time). You can pull other models later — they appear in the app's **Model** menu automatically.

## 3. Run it

- **macOS** — double-click **`start.command`**
- **Windows** — double-click **`start.bat`**

The first run installs and builds (a minute or two). After that it starts quickly and your browser opens to the app on its own.

**macOS, first launch only:** because the launcher is a script, macOS asks before running it the first time. Right-click `start.command` → **Open** → **Open**; or approve it under **System Settings → Privacy & Security → Open Anyway**. You only do this once.

**Always-works fallback (any OS, no approval needed):** open a terminal in this folder and run `npm install`, then `npm run dev`, and visit <http://localhost:3000>.

---

**If you see "the model ran out of memory":** pick a smaller model from the **Model** menu in the app. Large models (like a 70B) need a lot of RAM. `llama3:8b` works on most machines.

**Your data stays yours.** Everything runs on this computer. Nothing is uploaded.
