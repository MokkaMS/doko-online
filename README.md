# Doppelkopf (React + Node.js)

Willkommen zu dieser webbasierten Implementierung des beliebten Kartenspiels **Doppelkopf**. Diese Anwendung ermöglicht es Ihnen, Doppelkopf direkt im Browser zu spielen, entweder gegen Computergegner (Bots) oder online mit Freunden im Multiplayer-Modus.

## Features

- **Spielmodi**:
    - **Einzelspieler**: Spielen Sie sofort gegen 3 Computergegner.
    - **Multiplayer**: Erstellen Sie private Räume und spielen Sie mit Freunden. Fehlende Spieler können durch Bots aufgefüllt werden.
- **Regelwerk**:
    - Unterstützt **Normalspiel**, **Hochzeit**, **Damen-Solo**, **Buben-Solo**, **Farben-Solo** und **Fleischlos**.
    - Automatische Erkennung von Re/Kontra-Parteien.
    - Sonderpunkte: **Fuchs gefangen**, **Karlchen am End**, **Doppelkopf** (>40 Augen).
- **Einstellungen**:
    - Konfigurierbare Regeln (z.B. "Mit Neunen", "Dullen als höchste Trümpfe", "Schweinchen").
- **Benutzeroberfläche**:
    - Intuitive Bedienung per Mausklick.
    - Anzeige von Punkten, Ansagen und gespielten Stichen.
    - Visuelle Darstellung der Karten und des Spieltischs.

## Installation & Start

Um das Projekt lokal auszuführen, benötigen Sie [Node.js](https://nodejs.org/) (Version 18 oder neuer empfohlen).

Das Projekt besteht aus zwei Teilen: dem **Frontend** (React) und dem **Backend** (Node.js Server). Beide müssen gleichzeitig laufen.

### 1. Repository klonen

```bash
git clone https://github.com/MokkaMS/doko-online.git
cd doppelkopf-game
```

### 2. Backend starten

Der Server verwaltet die Spielzustände und Multiplayer-Verbindungen. Öffnen Sie ein Terminal und navigieren Sie in den `server`-Ordner:

```bash
cd server
npm install
npm start
```
Der Server läuft nun auf `http://localhost:3001`.

### 3. Frontend starten

Die Benutzeroberfläche wird mit Vite gestartet. Öffnen Sie ein **zweites, neues** Terminal im Hauptverzeichnis des Projekts:

```bash
npm install
npm run dev
```
Das Frontend ist nun unter der im Terminal angezeigten Adresse erreichbar (meist `http://localhost:5173`). Öffnen Sie diese Adresse in Ihrem Browser.

## Technologien

- **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), TypeScript
- **Backend**: [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), [Socket.IO](https://socket.io/)
- **Kommunikation**: Echtzeit-Datenübertragung via WebSockets.

## Bekannte Probleme (Known Issues)

- **Verbindung**: Die Server-Adresse ist im Code derzeit fest auf `http://localhost:3001` eingestellt (`src/context/GameContext.tsx`). Für einen Betrieb im Netzwerk oder Internet muss diese Adresse angepasst werden.
- **UI-Positionierung**: Die Position der Spieler am Tisch ist statisch und passt sich bei sehr kleinen Bildschirmen (Mobile) möglicherweise nicht optimal an.
- **Speicherung**: Es gibt keine Datenbankanbindung. Spielstände und Statistiken werden nur im Arbeitsspeicher gehalten und gehen verloren, wenn der Server neu gestartet wird.
- **Bots**: Die Computergegner spielen nach einer einfachen Heuristik und können komplexe Spielsituationen nicht immer optimal lösen.
- **Chat**: Es gibt aktuell keine Chat-Funktion im Multiplayer-Modus.

## Lizenz

Dieses Projekt wurde zu Lern- und Demonstrationszwecken erstellt.
