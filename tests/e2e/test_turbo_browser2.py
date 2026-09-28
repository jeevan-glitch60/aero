from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, slow_mo=50)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    
    js_errors = []
    
    page.on("console", lambda msg: print(f"  CONSOLE [{msg.type}]: {msg.text[:200]}") if msg.type in ('error', 'warning') else None)
    page.on("pageerror", lambda exc: js_errors.append(f"JS ERROR: {exc.message}\n  Stack: {exc.stack}") if "position" in exc.message else js_errors.append(f"JS ERROR: {exc.message}"))
    
    print("Navigating to http://localhost:8000/...")
    page.goto("http://localhost:8000/", wait_until="domcontentloaded")
    page.wait_for_timeout(2000)
    
    print("\nSwitching to Engine 3D tab...")
    page.click("[data-tab='engine3d']")
    page.wait_for_timeout(3000)
    
    print(f"\nBefore turbo switch - 3D canvas exists: {page.query_selector('#engine3d-canvas') is not None}")
    rpm_el = page.query_selector('#sim-hud-rpm-val')
    print(f"Before turbo switch - RPM: {rpm_el.inner_text() if rpm_el else 'N/A'}")
    
    # Get initial model state
    initial_type = page.evaluate("window.engine3DView?.currentEngineType || 'unknown'")
    print(f"Current engine type: {initial_type}")
    
    # Click turbo engine card
    print("\nClicking Turbo engine card...")
    turbo_btn = page.query_selector('button[data-engine="TURBO_INLINE_V"]')
    if turbo_btn:
        turbo_btn.click()
        page.wait_for_timeout(4000)
    else:
        print("Turbo card NOT found!")
        # Try clicking the card div itself
        turbo_card = page.query_selector('div[data-engine="TURBO_INLINE_V"]')
        if turbo_card:
            turbo_card.click()
            page.wait_for_timeout(4000)
        else:
            print("Turbo card div also NOT found!")
    
    # Check state after switch
    after_type = page.evaluate("window.engine3DView?.currentEngineType || 'unknown'")
    print(f"\nAfter switch - engine type: {after_type}")
    
    rpm = page.query_selector('#sim-hud-rpm-val')
    print(f"After switch - RPM: {rpm.inner_text() if rpm else 'N/A'}")
    
    arch_badge = page.query_selector('#telemetry-arch-badge')
    print(f"After switch - Arch badge: {arch_badge.inner_text() if arch_badge else 'N/A'}")
    
    boost_card = page.query_selector('#sim-card-boost_pressure')
    print(f"After switch - Boost card exists: {boost_card is not None}")
    
    status_badge = page.query_selector('#sim-status-badge')
    print(f"After switch - Status badge: {status_badge.inner_text() if status_badge else 'N/A'}")
    
    # Check for any console errors
    print(f"\nTotal JS errors captured: {len(js_errors)}")
    for e in js_errors:
        print(f"  {e}")
    
    # Try to evaluate if the model exists
    try:
        model_check = page.evaluate("""() => {
            const view = window.engine3DView;
            if (!view) return 'No engine3DView';
            if (!view.model) return 'No model';
            if (!view.model.activeModel) return 'No activeModel';
            return `Model: ${view.model.activeModel.constructor.name}, EngineType: ${view.model.activeEngineType}`;
        }""")
        print(f"Model check: {model_check}")
    except e:
        print(f"Model check failed: {e}")
    
    # Try to evaluate if the sim exists and is running
    try:
        sim_check = page.evaluate("""() => {
            const view = window.engine3DView;
            if (!view || !view.sim) return 'No sim';
            return `Sim running: ${view.sim.status}, EngineType: ${view.sim.activeEngineType}`;
        }""")
        print(f"Sim check: {sim_check}")
    except e:
        print(f"Sim check failed: {e}")
    
    browser.close()
    print(f"\n=== Done ===")
