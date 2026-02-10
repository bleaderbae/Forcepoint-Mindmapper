from playwright.sync_api import sync_playwright, expect
import time
import os

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        # Load the page
        print("Loading page...")
        page.goto("http://localhost:8080/index.html")
        page.wait_for_selector("svg g.nodes")
        time.sleep(2)

        # Take initial screenshot
        os.makedirs("verification", exist_ok=True)
        page.screenshot(path="verification/initial.png")

        print("Inspecting Root Node...")
        # Root node usually has text "Forcepoint"
        root_node = page.locator("g.node", has_text="Forcepoint").first

        if root_node.count() > 0:
            print("Root node found.")
            # Click root node to select it
            root_node.click(force=True)
            time.sleep(1)
            page.screenshot(path="verification/root_selected.png")

            # Check for details-container
            details = root_node.locator(".details-container")
            if details.count() > 0:
                html_content = details.inner_html()
                print("Details HTML content:")
                print(html_content)

                # Verify it contains "Forcepoint"
                if "Forcepoint" in html_content:
                    print("Verification Passed: Root node details visible.")
                else:
                    print("Verification Failed: Root node details content mismatch.")
            else:
                print("Verification Failed: No details-container found in root node.")
        else:
            print("Verification Failed: Root node not found.")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
