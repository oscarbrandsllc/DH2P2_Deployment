from playwright.sync_api import sync_playwright, expect
import os

def run_verification(page, is_mobile=False):
    device_name = "mobile" if is_mobile else "desktop"

    # Construct the full, absolute path to the HTML file
    file_path = os.path.abspath("DHP2_DeployDraft2.11/rosters/rosters.html")
    page.goto(f"file://{file_path}")

    # Set username and fetch rosters
    username_input = page.locator("#usernameInput")
    expect(username_input).to_be_visible()
    username_input.fill("The_Oracle")

    fetch_rosters_button = page.locator("#fetchRostersButton")
    fetch_rosters_button.click()

    # Wait for the league select dropdown to be populated
    league_select = page.locator("#leagueSelect")
    expect(league_select).to_be_enabled(timeout=30000)
    page.wait_for_function("document.querySelector('#leagueSelect').options.length > 1", timeout=20000)

    # Wait for the roster grid to load
    roster_grid = page.locator("#rosterGrid")
    expect(roster_grid.locator(".roster-column")).to_have_count(12, timeout=30000)

    # --- Verification 1: Initial Load & Centering ---
    page.screenshot(path=f"jules-scratch/verification/01_{device_name}_initial_load.png")

    # --- Verification 2: Enter Trade Preview ---
    team_headers = page.locator(".team-header-item")
    second_team_header = team_headers.nth(1)
    second_team_header.click()

    trade_simulator = page.locator("#tradeSimulator")
    expect(trade_simulator).to_be_visible(timeout=10000)

    # Check scroll position after a short delay for the timeout to work
    page.wait_for_timeout(500)
    scroll_y = page.evaluate("window.scrollY")
    if scroll_y > 10: # Allow for small scroll inconsistencies
        raise Exception(f"[{device_name}] Page did not scroll to top on entering trade preview. ScrollY: {scroll_y}")

    page.screenshot(path=f"jules-scratch/verification/02_{device_name}_enter_trade.png")

    # --- Verification 3: Exit Trade Preview ---
    page.evaluate("document.getElementById('compareButton').classList.remove('hidden')")
    page.evaluate("document.getElementById('compareButton').style.display = 'inline-flex'")

    compare_button = page.locator("#compareButton")
    expect(compare_button).to_be_visible()
    compare_button.click()

    expect(trade_simulator).to_be_hidden(timeout=10000)

    # Check scroll position again
    page.wait_for_timeout(500)
    scroll_y_after_exit = page.evaluate("window.scrollY")
    if scroll_y_after_exit > 10:
         raise Exception(f"[{device_name}] Page did not scroll to top on exiting trade preview. ScrollY: {scroll_y_after_exit}")

    page.screenshot(path=f"jules-scratch/verification/03_{device_name}_exit_trade.png")


def main():
    with sync_playwright() as p:
        # --- Desktop Test ---
        print("Running desktop verification...")
        browser_desktop = p.chromium.launch(headless=True)
        page_desktop = browser_desktop.new_page()
        try:
            run_verification(page_desktop, is_mobile=False)
            print("Desktop verification successful.")
        except Exception as e:
            print(f"Desktop verification failed: {e}")
            page_desktop.screenshot(path="jules-scratch/verification/error_desktop.png")
        finally:
            browser_desktop.close()

        # --- Mobile Test ---
        print("\nRunning mobile verification...")
        browser_mobile = p.chromium.launch(headless=True)
        iphone_11 = p.devices['iPhone 11']
        page_mobile = browser_mobile.new_page(**iphone_11)
        try:
            run_verification(page_mobile, is_mobile=True)
            print("Mobile verification successful.")
        except Exception as e:
            print(f"Mobile verification failed: {e}")
            page_mobile.screenshot(path="jules-scratch/verification/error_mobile.png")
        finally:
            browser_mobile.close()

if __name__ == "__main__":
    main()