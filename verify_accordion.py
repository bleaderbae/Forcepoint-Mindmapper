from playwright.sync_api import sync_playwright, expect
import time

def verify_accordion():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        # Capture console messages
        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))

        # Load the page
        print("Loading page...")
        page.goto("http://localhost:8080/index.html")
        page.wait_for_selector("svg g.nodes")
        time.sleep(2)

        print("Zooming out to fit nodes...")
        zoom_out_btn = page.locator("button[title='Zoom Out']")
        for _ in range(3):
            zoom_out_btn.click()
            time.sleep(0.5)

        print("Attempting to click DLP...")
        dlp = page.locator("g.node", has_text="DLP").first
        dlp.click(force=True)
        time.sleep(2)

        # Verify On-prem visible
        on_prem = page.locator("g.node", has_text="On-prem").first
        expect(on_prem).to_be_visible()
        print("DLP expanded. On-prem visible.")

        # Expand "Email Security" (Sibling of DLP)
        email_sec = page.locator("g.node", has_text="Email Security").first
        print("Expanding Email Security (Sibling)...")
        email_sec.click(force=True)
        time.sleep(2)

        # Verify Accordion: DLP children should be collapsed...
        # Check console output for "Collapsing sibling: DLP"

        page.screenshot(path="verification_accordion.png")
        print("Screenshot saved.")

        browser.close()

if __name__ == "__main__":
    verify_accordion()
