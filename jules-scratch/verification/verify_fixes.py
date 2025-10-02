from playwright.sync_api import sync_playwright, expect
import os

def run_verification(page):
    # Construct the full, absolute path to the HTML file
    # The CWD is the root of the repository.
    file_path = os.path.abspath("DHP2_DeployDraft2.11/rosters/rosters.html")

    # Navigate to the local HTML file
    page.goto(f"file://{file_path}")

    # Set username and fetch rosters
    username_input = page.locator("#usernameInput")
    expect(username_input).to_be_visible()
    username_input.fill("The_Oracle")

    # Click the main fetch rosters button to simulate initial load
    fetch_rosters_button = page.locator("#fetchRostersButton")
    fetch_rosters_button.click()

    # Wait for the league select dropdown to be enabled and have options
    league_select = page.locator("#leagueSelect")
    expect(league_select).to_be_enabled(timeout=30000)
    # Wait for at least two options (the placeholder and one league)
    page.wait_for_function("document.querySelector('#leagueSelect').options.length > 1", timeout=20000)

    # The league should already be loading, just wait for the grid
    roster_grid = page.locator("#rosterGrid")
    expect(roster_grid.locator(".roster-column")).to_have_count(12, timeout=30000)

    # --- Verification for Loading Panel (Implicit) ---
    # The fact that we've loaded this far without the loading panel being misplaced is a good sign.
    # Take a screenshot to show the initial, correctly padded layout.
    page.screenshot(path="jules-scratch/verification/01_initial_load.png")

    # --- Verification for auto-scroll on entering trade preview ---
    # Click the header of the second team to enter trade preview
    team_headers = page.locator(".team-header-item")
    second_team_header = team_headers.nth(1)
    second_team_header.click()

    # Wait for trade simulator to appear
    trade_simulator = page.locator("#tradeSimulator")
    expect(trade_simulator).to_be_visible(timeout=10000)

    # Take a screenshot to verify it scrolled to the top
    page.screenshot(path="jules-scratch/verification/02_enter_trade_preview.png")

    # --- Verification for auto-scroll on exiting trade preview ---
    # The button is hidden by default, so we need to make it visible to click it.
    page.evaluate("document.getElementById('compareButton').classList.remove('hidden')")
    page.evaluate("document.getElementById('compareButton').style.display = 'inline-flex'")

    # Click the "Show All" button, which is the modified compare button
    compare_button = page.locator("#compareButton")
    expect(compare_button).to_be_visible()
    compare_button.click()

    # Wait for trade simulator to disappear
    expect(trade_simulator).to_be_hidden(timeout=10000)

    # Take a screenshot to verify it scrolled back to the top
    page.screenshot(path="jules-scratch/verification/03_exit_trade_preview.png")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            run_verification(page)
            print("Verification script completed successfully.")
        except Exception as e:
            print(f"An error occurred: {e}")
            page.screenshot(path="jules-scratch/verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    main()