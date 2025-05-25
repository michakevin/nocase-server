# Geplante Änderungen für **nocase-server**

> Version v1.2.0 – Fokus auf lokale Entwicklungs‑Setups (ohne Gzip/Brotli)

---

## 1 HEAD‑Requests korrekt behandeln
**Problem**  
Bei `HEAD`‑Anfragen öffnet der Server derzeit den File‑Stream und sendet potentiell einen Body.  
**Änderung**  
* Prüfen `if (req.method === 'HEAD')` **vor** dem `createReadStream`.  
* Nur Header senden, `res.end()` aufrufen, kein Stream öffnen.  
**Nutzen**  
RFC‑konform, ein Syscall weniger, verhindert unnötige File‑Handles.

---

## 2 Symlink‑Escape auch auf Dateiebene blockieren
**Problem**  
Ein nicht‑verzeichneter Symlink wie `/img/real → ../../secret.txt` kann nach dem aktuellen Directory‑Filter noch ausgeliefert werden.  
**Änderung**  
* Nach der finalen Auflösung mit `fs.realpath()` prüfen, ob der Pfad weiterhin innerhalb von `root` liegt.  
* Bei Verstoß `404` zurückgeben.  
**Nutzen**  
Schließt verbliebene Ausbruchsmöglichkeit, erhöht Sicherheit.

---

## 3 Option „--cache &lt;n&gt;“ für LRU‑Größe
**Problem**  
Fixe Cache‑Größe (2 000 Einträge) kann bei sehr großen Projekten zu Fehl‑Treffern führen oder bei Mini‑Projekten unnötig Speicher belegen.  
**Änderung**  
* Neues CLI‑Flag `--cache <n>` (Default weiter 2 000).  
* Wert `0` deaktiviert Cache.  
**Nutzen**  
Feinjustage für Performance bzw. Speicherverbrauch.

---

## 4 Lesbare 404‑Antworten
**Problem**  
Derzeit reiner Text „Not found“, ohne MIME‑Type.  
**Änderung**  
* `Content‑Type: text/plain; charset=utf-8` setzen.  
* Optionale simple HTML‑Fallback („404 – File not found“), abschaltbar via Flag `--plain-404`.  
**Nutzen**  
Besseres Debugging, eindeutigere Browseranzeige.

---

## 5 README‑Korrekturen & Konsistenz
1. Port‑Beispiele vereinheitlichen (8080 vs. 3000).  
2. Hinweis: **Nur ASCII‑basierte Case‑Folding**; Umlaute ≠ Ignored.  
3. Docker‑Snippet ergänzen.  

**Nutzen**  
Verhindert Verwirrung, stellt Erwartungs­management sicher.

---

## 6 Range‑Header (Byte‑Ranges) minimal unterstützen _(optional)_
**Problem**  
Electron/NW.js streamen Media-Dateien oft per Range. Ohne Support kommt statt Video ein Fehler.  
**Änderung**  
* Einfache Parsing‑Routine für `Range: bytes=` einbauen (nur einzelne Ranges; 206/416).  
**Nutzen**  
Größere Kompatibilität mit Multimedia‑Apps.  
**Einfluss**  
Reine Lokalfunktion, kein zusätzlicher Build‑Schritt.

---

## 7 Barrel‑Export „index.js“
**Problem**  
User müssen `import { createHandler } from 'nocase-server/src/server.js'` schreiben.  
**Änderung**  
* Neues Root‑Modul `index.js` mit Re‑Exports (`export * from './src/server.js'`).  
**Nutzen**  
Sauberere API, Auto‑Completion ohne Pfad‑Raten.

---

## 8 Test‑Suite er­wei­tern
* **HEAD ohne Body** – assert `content-length` unverändert, `body.length === 0`.  
* **Symlink‑In‑Tiefe** – Szenario aus Punkt 2.  
* **Cache‑Hit** – Mock `fs.opendir`, zweimaliger Request → einmaliger Call.  
* **Unicode‑Datei** _(falls Feature ergänzt wird)_.  

**Nutzen**  
Verhindert Regressionen, dokumentiert erwartetes Verhalten.

---

*Stand: 25. Mai 2025*  
