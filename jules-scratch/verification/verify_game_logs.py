import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-web-security"]
        )
        page = await browser.new_page()

        # Listen for console events
        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))

        # Go to the local server URL
        print("Navigating to page...")
        await page.goto('http://localhost:8080/rosters/rosters.html')

        # Fill the username input
        print("Entering username...")
        await page.locator('#usernameInput').fill('The_Oracle')

        # Click the "Rosters" button to load data
        print("Clicking 'Fetch Rosters' button...")
        await page.locator('#fetchRostersButton').click()

        # Wait for the roster grid to be populated with at least one player
        print("Waiting for roster grid to be populated...")
        await page.wait_for_selector('#rosterGrid .player-row', timeout=60000)
        print("Roster grid populated.")

        # Click on the first player's name to open the game logs modal
        print("Clicking on first player...")
        await page.locator('.player-name-clickable').first.click()

        # Wait for the modal to appear
        print("Waiting for modal...")
        await page.wait_for_selector('#game-logs-modal', state='visible')
        print("Modal visible.")

        # Make modal wider to see all columns
        await page.evaluate("document.querySelector('#game-logs-modal .modal-content').style.width = '95vw'")
        await page.evaluate("document.querySelector('#game-logs-modal .modal-content').style.maxWidth = 'none'")

        # Take a screenshot of the game logs modal content
        print("Taking screenshot...")
        modal_content = page.locator('#game-logs-modal .modal-content')
        await modal_content.screenshot(path='jules-scratch/verification/verification.png')
        print("Screenshot taken.")

        await browser.close()
        print("Browser closed.")

if __name__ == '__main__':
    asyncio.run(main())