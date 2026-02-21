# Doppelkopf

Willkommen zu dieser webbasierten Implementierung des beliebten Kartenspiels **Doppelkopf**. Diese Anwendung ermöglicht es Ihnen, Doppelkopf direkt im Browser mit Freunden oder gegen Computergegner (Bots) zu spielen.

## Features

- **Multiplayer**: Erstellen Sie private Spielräume und laden Sie Freunde über eine Raum-ID ein.
- **Bots**: Fehlende Mitspieler können jederzeit durch Computergegner aufgefüllt werden. Auch reine Bot-Runden (1 Spieler gegen 3 Bots) sind möglich.
- **Spielregeln**:
    - Unterstützt **Normalspiel**, **Hochzeit**, **Damen-Solo**, **Buben-Solo**, **Farben-Solo** und **Fleischlos**.
    - Automatische Erkennung von Re/Kontra-Parteien.
    - Sonderpunkte: **Fuchs gefangen**, **Karlchen am End**, **Doppelkopf** (>40 Augen).
    - Pflichtansagen (Re/Kontra) vor der zweiten eigenen Karte.
- **Benutzeroberfläche**:
    - Intuitive Bedienung per Mausklick oder Touch.
    - **Mobile Unterstützung**: Optimiert für Querformat (Landscape) auf Mobilgeräten.
    - Animationen für ausgespielte Stiche.

## Installation & Start

Um das Projekt lokal auszuführen, benötigen Sie [Node.js](https://nodejs.org/) (Version 18 oder neuer empfohlen).

Das Projekt kann mit einem einzigen Befehl installiert und gestartet werden. Dieser Befehl installiert alle Abhängigkeiten, baut das Frontend und startet den Server.

### 1. Repository klonen

```bash
git clone https://github.com/MokkaMS/doko-online.git
cd doko-online
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

- **Mobile Ausrichtung**: Das Spiel erfordert auf mobilen Geräten das Querformat (Landscape). Ein Warnhinweis blockiert die Ansicht im Hochformat.
- **Speicherung**: Es gibt keine Datenbankanbindung. Spielstände und Statistiken werden nur im Arbeitsspeicher gehalten und gehen verloren, wenn der Server neu gestartet wird.
- **Bots**: Die Computergegner spielen nach einer einfachen Heuristik und können komplexe Spielsituationen nicht immer optimal lösen.
- **Chat**: Es gibt aktuell keine Chat-Funktion im Multiplayer-Modus.
- **Re/Kontra Ansagen**: Ansagen müssen aktuell manuell über Buttons getätigt werden, bevor die zweite Karte gespielt wird.
