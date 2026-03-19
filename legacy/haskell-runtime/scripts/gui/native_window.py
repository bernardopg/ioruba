#!/usr/bin/env python3
"""Native GTK window for the live Ioruba GUI."""

from __future__ import annotations

import argparse
import json
import pathlib

import gi

gi.require_version("Gtk", "3.0")

from gi.repository import Gdk, GLib, Gtk  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Open Ioruba GUI in a native GTK window.")
    parser.add_argument("--file", required=False, help="Unused legacy HTML file argument")
    parser.add_argument("--state-file", required=True, help="JSON state file to render")
    parser.add_argument("--title", default="Ioruba GUI", help="Window title")
    parser.add_argument("--width", type=int, default=1280, help="Initial window width")
    parser.add_argument("--height", type=int, default=860, help="Initial window height")
    parser.add_argument("--poll-ms", type=int, default=120, help="Polling interval for state updates")
    return parser


class KeyValueCard(Gtk.Frame):
    def __init__(self, keys: list[str]) -> None:
        super().__init__()
        self.set_shadow_type(Gtk.ShadowType.NONE)
        self.get_style_context().add_class("card")

        self.title_label = Gtk.Label(xalign=0)
        self.title_label.get_style_context().add_class("card-title")

        self.rows: dict[str, Gtk.Label] = {}
        body = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        body.set_border_width(18)
        body.pack_start(self.title_label, False, False, 0)

        for key in keys:
            label = Gtk.Label(xalign=0)
            label.get_style_context().add_class("row-label")

            value = Gtk.Label(xalign=1)
            value.set_line_wrap(True)
            value.set_line_wrap_mode(2)
            value.set_selectable(False)
            value.get_style_context().add_class("row-value")

            row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=16)
            row.get_style_context().add_class("kv-row")
            row.pack_start(label, True, True, 0)
            row.pack_end(value, False, False, 0)
            body.pack_start(row, False, False, 0)
            self.rows[f"{key}:label"] = label
            self.rows[f"{key}:value"] = value

        self.add(body)

    def set_title(self, title: str) -> None:
        self.title_label.set_text(title.upper())

    def set_row(self, key: str, label: str, value: str) -> None:
        self.rows[f"{key}:label"].set_text(label)
        self.rows[f"{key}:value"].set_text(value)


class KnobCard(Gtk.Frame):
    def __init__(self) -> None:
        super().__init__()
        self.set_shadow_type(Gtk.ShadowType.NONE)
        self.get_style_context().add_class("knob-card")

        body = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        body.set_border_width(16)

        header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        left = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        right = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)

        self.knob_id = Gtk.Label(xalign=0)
        self.knob_id.get_style_context().add_class("knob-id")
        self.knob_name = Gtk.Label(xalign=0)
        self.knob_name.get_style_context().add_class("knob-title")
        self.percent = Gtk.Label(xalign=1)
        self.percent.get_style_context().add_class("knob-percent")

        left.pack_start(self.knob_id, False, False, 0)
        left.pack_start(self.knob_name, False, False, 0)
        right.pack_start(self.percent, False, False, 0)
        header.pack_start(left, True, True, 0)
        header.pack_end(right, False, False, 0)

        self.progress = Gtk.ProgressBar()
        self.progress.set_show_text(False)

        self.targets = Gtk.Label(xalign=0)
        self.targets.set_line_wrap(True)
        self.targets.get_style_context().add_class("row-value")

        self.outcome = Gtk.Label(xalign=0)
        self.outcome.set_line_wrap(True)
        self.outcome.get_style_context().add_class("row-value")

        self.raw_value = Gtk.Label(xalign=0)
        self.raw_value.get_style_context().add_class("row-value")

        body.pack_start(header, False, False, 0)
        body.pack_start(self.progress, False, False, 0)
        body.pack_start(self._kv("Alvos", self.targets), False, False, 0)
        body.pack_start(self._kv("Resultado", self.outcome), False, False, 0)
        body.pack_start(self._kv("Bruto", self.raw_value), False, False, 0)
        self.add(body)

    def _kv(self, label_text: str, value_widget: Gtk.Widget) -> Gtk.Box:
        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        row.get_style_context().add_class("kv-row")
        label = Gtk.Label(label=label_text, xalign=0)
        label.get_style_context().add_class("row-label")
        row.pack_start(label, False, False, 0)
        row.pack_end(value_widget, True, True, 0)
        return row

    def update(self, knob: dict, labels: dict) -> None:
        self.knob_id.set_text(f"KNOB {knob.get('id', 0)}")
        self.knob_name.set_text(str(knob.get("name", "")))
        percent = int(knob.get("percent", 0))
        self.percent.set_text(f"{percent}%")
        self.progress.set_fraction(max(0.0, min(1.0, percent / 100.0)))
        self.targets.set_text("  ".join(knob.get("targets", [])) or labels.get("not_available", ""))
        self.outcome.set_text(str(knob.get("outcome", "")))
        self.raw_value.set_text(str(knob.get("raw_value", 0)))

        accent = str(knob.get("accent", "cyan"))
        ctx = self.progress.get_style_context()
        for css_class in ("accent-cyan", "accent-amber", "accent-teal", "accent-rose", "accent-lime"):
            ctx.remove_class(css_class)
        ctx.add_class(f"accent-{accent}")


class NativeWindow:
    def __init__(self, args: argparse.Namespace) -> None:
        self.state_path = pathlib.Path(args.state_file).expanduser().resolve()
        if not self.state_path.exists():
            raise SystemExit(f"State file not found: {self.state_path}")

        self.window = Gtk.Window(title=args.title)
        self.window.set_default_size(args.width, args.height)
        self.window.set_position(Gtk.WindowPosition.CENTER)
        self.window.connect("destroy", Gtk.main_quit)

        self._install_css()

        self.knob_cards: list[KnobCard] = []
        self.last_mtime = -1

        scroller = Gtk.ScrolledWindow()
        scroller.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        scroller.set_hexpand(True)
        scroller.set_vexpand(True)
        scroller.get_style_context().add_class("app-scroll")

        self.page = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=18)
        self.page.set_border_width(24)
        self.page.get_style_context().add_class("page")

        scroller.add(self.page)
        self.window.add(scroller)

        self._build_header()
        self._build_panels()
        self._build_knobs()
        self._build_footer()

        self._refresh_state_if_changed()
        GLib.timeout_add(args.poll_ms, self._refresh_state_if_changed)
        self.window.show_all()

    def _install_css(self) -> None:
        provider = Gtk.CssProvider()
        provider.load_from_data(
            b"""
            window, .page, .app-scroll { background: #081018; color: #ecf2f6; }
            .card, .knob-card, .hero-card { background: #12202b; border-radius: 22px; border: 1px solid rgba(120, 155, 179, 0.18); }
            .hero-card { background-image: linear-gradient(135deg, #143243, #12202b); }
            .card-title { color: #9cb0bc; font-size: 12px; font-weight: 700; letter-spacing: 0.28em; }
            .hero-kicker { color: #9cb0bc; font-size: 12px; font-weight: 700; letter-spacing: 0.28em; }
            .hero-title { color: #f2f6f8; font-size: 48px; font-weight: 800; }
            .hero-subtitle { color: #a9bbc6; font-size: 15px; }
            .hero-status { color: #dbe4ea; font-size: 14px; }
            .metric-label { color: #8ea4b0; font-size: 11px; font-weight: 700; letter-spacing: 0.24em; }
            .metric-value { color: #f2f6f8; font-size: 28px; font-weight: 800; }
            .metric-text { color: #9cb0bc; font-size: 14px; }
            .status-chip { background: rgba(255,255,255,0.06); border-radius: 999px; border: 1px solid rgba(158, 183, 196, 0.14); padding: 8px 12px; }
            .status-chip label { color: #dbe5eb; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; }
            .row-label { color: #8ea4b0; font-size: 13px; }
            .row-value { color: #eff4f7; font-size: 13px; }
            .kv-row { padding: 6px 0; }
            .knob-id { color: #8ea4b0; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; }
            .knob-title { color: #f2f6f8; font-size: 20px; font-weight: 800; }
            .knob-percent { color: #eff4f7; font-size: 26px; font-weight: 800; }
            progressbar trough { background: #0b141c; border: 1px solid rgba(255,255,255,0.06); border-radius: 999px; min-height: 10px; }
            progressbar progress { border-radius: 999px; }
            .accent-cyan progress { background: #5ed8df; }
            .accent-amber progress { background: #f5b85e; }
            .accent-teal progress { background: #48d0ba; }
            .accent-rose progress { background: #ff8596; }
            .accent-lime progress { background: #8fd861; }
            .footer-note { color: #8ea4b0; font-size: 12px; }
            .toast { background: rgba(255,255,255,0.05); border-radius: 14px; border: 1px solid rgba(158, 183, 196, 0.12); padding: 10px 12px; }
            .toast-title { color: #f2f6f8; font-size: 12px; font-weight: 700; }
            .toast-body { color: #9cb0bc; font-size: 12px; }
            """
        )
        screen = Gdk.Screen.get_default()
        if screen is not None:
            Gtk.StyleContext.add_provider_for_screen(
                screen,
                provider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
            )

    def _build_header(self) -> None:
        hero = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=18)
        self.page.pack_start(hero, False, False, 0)

        hero_main = Gtk.Frame()
        hero_main.set_shadow_type(Gtk.ShadowType.NONE)
        hero_main.get_style_context().add_class("hero-card")
        hero.pack_start(hero_main, True, True, 0)

        hero_side = Gtk.Frame()
        hero_side.set_shadow_type(Gtk.ShadowType.NONE)
        hero_side.get_style_context().add_class("card")
        hero.pack_start(hero_side, False, False, 0)

        left = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        left.set_border_width(24)
        hero_main.add(left)

        self.hero_kicker = Gtk.Label(xalign=0)
        self.hero_kicker.get_style_context().add_class("hero-kicker")
        self.hero_title = Gtk.Label(xalign=0)
        self.hero_title.get_style_context().add_class("hero-title")
        self.hero_subtitle = Gtk.Label(xalign=0)
        self.hero_subtitle.get_style_context().add_class("hero-subtitle")
        self.hero_status = Gtk.Label(xalign=0)
        self.hero_status.get_style_context().add_class("hero-status")
        self.status_chips = Gtk.FlowBox()
        self.status_chips.set_selection_mode(Gtk.SelectionMode.NONE)
        self.status_chips.set_max_children_per_line(6)
        self.status_chips.set_row_spacing(8)
        self.status_chips.set_column_spacing(8)

        left.pack_start(self.hero_kicker, False, False, 0)
        left.pack_start(self.hero_title, False, False, 0)
        left.pack_start(self.hero_subtitle, False, False, 0)
        left.pack_start(self.status_chips, False, False, 6)
        left.pack_start(self.hero_status, False, False, 0)

        right = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=18)
        right.set_border_width(22)
        hero_side.add(right)

        self.metric_port = self._metric_block(right)
        self.metric_knobs = self._metric_block(right)
        self.metric_demo = self._metric_block(right)

    def _metric_block(self, parent: Gtk.Box) -> dict[str, Gtk.Label]:
        wrapper = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        label = Gtk.Label(xalign=0)
        label.get_style_context().add_class("metric-label")
        value = Gtk.Label(xalign=0)
        value.get_style_context().add_class("metric-value")
        text = Gtk.Label(xalign=0)
        text.set_line_wrap(True)
        text.get_style_context().add_class("metric-text")
        wrapper.pack_start(label, False, False, 0)
        wrapper.pack_start(value, False, False, 0)
        wrapper.pack_start(text, False, False, 0)
        parent.pack_start(wrapper, False, False, 0)
        return {"label": label, "value": value, "text": text}

    def _build_panels(self) -> None:
        grid = Gtk.Grid()
        grid.set_row_spacing(18)
        grid.set_column_spacing(18)
        self.page.pack_start(grid, False, False, 0)

        self.connection_card = KeyValueCard(["current_port", "available", "demo_mode"])
        self.preferences_card = KeyValueCard(["language", "preferred_port", "auto_connect", "demo_mode"])
        self.diagnostics_card = KeyValueCard(["audio", "hint", "last_serial"])
        self.about_card = KeyValueCard(["app_title", "status", "available"])

        grid.attach(self.connection_card, 0, 0, 1, 1)
        grid.attach(self.preferences_card, 1, 0, 1, 1)
        grid.attach(self.diagnostics_card, 0, 1, 1, 1)
        grid.attach(self.about_card, 1, 1, 1, 1)

    def _build_knobs(self) -> None:
        section = Gtk.Frame()
        section.set_shadow_type(Gtk.ShadowType.NONE)
        section.get_style_context().add_class("card")
        self.page.pack_start(section, False, False, 0)

        body = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        body.set_border_width(18)
        section.add(body)

        self.knobs_title = Gtk.Label(xalign=0)
        self.knobs_title.get_style_context().add_class("card-title")
        body.pack_start(self.knobs_title, False, False, 0)

        self.knobs_flow = Gtk.FlowBox()
        self.knobs_flow.set_selection_mode(Gtk.SelectionMode.NONE)
        self.knobs_flow.set_max_children_per_line(3)
        self.knobs_flow.set_min_children_per_line(1)
        self.knobs_flow.set_row_spacing(14)
        self.knobs_flow.set_column_spacing(14)
        body.pack_start(self.knobs_flow, False, False, 0)

    def _build_footer(self) -> None:
        footer = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=18)
        self.page.pack_start(footer, False, False, 0)

        self.footer_note = Gtk.Label(xalign=0)
        self.footer_note.get_style_context().add_class("footer-note")
        footer.pack_start(self.footer_note, True, True, 0)

        self.toast_flow = Gtk.FlowBox()
        self.toast_flow.set_selection_mode(Gtk.SelectionMode.NONE)
        self.toast_flow.set_max_children_per_line(4)
        self.toast_flow.set_row_spacing(8)
        self.toast_flow.set_column_spacing(8)
        footer.pack_end(self.toast_flow, False, False, 0)

    def _refresh_state_if_changed(self) -> bool:
        current_mtime = self.state_path.stat().st_mtime_ns if self.state_path.exists() else 0
        if current_mtime != self.last_mtime:
            self.last_mtime = current_mtime
            self._apply_state(json.loads(self.state_path.read_text(encoding="utf-8")))
        return True

    def _set_metric(self, block: dict[str, Gtk.Label], label: str, value: str, text: str) -> None:
        block["label"].set_text(label.upper())
        block["value"].set_text(value)
        block["text"].set_text(text)

    def _reset_flowbox(self, flowbox: Gtk.FlowBox) -> None:
        for child in flowbox.get_children():
            flowbox.remove(child)

    def _add_chip(self, flowbox: Gtk.FlowBox, text: str) -> None:
        frame = Gtk.Frame()
        frame.set_shadow_type(Gtk.ShadowType.NONE)
        frame.get_style_context().add_class("status-chip")
        label = Gtk.Label(label=text, xalign=0)
        frame.add(label)
        flowbox.add(frame)

    def _add_toast(self, title: str, body: str) -> None:
        frame = Gtk.Frame()
        frame.set_shadow_type(Gtk.ShadowType.NONE)
        frame.get_style_context().add_class("toast")
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        title_label = Gtk.Label(label=title, xalign=0)
        title_label.get_style_context().add_class("toast-title")
        body_label = Gtk.Label(label=body, xalign=0)
        body_label.get_style_context().add_class("toast-body")
        box.pack_start(title_label, False, False, 0)
        box.pack_start(body_label, False, False, 0)
        frame.add(box)
        self.toast_flow.add(frame)

    def _ensure_knob_cards(self, count: int) -> None:
        while len(self.knob_cards) < count:
            card = KnobCard()
            self.knob_cards.append(card)
            self.knobs_flow.add(card)
        while len(self.knob_cards) > count:
            card = self.knob_cards.pop()
            self.knobs_flow.remove(card)

    def _apply_state(self, state: dict) -> None:
        labels = state.get("labels", {})
        status = state.get("status", {})
        connection = state.get("connection", {})
        diagnostics = state.get("diagnostics", {})
        settings = state.get("settings", {})
        knobs = state.get("knobs", [])
        toasts = state.get("toasts", [])

        self.hero_kicker.set_text(labels.get("live_runtime", "").upper())
        self.hero_title.set_text(labels.get("app_title", "Ioruba"))
        self.hero_subtitle.set_text(labels.get("app_subtitle", ""))
        self.hero_status.set_text(status.get("text", ""))

        self._reset_flowbox(self.status_chips)
        self._add_chip(self.status_chips, labels.get("status_online", "ONLINE"))
        self._add_chip(self.status_chips, f"{labels.get('status', 'Status')}: {status.get('code', '')}")
        self._add_chip(self.status_chips, f"{labels.get('language', 'Language')}: {state.get('language_code', '')}")
        self._add_chip(self.status_chips, f"{labels.get('theme', 'Theme')}: {state.get('theme', '')}")

        self._set_metric(
            self.metric_port,
            labels.get("connection", "Connection"),
            str(connection.get("current_port", "")),
            str(connection.get("available_ports_text", "")),
        )
        self._set_metric(
            self.metric_knobs,
            labels.get("knob_summary", "Controls"),
            str(len(knobs)),
            str(diagnostics.get("audio_summary", "")),
        )
        self._set_metric(
            self.metric_demo,
            labels.get("demo_mode", "Demo"),
            labels.get("enabled", "Enabled") if connection.get("demo_mode") else labels.get("disabled", "Disabled"),
            str(diagnostics.get("hint", "")),
        )

        self.connection_card.set_title(labels.get("connection", "Connection"))
        self.connection_card.set_row("current_port", labels.get("current_port", "Current Port"), str(connection.get("current_port", "")))
        self.connection_card.set_row("available", labels.get("available", "Available"), str(connection.get("available_ports_text", "")))
        self.connection_card.set_row("demo_mode", labels.get("demo_mode", "Demo"), labels.get("enabled", "Enabled") if connection.get("demo_mode") else labels.get("disabled", "Disabled"))

        self.preferences_card.set_title(labels.get("settings", "Settings"))
        self.preferences_card.set_row("language", labels.get("language", "Language"), str(settings.get("language", "")))
        self.preferences_card.set_row("preferred_port", labels.get("preferred_port", "Preferred Port"), str(settings.get("preferred_port", "")))
        self.preferences_card.set_row("auto_connect", labels.get("auto_connect", "Auto Connect"), labels.get("enabled", "Enabled") if settings.get("auto_connect") else labels.get("disabled", "Disabled"))
        self.preferences_card.set_row("demo_mode", labels.get("demo_mode", "Demo"), labels.get("enabled", "Enabled") if settings.get("demo_mode") else labels.get("disabled", "Disabled"))

        self.diagnostics_card.set_title(labels.get("diagnostics", "Diagnostics"))
        self.diagnostics_card.set_row("audio", labels.get("audio", "Audio"), str(diagnostics.get("audio_summary", "")))
        self.diagnostics_card.set_row("hint", labels.get("hint", "Hint"), str(diagnostics.get("hint", "")))
        self.diagnostics_card.set_row("last_serial", labels.get("last_serial", "Last Serial"), str(diagnostics.get("last_serial") or labels.get("none", "none")))

        self.about_card.set_title(labels.get("about", "About"))
        self.about_card.set_row("app_title", labels.get("app_title", "Ioruba"), labels.get("app_subtitle", ""))
        self.about_card.set_row("status", labels.get("status", "Status"), str(status.get("text", "")))
        self.about_card.set_row("available", labels.get("available", "Available"), str(connection.get("available_ports_text", labels.get("not_available", ""))))

        self.knobs_title.set_text(labels.get("knob_summary", "Mapped controls").upper())
        self._ensure_knob_cards(len(knobs))
        for card, knob in zip(self.knob_cards, knobs):
            card.update(knob, labels)

        self.footer_note.set_text(labels.get("footer_hint", ""))
        self._reset_flowbox(self.toast_flow)
        for toast in toasts:
            self._add_toast(str(toast.get("title", "")), str(toast.get("body", "")))

        self.window.show_all()


def main() -> int:
    args = build_parser().parse_args()
    NativeWindow(args)
    Gtk.main()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
