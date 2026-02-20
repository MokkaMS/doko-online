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

Das Projekt kann mit einem einzigen Befehl installiert und gestartet werden. Dieser Befehl installiert alle Abhängigkeiten, baut das Frontend und startet den Server, der das Spiel bereitstellt.

### 1. Repository klonen

```bash
git clone https://github.com/MokkaMS/doko-online.git
cd doppelkopf-game
```

### 2. Spiel starten

Führen Sie im Hauptverzeichnis folgenden Befehl aus:

```bash
npm start
```

Dieser Vorgang kann beim ersten Mal einige Minuten dauern, da sowohl Frontend- als auch Backend-Abhängigkeiten installiert und gebaut werden.

Sobald der Prozess abgeschlossen ist, ist das Spiel unter folgender Adresse erreichbar:
`http://localhost:5173`

## Installation mit Docker

Alternativ zur manuellen Installation können Sie das Spiel auch in einem Docker-Container ausführen.

### Voraussetzungen

- [Docker](https://www.docker.com/) und [Docker Compose](https://docs.docker.com/compose/) müssen installiert sein.

### Starten

Führen Sie im Hauptverzeichnis folgenden Befehl aus:

```bash
docker-compose up --build -d
```

Das Spiel ist anschließend unter `http://localhost:5173` erreichbar.

Um den Container zu stoppen, verwenden Sie:

```bash
docker-compose down
```

## Technologien

- **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), TypeScript
- **Backend**: [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), [Socket.IO](https://socket.io/)
- **Kommunikation**: Echtzeit-Datenübertragung via WebSockets.

## Bekannte Probleme (Known Issues)

- **UI-Positionierung**: Die Position der Spieler am Tisch ist statisch und passt sich bei sehr kleinen Bildschirmen (Mobile) möglicherweise nicht optimal an.
- **Speicherung**: Es gibt keine Datenbankanbindung. Spielstände und Statistiken werden nur im Arbeitsspeicher gehalten und gehen verloren, wenn der Server neu gestartet wird.
- **Bots**: Die Computergegner spielen nach einer einfachen Heuristik und können komplexe Spielsituationen nicht immer optimal lösen.
- **Chat**: Es gibt aktuell keine Chat-Funktion im Multiplayer-Modus.

## Lizenz

Dieses Projekt wurde zu Lern- und Demonstrationszwecken erstellt.
