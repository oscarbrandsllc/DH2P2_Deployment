import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Get the absolute path to the HTML file
        file_path = os.path.abspath("DHP2_DeployDraft2.11/rosters/rosters.html")

        await page.goto(f"file://{file_path}")

        # Input username
        await page.locator("#usernameInput").fill("the_oracle")

        # Click the fetch rosters button
        await page.locator("#fetchRostersButton").click()

        # Wait for the roster grid to be populated
        await expect(page.locator("#rosterGrid .roster-column")).to_have_count(12, timeout=60000)

        # Adjust sticky headers - this is a bit of a hack to re-trigger the JS logic
        await page.evaluate("window.adjustStickyHeaders()")

        # Scroll down to test the sticky headers
        await page.evaluate("window.scrollTo(0, 500)")

        # Wait for scroll to take effect
        await page.wait_for_timeout(500)

        # Take a screenshot
        await page.screenshot(path="jules-scratch/verification/verification.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())