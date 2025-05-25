# nocase-server

**Lightweight static HTTP server for development that resolves file paths case‑insensitively.**  
Perfect when you run Windows‑centric web projects (e.g. NW.js, Electron, RPG Maker) on a
case‑sensitive OS such as Linux or macOS and keep getting 404 errors due to mismatched
filename casing.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🔍 **Case‑insensitive lookup** | Every path segment is matched ignoring letter case, so `/img/logo.png`, `/IMG/Logo.PNG`, `/img/LOGO.png` all resolve to the same file. |
| ⚡ **Zero configuration** | Point it to a folder, optional `-p` for the port, done. |
| 🎯 **SPA‑friendly** | If the requested file is not found, `index.html` is served, so React/Angular/Vue routers work out‑of‑the‑box. |
| 📦 **Tiny dependency tree** | Only depends on the `mime` package (for proper `Content‑Type` headers). |
| 🛠️ **Node ≥ 18** | Uses native ES modules – no transpiler required. |

---

## 🚀 Installation

### Global (recommended)

```bash
npm install -g nocase-server
```

### Local development

```bash
git clone https://github.com/your-name/nocase-server.git
cd nocase-server
npm install
npm link        # makes the 'nocase-server' command globally available
```

> **Note**: Replace `your-name` with your GitHub handle or download location.

---

## 🏃‍♂️ Quick Start

```bash
# serve the current directory on port 8080
nocase-server

# serve the 'www' folder on port 3000
nocase-server www -p 3000
```

Open <http://localhost:8080> (or the port you chose) in your browser.

---

## 🛠️ CLI Options

| Flag | Default | Description |
|------|---------|-------------|
| `<folder>` | `.` | Root directory to serve. |
| `-p <port>` | `8080` | Port to listen on. Can also be set via the `PORT` environment variable. |
| `-h, --help` | — | Show a short help message. |

---

## 🤔 Why not just use `http-server`?

`http-server` (and most other static servers) rely on the underlying file system to
locate a file, so `index.html` ≠ `Index.html`. On Windows this doesn’t matter, but on Linux
the lookup fails.  
`nocase-server` walks the directory tree manually and matches each segment in a
case‑insensitive way, giving you the best of both worlds.

---

## 🧩 How it works

```text
request → split path → for each segment: readdir + case‑insensitive match → stream file
```

The entire logic fits in ≈ 60 lines of plain Node 18 and is easy to audit or extend
(gzip, Brotli, directory listing, CORS, etc.).

---

## 👐 Contributing

1. Fork the repo  
2. `npm install`  
3. Create a branch and hack away  
4. Open a pull request

PRs for performance improvements, additional CLI flags or better docs are welcome!

---

## 📄 License

MIT © 2025 Micha Starke
