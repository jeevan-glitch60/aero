from playwright.sync_api import sync_playwright, sync_playwright as sp

with sp() as p:
    browser = p.chromium.launch(headless=False, slow_mo=100)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    
    errors = []
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}"))
    page.on("pageerror", lambda exc: errors.append(f"PAGE ERROR: {exc.message}"))
    
    print("Navigating to http://localhost:8000/...")
    page.goto("http://localhost:8000/", wait_until="domcontentloaded")
    
    # Wait for the app to initialize
    page.wait_for_timeout(2000)
    
    # Check console for errors during initial load
    print(f"\nConsole messages during load: {len(errors)}")
    for e in errors[-20:]:
        print(f"  {e}")
    
    # Switch to engine3d tab
    print("\nSwitching to Engine 3D tab...")
    page.click("[data-tab='engine3d']")
    page.wait_for_timeout(3000)
    
    print(f"\nConsole after engine3d tab: {len(errors)}")
    for e in errors[-10:]:
        print(f"  {e}")
    
    # Check if 3D canvas exists
    canvas = page.query_selector("#engine3d-canvas")
    if canvas:
        print("\n3D canvas found!")
        bbox = canvas.bounding_box()
        print(f"Canvas size: {bbox['width']}x{bbox['height']}")
    else:
        print("\n3D canvas NOT found!")
    
    # Now switch to Turbo engine
    print("\nClicking Turbo engine card...")
    turbo_card = page.query_selector('[data-engine="TURBO_INLINE_V"]')
    if turbo_card:
        turbo_card.click()
        page.wait_for_timeout(3000)
    else:
        print("Turbo card NOT found!")
    
    print(f"\nConsole after turbo switch: {len(errors)}")
    for e in errors[-20:]:
        print(f"  {e}")
    
    # Check RPM display for turbo
    rpm_val = page.query_selector("#sim-hud-rpm-val")
    if rpm_val:
        print(f"\nRPM display: {rpm_val.inner_text()}")
    
    # Check if turbo telemetry cards exist
    boost_card = page.query_selector("#sim-card-boost_pressure")
    if boost_card:
        print("Boost pressure card found!")
    else:
        print("Boost pressure card NOT found!")
    
    # Check status badge
    status_badge = page.query_selector("#sim-status-badge")
    if status_badge:
        print(f"Status badge: {status_badge.inner_text()}")
    
    # Check active engine
    arch_badge = page.query_selector("#telemetry-arch-badge")
    if arch_badge:
        print(f"Arch badge: {arch_badge.inner_text()}")
    
    browser.close()
    
    print(f"\n=== Total console errors/messages: {len(errors)} ===")
    if errors:
        print("\nAll captured messages:")
        for e in errors:
            print(f"  {e}")
