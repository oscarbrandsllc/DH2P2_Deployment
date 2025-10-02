import asyncio
from playwright.sync_api import sync_playwright, expect

def verify_trade_preview_fix():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Navigate to the local rosters page
        page.goto("file:///app/DHP2_DeployDraft2.11/rosters/rosters.html")

        # 2. Set username and fetch rosters
        page.fill("#usernameInput", "The_Oracle")
        page.click("#fetchRostersButton")

        # 3. Wait for leagues to load and select the first one
        expect(page.locator("#leagueSelect")).not_to_be_disabled(timeout=30000)
        page.select_option("#leagueSelect", index=1)

        # 4. Wait for roster grid to populate and ensure one team is pre-selected
        expect(page.locator(".roster-column")).to_have_count(12, timeout=30000)
        expect(page.locator(".team-compare-checkbox.selected")).to_have_count(1)

        # 5. Click one unselected team to enter trade preview mode
        page.locator(".team-header-item:not(:has(.team-compare-checkbox.selected))").nth(0).click()

        # 6. Wait for a second team to be selected
        expect(page.locator(".team-compare-checkbox.selected")).to_have_count(2, timeout=10000)

        # 7. Wait for trade preview to appear and take a screenshot
        expect(page.locator("#tradeSimulator")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/01_trade_preview_active.png")

        # 8. Click one of the selected teams to exit trade preview mode
        page.locator(".team-header-item:has(.team-compare-checkbox.selected)").nth(0).click()

        # 9. Wait for only one team to be selected
        expect(page.locator(".team-compare-checkbox.selected")).to_have_count(1)

        # 10. Wait for trade preview to disappear and take a screenshot
        expect(page.locator("#tradeSimulator")).to_be_hidden()

        # 11. Check that the page is scrolled to the top
        page.wait_for_timeout(500) # allow for scroll to happen
        page.screenshot(path="jules-scratch/verification/02_trade_preview_closed.png")

        browser.close()

if __name__ == "__main__":
    verify_trade_preview_fix()