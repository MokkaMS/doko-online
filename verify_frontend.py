from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:5173")

            # Check Title
            page.wait_for_selector("h1:has-text('DOPPELKOPF')")
            print("Found Title.")

            # Click Multiplayer
            page.click("text=Multiplayer")

            # Enter Name
            print("Entering name...")
            page.fill("input[value='']", "Tester")

            # Create Game
            print("Creating game...")
            page.click("text=Neues Spiel erstellen")

            # Wait for Waiting Room
            page.wait_for_selector("text=WARTERAUM")
            print("In Waiting Room.")

            # Start Game
            print("Starting game...")
            page.click("text=Spiel Starten")

            # Wait for Game Table
            page.wait_for_selector("text=DOPPELKOPF - Vorbehalt wählen")
            print("Game Started. Phase: Bidding.")

            # Wait for Bots to bid (I am Player 0, Dealer. Bots are 1, 2, 3. Forehand is 1. So Bots bid first.)
            print("Waiting for my turn to bid (Bots are bidding)...")

            # Wait for Fleischlos button to appear (it only appears when it is my turn)
            # Timeout 10s should be enough for 3 bots * 0.5s delay
            page.wait_for_selector("text=Fleischlos", timeout=10000)
            print("My turn! Fleischlos button visible.")

            # Click Farben-Solo
            print("Clicking Farben-Solo...")
            page.click("text=Farben-Solo")

            # Check for Suits
            page.wait_for_selector("text=Herz ♥")
            print("Suit buttons visible.")

            # Take Screenshot
            page.screenshot(path="verification_frontend.png")
            print("Screenshot saved.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="error.png")
            raise
        finally:
            browser.close()

if __name__ == "__main__":
    run()
