"""Inspect/activate only the Ioruba tray belonging to the supplied test config."""
import json
import sys
from gi.repository import Gio, GLib

bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)

def call(destination, object_path, interface, method, signature, values):
    return bus.call_sync(destination, object_path, interface, method,
                         GLib.Variant(signature, values), None, 0, 3000, None).unpack()

def find_label(node, label):
    if node[1].get("label") == label:
        return node[0]
    for child in node[2]:
        found = find_label(child, label)
        if found is not None:
            return found
    return None

items = call("org.kde.StatusNotifierWatcher", "/StatusNotifierWatcher",
             "org.freedesktop.DBus.Properties", "Get", "(ss)",
             ("org.kde.StatusNotifierWatcher", "RegisteredStatusNotifierItems"))[0]
for item in items:
    destination, _, object_path = item.partition("/")
    try:
        properties = call(destination, "/" + object_path, "org.freedesktop.DBus.Properties",
                          "GetAll", "(s)", ("org.kde.StatusNotifierItem",))[0]
        if properties.get("Title") != "ioruba-desktop":
            continue
        pid = call("org.freedesktop.DBus", "/org/freedesktop/DBus", "org.freedesktop.DBus",
                   "GetConnectionUnixProcessID", "(s)", (destination,))[0]
        with open(f"/proc/{pid}/environ", "rb") as environ:
            if ("XDG_CONFIG_HOME=" + sys.argv[1]).encode() not in environ.read().split(b"\0"):
                continue
        menu = properties["Menu"]
        layout = call(destination, menu, "com.canonical.dbusmenu", "GetLayout",
                      "(iias)", (0, -1, []))[1]
    except GLib.Error:
        continue
    if len(sys.argv) > 2:
        target = find_label(layout, sys.argv[2])
        assert target is not None, "Tray menu item absent"
        call(destination, menu, "com.canonical.dbusmenu", "Event", "(isvu)",
             (target, "clicked", GLib.Variant("i", 0), 0))
    print(json.dumps({"pid": pid, "item": item, "layout": layout}))
    break
else:
    raise RuntimeError("No Ioruba tray matches the isolated test configuration")
