module("luci.controller.vohive", package.seeall)

local function vohive_running()
    return os.execute("netstat -tln 2>/dev/null | grep -q ':7575'") == 0
end

function index()
    entry({"admin", "modem", "vohive"}, call("render_vohive"), _("VoHive"), 60).leaf = true
end

function render_vohive()
    luci.template.render("vohive/index", { running = vohive_running() })
end
