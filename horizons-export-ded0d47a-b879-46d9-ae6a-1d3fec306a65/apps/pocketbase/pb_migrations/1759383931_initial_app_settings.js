/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    let settings = app.settings()

    settings.meta.appName = "Vouza AI"
    settings.meta.appURL = "https://pb.vouza.ai"
    // Was true under Horizons, which supplied its own hosted admin dashboard
    // (see the now-removed external-dashboard.pb.js hook). Self-hosted,
    // PocketBase's own built-in admin UI at /_/ is the only management UI
    // there is, so it needs to stay reachable.
    settings.meta.hideControls = false

    settings.logs.maxDays = 7
    settings.logs.minLevel = 8
    settings.logs.logIP = true
    
    settings.trustedProxy.headers = [
        "X-Real-IP",
        "X-Forwarded-For",
        "CF-Connecting-IP",
    ]

    app.save(settings)
})
