# 🚦 Copilot Guidelines für `nocase-server`

**Repo-Kurzbeschreibung**  
Dies ist ein extrem schlanker Node-18 ESM-Server, der statische Dateien
_case-insensitiv_ ausliefert (< 70 LOC, nur Abhängigkeit **mime@^4**).

---

## Coding-Regeln

1. **ES Modules only** – keine `require`, kein CommonJS.
2. Verwende ausschliesslich Node-Standard-APIs (`http`, `fs`, `path`).
3. Fehler → sofortige `res.writeHead(404)` und `return`.
4. Niemals ganze Dateien puffern – **Streams** nutzen!
5. Keine neuen Dependencies ohne triftigen Grund.
6. Kommentare & Identifier **englisch**, Commit-Messages `feat|fix|docs:` Schema.
7. Immer Tests mit **Jest + supertest** unter `__tests__/` anlegen.
8. Änderungen ➜ README & `package.json`-Version (semver) aktualisieren.
9. Halte PRs ≤ 400 LOC; größere Änderungen bitte aufteilen.

---

## Agent-Mode Tasks (Beispiele)

- `#task` _»Füge gzip-/brotli-Kompression hinzu und aktualisiere README«_
- `#task` _»Schreibe Unit-Tests für resolveNocase()«_

---

_Ignore paths_: `node_modules`, `.git`, `dist`, `*.log`
