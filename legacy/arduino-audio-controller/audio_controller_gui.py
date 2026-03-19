#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import locale
import math
import os
import threading
import time
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

import gi
import pulsectl
import serial
import serial.tools.list_ports

gi.require_version("Gtk", "4.0")
gi.require_version("Adw", "1")
gi.require_version("GioUnix", "2.0")
from gi.repository import Adw, Gdk, Gio, GioUnix, GLib, Gtk, Pango  # noqa: E402


APP_ID = "com.bitter.audiocontroller"
APP_NAME = "Controlador de Áudio"
BAUD_RATE = 9600
NO_DATA_WARNING_SECONDS = 3.5
PORT_REFRESH_INTERVAL_MS = 2500
TARGET_REFRESH_INTERVAL_MS = 3000
DEMO_TICK_MS = 40
SETTINGS_PATH = Path.home() / ".config" / "ioruba-controlador" / "settings.json"

LANGUAGE_LABELS = {
    "pt-BR": "Português (Brasil)",
    "en": "English",
}

KNOB_COLORS = [
    (0.95, 0.58, 0.22),
    (0.11, 0.74, 0.70),
    (0.92, 0.36, 0.31),
]

TRANSLATIONS = {
    "pt-BR": {
        "window_title": "Controlador de Áudio",
        "header_subtitle": "Arduino Nano · 3 potenciômetros · PipeWire/Pulse",
        "language_accessible": "Idioma",
        "hero_title": "Mesa física de áudio para o seu Nano com 3 knobs",
        "hero_description": "Compatível com os dois firmwares: legado P1/P2/P3 e novo formato A0|A1|A2. Mapeie cada potenciômetro para master, microfone ou aplicações ativas.",
        "hero_demo": "Modo demo ativo para visualização e screenshots.",
        "hardware_title": "Hardware e conexão",
        "port_label": "Porta serial detectada",
        "rescan": "Reescanear",
        "autoconnect_title": "Reconectar automaticamente",
        "autoconnect_subtitle": "Tenta reencontrar o Nano se a conexão serial cair.",
        "connect": "Conectar",
        "disconnect": "Desconectar",
        "mapping_title": "Mapeamento dos 3 potenciômetros",
        "diagnostics_title": "Diagnóstico rápido",
        "audio_state": "Estado do áudio: {summary}",
        "active_apps": "Apps ativas detectadas: {apps}",
        "last_serial": "Última linha serial: {line}",
        "diag_hint": "Se a porta conectar mas não houver leitura, verifique o sketch do Nano, o cabo USB e o bootloader.",
        "knob_title": "Knob {index}",
        "knob_pin": "{pin} · potenciômetro {index}",
        "assigned_target": "Destino controlado",
        "raw_value": "Bruto: {value}",
        "waiting_data": "Aguardando leituras",
        "badge_online": "online",
        "badge_offline": "offline",
        "badge_demo": "demo",
        "port_none": "Nenhuma porta detectada",
        "status_ready_title": "Pronto para conectar",
        "status_ready_detail": "Selecione a porta do Nano e inicie o monitor serial.",
        "status_demo_title": "Modo demo ativo",
        "status_demo_detail": "A interface está simulando leituras e aplicações para pré-visualização.",
        "status_connecting_title": "Inicializando conexão serial",
        "status_connecting_detail": "Aguardando porta do Arduino.",
        "status_no_port_title": "Nenhuma porta serial detectada",
        "status_no_port_detail": "Conecte o Nano ou selecione uma porta manualmente.",
        "status_connected_title": "Conectado em {port}",
        "status_connected_waiting": "Aguardando leituras do firmware.",
        "status_reading": "Última leitura: {line}",
        "status_ignored_line": "Linha ignorada: {line}",
        "status_no_data_initial": "Sem leituras do firmware. Verifique se o sketch correto foi gravado no Nano.",
        "status_no_data_idle": "Sem mudanças recentes. Aguardando movimento nos knobs.",
        "status_open_failed_title": "Falha ao abrir {port}",
        "status_connection_lost_title": "Conexão perdida em {port}",
        "status_manual_disconnect_title": "Conexão encerrada",
        "status_manual_disconnect_detail": "Monitor serial parado manualmente.",
        "detail_target_unavailable": "Destino indisponível: {detail}",
        "detail_master": "{name}",
        "detail_microphone": "{name}",
        "detail_app": "{name} ({count} stream)",
        "detail_app_plural": "{name} ({count} streams)",
        "toast_knob_updated": "Knob {index} atualizado",
        "toast_language_updated": "Idioma alterado para {language}",
        "toast_ports_refreshed": "Portas e apps ativas atualizadas",
        "toast_connection_started": "Conexão serial iniciada",
        "toast_connection_stopped": "Conexão serial encerrada",
        "toast_demo_started": "Modo demo carregado",
        "demo_serial_line": "demo:{line}",
        "mock_audio_summary": "1 saída · 1 entrada · 5 apps ativas",
        "mock_apps": "Spotify, Google Chrome, Discord, OBS Studio, Firefox",
        "master_target": "Volume master",
        "microphone_target": "Microfone · {name}",
        "app_target": "Aplicação · {name}",
        "inactive_suffix": " (inativa)",
        "runtime_no_display": "Nenhum display GTK disponível. Execute a interface a partir de uma sessão gráfica.",
    },
    "en": {
        "window_title": "Audio Controller",
        "header_subtitle": "Arduino Nano · 3 potentiometers · PipeWire/Pulse",
        "language_accessible": "Language",
        "hero_title": "Physical audio desk for your Nano with 3 knobs",
        "hero_description": "Compatible with both firmwares: legacy P1/P2/P3 and the newer A0|A1|A2 format. Map each potentiometer to master, microphone, or active applications.",
        "hero_demo": "Demo mode enabled for previews and screenshots.",
        "hardware_title": "Hardware and connection",
        "port_label": "Detected serial port",
        "rescan": "Rescan",
        "autoconnect_title": "Reconnect automatically",
        "autoconnect_subtitle": "Keeps trying to find the Nano again if the serial link drops.",
        "connect": "Connect",
        "disconnect": "Disconnect",
        "mapping_title": "3-knob mapping",
        "diagnostics_title": "Quick diagnostics",
        "audio_state": "Audio state: {summary}",
        "active_apps": "Detected active apps: {apps}",
        "last_serial": "Last serial line: {line}",
        "diag_hint": "If the port connects but no readings arrive, check the Nano sketch, the USB cable, and the bootloader.",
        "knob_title": "Knob {index}",
        "knob_pin": "{pin} · potentiometer {index}",
        "assigned_target": "Assigned target",
        "raw_value": "Raw: {value}",
        "waiting_data": "Waiting for readings",
        "badge_online": "online",
        "badge_offline": "offline",
        "badge_demo": "demo",
        "port_none": "No serial ports detected",
        "status_ready_title": "Ready to connect",
        "status_ready_detail": "Select the Nano port and start the serial monitor.",
        "status_demo_title": "Demo mode enabled",
        "status_demo_detail": "The interface is simulating readings and applications for preview.",
        "status_connecting_title": "Initializing serial connection",
        "status_connecting_detail": "Waiting for the Arduino port.",
        "status_no_port_title": "No serial ports detected",
        "status_no_port_detail": "Connect the Nano or select a port manually.",
        "status_connected_title": "Connected on {port}",
        "status_connected_waiting": "Waiting for firmware readings.",
        "status_reading": "Last reading: {line}",
        "status_ignored_line": "Ignored line: {line}",
        "status_no_data_initial": "No firmware readings yet. Check whether the correct sketch is flashed on the Nano.",
        "status_no_data_idle": "No recent changes. Waiting for knob movement.",
        "status_open_failed_title": "Failed to open {port}",
        "status_connection_lost_title": "Connection lost on {port}",
        "status_manual_disconnect_title": "Connection closed",
        "status_manual_disconnect_detail": "Serial monitor stopped manually.",
        "detail_target_unavailable": "Target unavailable: {detail}",
        "detail_master": "{name}",
        "detail_microphone": "{name}",
        "detail_app": "{name} ({count} stream)",
        "detail_app_plural": "{name} ({count} streams)",
        "toast_knob_updated": "Knob {index} updated",
        "toast_language_updated": "Language changed to {language}",
        "toast_ports_refreshed": "Ports and active apps refreshed",
        "toast_connection_started": "Serial connection started",
        "toast_connection_stopped": "Serial connection stopped",
        "toast_demo_started": "Demo mode loaded",
        "demo_serial_line": "demo:{line}",
        "mock_audio_summary": "1 output · 1 input · 5 active apps",
        "mock_apps": "Spotify, Google Chrome, Discord, OBS Studio, Firefox",
        "master_target": "Master volume",
        "microphone_target": "Microphone · {name}",
        "app_target": "Application · {name}",
        "inactive_suffix": " (inactive)",
        "runtime_no_display": "No GTK display is available. Run the interface from a graphical session.",
    },
}


def system_language() -> str:
    env_language = (
        os.environ.get("LC_ALL")
        or os.environ.get("LANGUAGE")
        or os.environ.get("LANG")
        or ""
    ).replace("-", "_")
    if env_language.lower().startswith("pt"):
        return "pt-BR"
    return "en"


class Translator:
    def __init__(self, language: str | None = None) -> None:
        self.language = "en"
        self.set_language(language or system_language())

    def set_language(self, language: str) -> None:
        self.language = language if language in TRANSLATIONS else "en"

    def t(self, key: str, **kwargs) -> str:
        template = TRANSLATIONS[self.language].get(
            key, TRANSLATIONS["en"].get(key, key)
        )
        return template.format(**kwargs)


@dataclass
class RuntimeOptions:
    demo_mode: bool = False
    language_override: str | None = None
    screenshot_path: str = ""
    width_override: int = 0
    height_override: int = 0
    screenshot_scroll_ratio: float = 0.0


@dataclass
class AudioTarget:
    identifier: str
    label: str
    kind: str
    icon_name: str
    active: bool = True


@dataclass
class AppSettings:
    preferred_port: str = ""
    knob_targets: list[str] = field(
        default_factory=lambda: ["master", "app:Firefox", "app:Spotify"]
    )
    auto_connect: bool = True
    window_width: int = 980
    window_height: int = 760
    language: str = ""


class SettingsStore:
    @staticmethod
    def load() -> AppSettings:
        if not SETTINGS_PATH.exists():
            return AppSettings()

        try:
            data = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
        except Exception:
            return AppSettings()

        settings = AppSettings(
            preferred_port=str(data.get("preferred_port", "")),
            knob_targets=list(data.get("knob_targets", [])),
            auto_connect=bool(data.get("auto_connect", True)),
            window_width=int(data.get("window_width", 980)),
            window_height=int(data.get("window_height", 760)),
            language=str(data.get("language", "")),
        )
        settings.knob_targets = normalize_knob_targets(settings.knob_targets)
        return settings

    @staticmethod
    def save(settings: AppSettings) -> None:
        SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
        SETTINGS_PATH.write_text(
            json.dumps(
                {
                    "preferred_port": settings.preferred_port,
                    "knob_targets": normalize_knob_targets(settings.knob_targets),
                    "auto_connect": settings.auto_connect,
                    "window_width": settings.window_width,
                    "window_height": settings.window_height,
                    "language": settings.language,
                },
                indent=2,
                ensure_ascii=False,
            )
            + "\n",
            encoding="utf-8",
        )


def normalize_knob_targets(raw_targets: list[str]) -> list[str]:
    defaults = ["master", "app:Firefox", "app:Spotify"]
    normalized = [target for target in raw_targets if isinstance(target, str)]
    while len(normalized) < 3:
        normalized.append(defaults[len(normalized)])
    return normalized[:3]


def clamp_volume(value: float) -> float:
    return max(0.0, min(1.0, value))


def list_candidate_ports() -> list[serial.tools.list_ports_common.ListPortInfo]:
    ports = list(serial.tools.list_ports.comports())

    def sort_key(port_info):
        device = port_info.device.casefold()
        description = (port_info.description or "").casefold()
        preferred = any(
            token in device or token in description
            for token in ("ttyusb", "ttyacm", "arduino", "ftdi", "usb")
        )
        return (0 if preferred else 1, device)

    filtered = [
        port
        for port in ports
        if any(
            token in port.device.casefold()
            or token in (port.description or "").casefold()
            for token in ("ttyusb", "ttyacm", "usb", "arduino", "ftdi")
        )
    ]
    candidates = filtered or ports
    return sorted(candidates, key=sort_key)


def format_port_label(port_info: serial.tools.list_ports_common.ListPortInfo) -> str:
    description = port_info.description or "Serial device"
    if description == "n/a":
        description = "Serial"
    return f"{port_info.device} · {description}"


def target_matches(expected_name: str, app_name: str) -> bool:
    expected = expected_name.casefold()
    current = app_name.casefold()
    return expected == current or expected in current or current in expected


def extract_themed_icon_name(icon: Gio.Icon | None) -> str:
    if icon is None:
        return "application-x-executable-symbolic"
    if isinstance(icon, Gio.ThemedIcon):
        names = list(icon.get_names())
        if names:
            return names[0]
    return "application-x-executable-symbolic"


def guess_app_icon_name(app_name: str) -> str:
    aliases = {
        "google chrome": "google-chrome",
        "chrome": "google-chrome",
        "chromium": "chromium",
        "firefox": "firefox",
        "spotify": "spotify-client",
        "discord": "discord",
        "slack": "slack",
        "obs studio": "com.obsproject.Studio",
        "teams": "teams",
        "microsoft teams": "teams",
        "vlc": "vlc",
        "steam": "steam",
        "telegram": "telegramdesktop",
        "audacity": "audacity",
        "rhythmbox": "rhythmbox",
    }

    normalized = app_name.casefold().strip()
    for alias, icon_name in aliases.items():
        if alias in normalized or normalized in alias:
            return icon_name
    return "application-x-executable-symbolic"


class KnobDial(Gtk.DrawingArea):
    def __init__(self, accent_color: tuple[float, float, float]) -> None:
        super().__init__()
        self.accent_color = accent_color
        self.current_percent = 0.0
        self.target_percent = 0.0
        self.animation_source_id = 0
        self.set_content_width(210)
        self.set_content_height(210)
        self.set_draw_func(self.draw)

    def set_percent(self, percent: float) -> None:
        self.target_percent = clamp_volume(percent)
        if self.animation_source_id == 0:
            self.animation_source_id = GLib.timeout_add(16, self.animate_step)

    def animate_step(self) -> bool:
        delta = self.target_percent - self.current_percent
        if abs(delta) < 0.004:
            self.current_percent = self.target_percent
            self.queue_draw()
            self.animation_source_id = 0
            return False

        self.current_percent += delta * 0.18
        self.queue_draw()
        return True

    def draw(self, _area, cr, width: int, height: int) -> None:
        size = min(width, height)
        center_x = width / 2.0
        center_y = height / 2.0
        outer_radius = size * 0.39
        inner_radius = size * 0.23

        start_angle = math.radians(135)
        end_angle = math.radians(405)
        span = end_angle - start_angle
        value_angle = start_angle + span * self.current_percent

        cr.save()
        cr.set_source_rgba(0.08, 0.09, 0.12, 0.95)
        cr.arc(center_x, center_y, outer_radius + 14, 0, math.tau)
        cr.fill()

        cr.set_source_rgba(0.16, 0.17, 0.22, 1.0)
        cr.arc(center_x, center_y, outer_radius, 0, math.tau)
        cr.fill()

        for tick in range(0, 25):
            angle = start_angle + span * (tick / 24.0)
            tick_outer = outer_radius - 4
            tick_inner = outer_radius - (18 if tick % 6 == 0 else 11)
            x1 = center_x + math.cos(angle) * tick_inner
            y1 = center_y + math.sin(angle) * tick_inner
            x2 = center_x + math.cos(angle) * tick_outer
            y2 = center_y + math.sin(angle) * tick_outer
            cr.set_line_width(2.2 if tick % 6 == 0 else 1.4)
            cr.set_source_rgba(0.45, 0.46, 0.50, 0.45)
            cr.move_to(x1, y1)
            cr.line_to(x2, y2)
            cr.stroke()

        cr.set_line_width(9)
        cr.set_line_cap(1)
        cr.set_source_rgba(0.26, 0.27, 0.31, 1.0)
        cr.arc(center_x, center_y, outer_radius - 26, start_angle, end_angle)
        cr.stroke()

        r, g, b = self.accent_color
        cr.set_source_rgba(r, g, b, 0.95)
        cr.arc(center_x, center_y, outer_radius - 26, start_angle, value_angle)
        cr.stroke()

        cr.set_source_rgba(0.13, 0.14, 0.18, 1.0)
        cr.arc(center_x, center_y, inner_radius + 28, 0, math.tau)
        cr.fill()

        pointer_length = outer_radius - 40
        pointer_x = center_x + math.cos(value_angle) * pointer_length
        pointer_y = center_y + math.sin(value_angle) * pointer_length
        cr.set_line_width(8)
        cr.set_source_rgba(r, g, b, 0.95)
        cr.move_to(center_x, center_y)
        cr.line_to(pointer_x, pointer_y)
        cr.stroke()

        cr.set_source_rgba(0.95, 0.95, 0.98, 1.0)
        cr.arc(center_x, center_y, 10, 0, math.tau)
        cr.fill()

        percent_text = f"{int(round(self.current_percent * 100)):d}%"
        cr.select_font_face("Sans", 0, 1)
        cr.set_font_size(size * 0.15)
        text_extents = cr.text_extents(percent_text)
        cr.move_to(
            center_x - text_extents.width / 2 - text_extents.x_bearing,
            center_y + text_extents.height / 2,
        )
        cr.set_source_rgba(0.97, 0.97, 0.98, 1.0)
        cr.show_text(percent_text)
        cr.restore()


class KnobCard(Gtk.Box):
    def __init__(
        self,
        knob_index: int,
        pin_name: str,
        accent_color: tuple[float, float, float],
    ) -> None:
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        self.knob_index = knob_index
        self.pin_name = pin_name
        self.targets: list[AudioTarget] = []
        self.translator = Translator()

        self.add_css_class("knob-card")
        self.set_hexpand(True)
        self.set_vexpand(False)
        self.set_size_request(320, -1)

        header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        header.set_halign(Gtk.Align.FILL)
        self.append(header)

        title_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        title_box.set_hexpand(True)
        header.append(title_box)

        self.title_label = Gtk.Label(xalign=0)
        self.title_label.add_css_class("title-3")
        title_box.append(self.title_label)

        self.pin_label = Gtk.Label(xalign=0)
        self.pin_label.add_css_class("dim-label")
        title_box.append(self.pin_label)

        self.current_target_box = Gtk.Box(
            orientation=Gtk.Orientation.HORIZONTAL, spacing=8
        )
        self.current_target_box.set_halign(Gtk.Align.END)
        header.append(self.current_target_box)

        self.current_target_icon = Gtk.Image.new_from_icon_name(
            "application-x-executable-symbolic"
        )
        self.current_target_icon.set_pixel_size(22)
        self.current_target_box.append(self.current_target_icon)

        self.current_target_name = Gtk.Label(xalign=1)
        self.current_target_name.set_wrap(True)
        self.current_target_name.set_wrap_mode(Pango.WrapMode.WORD_CHAR)
        self.current_target_name.set_max_width_chars(18)
        self.current_target_name.add_css_class("title-5")
        self.current_target_box.append(self.current_target_name)

        self.dial = KnobDial(accent_color)
        self.dial.set_halign(Gtk.Align.CENTER)
        self.append(self.dial)

        self.target_caption = Gtk.Label(xalign=0)
        self.target_caption.add_css_class("dim-label")
        self.append(self.target_caption)

        self.target_model = Gtk.StringList()
        self.target_dropdown = Gtk.DropDown(model=self.target_model)
        self.target_dropdown.set_hexpand(True)
        self.append(self.target_dropdown)

        metrics_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        metrics_box.set_halign(Gtk.Align.FILL)
        self.append(metrics_box)

        self.raw_label = Gtk.Label(xalign=0)
        self.raw_label.add_css_class("dim-label")
        metrics_box.append(self.raw_label)

        self.detail_label = Gtk.Label(xalign=1)
        self.detail_label.add_css_class("dim-label")
        self.detail_label.set_hexpand(True)
        self.detail_label.set_wrap(True)
        self.detail_label.set_wrap_mode(Pango.WrapMode.WORD_CHAR)
        metrics_box.append(self.detail_label)

    def apply_language(self, translator: Translator) -> None:
        self.translator = translator
        self.title_label.set_label(
            translator.t("knob_title", index=self.knob_index + 1)
        )
        self.pin_label.set_label(
            translator.t("knob_pin", pin=self.pin_name, index=self.knob_index + 1)
        )
        self.target_caption.set_label(translator.t("assigned_target"))
        if self.raw_label.get_label().startswith("Raw") or self.raw_label.get_label().startswith("Bruto"):
            self.raw_label.set_label(translator.t("raw_value", value="---"))
        if not self.detail_label.get_label():
            self.detail_label.set_label(translator.t("waiting_data"))

    def set_targets(self, targets: list[AudioTarget], selected_identifier: str) -> None:
        selected_index = 0
        self.targets = targets

        while self.target_model.get_n_items() > 0:
            self.target_model.remove(0)

        for index, target in enumerate(targets):
            self.target_model.append(target.label)
            if target.identifier == selected_identifier:
                selected_index = index

        self.target_dropdown.set_selected(selected_index)
        self.refresh_selected_target_ui()

    def refresh_selected_target_ui(self) -> None:
        target = self.current_target()
        self.current_target_icon.set_from_icon_name(target.icon_name)
        self.current_target_name.set_label(target.label)

    def current_target(self) -> AudioTarget:
        if not self.targets:
            return AudioTarget(
                "master",
                self.translator.t("master_target"),
                "master",
                "audio-volume-high-symbolic",
            )
        selected_index = int(self.target_dropdown.get_selected())
        selected_index = min(max(selected_index, 0), len(self.targets) - 1)
        return self.targets[selected_index]

    def selected_target_identifier(self) -> str:
        return self.current_target().identifier

    def update_reading(self, raw_value: int, percent: int, detail: str) -> None:
        self.dial.set_percent(percent / 100.0)
        self.raw_label.set_label(self.translator.t("raw_value", value=raw_value))
        self.detail_label.set_label(detail)

    def set_idle_state(self, detail: str) -> None:
        self.detail_label.set_label(detail)


class PulseBridge:
    def __init__(self, translator: Translator, demo_mode: bool = False) -> None:
        self.translator = translator
        self.demo_mode = demo_mode
        self.icon_cache: dict[str, str] = {}
        self.desktop_cache: list[Gio.DesktopAppInfo] = []
        if not demo_mode:
            self.pulse = pulsectl.Pulse("ioruba-controlador")
            self.desktop_cache = [
                info for info in GioUnix.DesktopAppInfo.get_all() if info is not None
            ]
        else:
            self.pulse = None

    def close(self) -> None:
        if self.pulse is None:
            return
        try:
            self.pulse.close()
        except Exception:
            pass

    def set_translator(self, translator: Translator) -> None:
        self.translator = translator

    def list_targets(self, saved_identifiers: list[str]) -> list[AudioTarget]:
        if self.demo_mode:
            demo_names = [
                "Google Chrome",
                "Spotify",
                "Discord",
                "OBS Studio",
                "Firefox",
            ]
            targets = [
                AudioTarget(
                    "master",
                    self.translator.t("master_target"),
                    "master",
                    "audio-volume-high-symbolic",
                ),
                AudioTarget(
                    "microphone",
                    self.translator.t(
                        "microphone_target", name="Built-in Microphone"
                    ),
                    "source",
                    "audio-input-microphone-symbolic",
                ),
            ]
            targets.extend(
                AudioTarget(
                    f"app:{name}",
                    self.translator.t("app_target", name=name),
                    "app",
                    self.resolve_app_icon_name(name),
                )
                for name in demo_names
            )
            return self._ensure_saved_targets(targets, saved_identifiers)

        targets = [
            AudioTarget(
                "master",
                self.translator.t("master_target"),
                "master",
                "audio-volume-high-symbolic",
            )
        ]

        microphone = self._preferred_source()
        if microphone is not None:
            mic_label = microphone.description or microphone.name
            targets.append(
                AudioTarget(
                    "microphone",
                    self.translator.t("microphone_target", name=mic_label),
                    "source",
                    "audio-input-microphone-symbolic",
                )
            )

        active_apps = self.active_applications()
        for app_name, _stream_count in active_apps:
            targets.append(
                AudioTarget(
                    f"app:{app_name}",
                    self.translator.t("app_target", name=app_name),
                    "app",
                    self.resolve_app_icon_name(app_name),
                )
            )

        return self._ensure_saved_targets(targets, saved_identifiers)

    def _ensure_saved_targets(
        self, targets: list[AudioTarget], saved_identifiers: list[str]
    ) -> list[AudioTarget]:
        known_ids = {target.identifier for target in targets}
        for identifier in saved_identifiers:
            if identifier.startswith("app:") and identifier not in known_ids:
                name = identifier.split(":", 1)[1]
                targets.append(
                    AudioTarget(
                        identifier,
                        self.translator.t("app_target", name=name)
                        + self.translator.t("inactive_suffix"),
                        "app",
                        self.resolve_app_icon_name(name),
                        active=False,
                    )
                )
        return targets

    def active_applications(self) -> list[tuple[str, int]]:
        if self.demo_mode:
            return [
                ("Google Chrome", 1),
                ("Spotify", 1),
                ("Discord", 1),
                ("OBS Studio", 1),
                ("Firefox", 1),
            ]

        counter: Counter[str] = Counter()
        for sink_input in self.pulse.sink_input_list():
            name = sink_input.proplist.get("application.name", "").strip()
            if name:
                counter[name] += 1
        return sorted(counter.items(), key=lambda item: item[0].casefold())

    def apply_target(self, identifier: str, volume: float) -> tuple[bool, str]:
        volume = clamp_volume(volume)

        if self.demo_mode:
            if identifier == "master":
                return True, self.translator.t("detail_master", name="Studio Output")
            if identifier == "microphone":
                return True, self.translator.t(
                    "detail_microphone", name="Built-in Microphone"
                )
            if identifier.startswith("app:"):
                name = identifier.split(":", 1)[1]
                return True, self._format_app_detail(name, 1)
            return False, "Unknown demo target"

        if identifier == "master":
            sink = self._default_sink()
            if sink is None:
                return False, "Default output not found"
            self.pulse.volume_set_all_chans(sink, volume)
            return True, self.translator.t(
                "detail_master", name=sink.description or sink.name
            )

        if identifier == "microphone":
            source = self._preferred_source()
            if source is None:
                return False, "Default microphone not found"
            self.pulse.volume_set_all_chans(source, volume)
            return True, self.translator.t(
                "detail_microphone", name=source.description or source.name
            )

        if identifier.startswith("app:"):
            target_name = identifier.split(":", 1)[1].strip()
            stream_count = 0
            for sink_input in self.pulse.sink_input_list():
                app_name = sink_input.proplist.get("application.name", "").strip()
                if target_matches(target_name, app_name):
                    self.pulse.volume_set_all_chans(sink_input, volume)
                    stream_count += 1
            if stream_count == 0:
                return False, target_name
            return True, self._format_app_detail(target_name, stream_count)

        return False, "Unknown target"

    def _format_app_detail(self, name: str, count: int) -> str:
        key = "detail_app" if count == 1 else "detail_app_plural"
        return self.translator.t(key, name=name, count=count)

    def diagnostics_summary(self) -> str:
        if self.demo_mode:
            return self.translator.t("mock_audio_summary")

        sinks = len(self.pulse.sink_list())
        sources = len(self.pulse.source_list())
        apps = len(self.active_applications())
        if self.translator.language == "pt-BR":
            return f"{sinks} saídas · {sources} fontes · {apps} apps ativas"
        return f"{sinks} outputs · {sources} inputs · {apps} active apps"

    def resolve_app_icon_name(self, app_name: str) -> str:
        if app_name in self.icon_cache:
            return self.icon_cache[app_name]

        normalized = app_name.casefold().strip()

        for app_info in self.desktop_cache:
            haystacks = [
                app_info.get_name() or "",
                app_info.get_display_name() or "",
                app_info.get_id() or "",
            ]
            if any(target_matches(normalized, hay.casefold()) for hay in haystacks if hay):
                icon_name = extract_themed_icon_name(app_info.get_icon())
                self.icon_cache[app_name] = icon_name
                return icon_name

        icon_name = guess_app_icon_name(app_name)
        self.icon_cache[app_name] = icon_name
        return icon_name

    def _default_sink(self):
        if self.pulse is None:
            return None
        try:
            default_name = self.pulse.server_info().default_sink_name
        except Exception:
            default_name = None

        sinks = self.pulse.sink_list()
        for sink in sinks:
            if sink.name == default_name:
                return sink
        return sinks[0] if sinks else None

    def _preferred_source(self):
        if self.pulse is None:
            return None

        sources = self.pulse.source_list()
        if not sources:
            return None

        default_source_name = None
        try:
            default_source_name = self.pulse.server_info().default_source_name
        except Exception:
            pass

        preferred = None
        for source in sources:
            if source.name == default_source_name:
                preferred = source
                break

        if preferred is not None and not preferred.name.endswith(".monitor"):
            return preferred

        for source in sources:
            if not source.name.endswith(".monitor"):
                return source

        return preferred or sources[0]


class SerialWorker(threading.Thread):
    def __init__(
        self,
        get_preferred_port: Callable[[], str],
        status_callback: Callable[[str, bool, dict], None],
        reading_callback: Callable[[int, int, str], None],
    ) -> None:
        super().__init__(daemon=True)
        self.get_preferred_port = get_preferred_port
        self.status_callback = status_callback
        self.reading_callback = reading_callback
        self._stop_event = threading.Event()
        self.serial_handle: serial.Serial | None = None
        self.current_port = ""
        self.last_data_at = 0.0
        self.received_packet = False

    def stop(self) -> None:
        self._stop_event.set()
        self._close_serial()

    def run(self) -> None:
        self.status_callback("status_connecting", False, {})

        while not self._stop_event.is_set():
            if self.serial_handle is None:
                port = self._select_port()
                if not port:
                    self.status_callback("status_no_port", False, {})
                    self._sleep(1.5)
                    continue

                try:
                    self.serial_handle = serial.Serial(port, BAUD_RATE, timeout=0.5)
                    self.current_port = port
                    self.last_data_at = time.monotonic()
                    self.received_packet = False
                    self.status_callback(
                        "status_connected",
                        True,
                        {"port": port, "detail_key": "status_connected_waiting"},
                    )
                    self._sleep(1.8)
                except (serial.SerialException, OSError) as exc:
                    self.status_callback(
                        "status_open_failed",
                        False,
                        {"port": port, "detail": str(exc)},
                    )
                    self._close_serial()
                    self._sleep(1.5)
                    continue

            try:
                raw_line = self.serial_handle.readline()
            except (serial.SerialException, OSError) as exc:
                self.status_callback(
                    "status_connection_lost",
                    False,
                    {"port": self.current_port, "detail": str(exc)},
                )
                self._close_serial()
                self._sleep(1.0)
                continue

            if raw_line:
                line = raw_line.decode("utf-8", errors="ignore").strip()
                if not line:
                    continue

                parsed = self._parse_line(line)
                if not parsed:
                    self.status_callback(
                        "status_connected",
                        True,
                        {"port": self.current_port, "detail_key": "status_ignored_line", "line": line},
                    )
                    continue

                self.last_data_at = time.monotonic()
                self.received_packet = True
                self.status_callback(
                    "status_connected",
                    True,
                    {"port": self.current_port, "detail_key": "status_reading", "line": line},
                )
                for knob_index, raw_value in parsed:
                    self.reading_callback(knob_index, raw_value, line)
                continue

            if time.monotonic() - self.last_data_at > NO_DATA_WARNING_SECONDS:
                detail_key = (
                    "status_no_data_idle" if self.received_packet else "status_no_data_initial"
                )
                self.status_callback(
                    "status_connected",
                    True,
                    {"port": self.current_port, "detail_key": detail_key},
                )

            self._sleep(0.05)

        self._close_serial()

    def _sleep(self, seconds: float) -> None:
        self._stop_event.wait(seconds)

    def _close_serial(self) -> None:
        if self.serial_handle is not None:
            try:
                self.serial_handle.close()
            except Exception:
                pass
        self.serial_handle = None
        self.current_port = ""

    def _select_port(self) -> str:
        preferred_port = self.get_preferred_port().strip()
        candidate_ports = [port.device for port in list_candidate_ports()]

        if preferred_port and preferred_port in candidate_ports:
            return preferred_port

        if preferred_port and Path(preferred_port).exists():
            return preferred_port

        return candidate_ports[0] if candidate_ports else ""

    def _parse_line(self, line: str) -> list[tuple[int, int]]:
        if ":" in line and line[:1].upper() == "P":
            knob, value = line.split(":", 1)
            try:
                knob_index = int(knob[1:]) - 1
                raw_value = int(value)
            except ValueError:
                return []
            if 0 <= knob_index < 3 and 0 <= raw_value <= 1023:
                return [(knob_index, raw_value)]
            return []

        if "|" in line:
            values = []
            for chunk in line.split("|"):
                chunk = chunk.strip()
                if not chunk:
                    continue
                try:
                    values.append(int(chunk))
                except ValueError:
                    return []
            return [
                (knob_index, raw_value)
                for knob_index, raw_value in enumerate(values[:3])
                if 0 <= raw_value <= 1023
            ]

        return []


class AudioControllerApp(Adw.Application):
    def __init__(self, options: RuntimeOptions) -> None:
        super().__init__(application_id=APP_ID)
        self.options = options
        self.settings = SettingsStore.load()
        if options.language_override:
            self.settings.language = options.language_override

        self.translator = Translator(self.settings.language or system_language())
        self.pulse = PulseBridge(self.translator, demo_mode=options.demo_mode)
        self.serial_worker: SerialWorker | None = None
        self.window: AudioControllerWindow | None = None

    def do_activate(self) -> None:
        if self.window is None:
            self.window = AudioControllerWindow(self)
        self.window.present()

    def do_shutdown(self) -> None:
        self.stop_serial_worker()
        self.pulse.close()
        Adw.Application.do_shutdown(self)

    def start_serial_worker(self) -> None:
        if self.options.demo_mode:
            return
        if self.serial_worker is not None and self.serial_worker.is_alive():
            return

        self.serial_worker = SerialWorker(
            get_preferred_port=lambda: self.settings.preferred_port,
            status_callback=self.dispatch_status_update,
            reading_callback=self.dispatch_knob_reading,
        )
        self.serial_worker.start()

    def stop_serial_worker(self) -> None:
        if self.serial_worker is not None:
            self.serial_worker.stop()
            self.serial_worker = None

    def dispatch_status_update(
        self, status_key: str, connected: bool, payload: dict
    ) -> None:
        if self.window is None:
            return
        GLib.idle_add(self.window.update_connection_state, status_key, connected, payload)

    def dispatch_knob_reading(self, knob_index: int, raw_value: int, line: str) -> None:
        if self.window is None:
            return
        GLib.idle_add(self.window.handle_knob_reading, knob_index, raw_value, line)


class AudioControllerWindow(Adw.ApplicationWindow):
    def __init__(self, app: AudioControllerApp) -> None:
        super().__init__(application=app, title=app.translator.t("window_title"))
        self.app = app
        self.translator = app.translator
        self.runtime_options = app.options
        self.port_labels: list[str] = []
        self.port_values: list[str] = []
        self.last_serial_line = "-"
        self.demo_phase = 0.0
        self.suppress_knob_events = False

        default_width = (
            self.runtime_options.width_override or app.settings.window_width
        )
        default_height = (
            self.runtime_options.height_override or app.settings.window_height
        )
        self.set_default_size(default_width, default_height)
        self.connect("close-request", self.on_close_request)

        self.toast_overlay = Adw.ToastOverlay()
        toolbar_view = Adw.ToolbarView()
        toolbar_view.add_top_bar(self.build_header_bar())
        toolbar_view.set_content(self.build_content())
        self.toast_overlay.set_child(toolbar_view)
        self.set_content(self.toast_overlay)

        self.install_css()
        self.refresh_serial_ports()
        self.refresh_targets_and_snapshot()

        if self.runtime_options.demo_mode:
            self.update_connection_state("status_demo", True, {})
            GLib.timeout_add(DEMO_TICK_MS, self.on_demo_tick)
            self.show_toast(self.translator.t("toast_demo_started"))
        else:
            self.update_connection_state("status_ready", False, {})
            GLib.timeout_add(PORT_REFRESH_INTERVAL_MS, self.on_periodic_port_refresh)

        GLib.timeout_add(TARGET_REFRESH_INTERVAL_MS, self.on_periodic_target_refresh)

        if self.app.settings.auto_connect and not self.runtime_options.demo_mode:
            GLib.timeout_add(400, self.start_connection_once)

        self.apply_language()

        if self.runtime_options.screenshot_path:
            GLib.timeout_add(1200, self.prepare_screenshot_capture)

    def build_header_bar(self) -> Adw.HeaderBar:
        header = Adw.HeaderBar()

        title_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.header_title_label = Gtk.Label(xalign=0)
        self.header_title_label.add_css_class("title-2")
        self.header_subtitle_label = Gtk.Label(xalign=0)
        self.header_subtitle_label.add_css_class("dim-label")
        title_box.append(self.header_title_label)
        title_box.append(self.header_subtitle_label)
        header.set_title_widget(title_box)

        self.language_model = Gtk.StringList.new(
            [LANGUAGE_LABELS["pt-BR"], LANGUAGE_LABELS["en"]]
        )
        self.language_dropdown = Gtk.DropDown(model=self.language_model)
        self.language_dropdown.set_tooltip_text(self.translator.t("language_accessible"))
        self.language_dropdown.connect("notify::selected", self.on_language_changed)
        header.pack_end(self.language_dropdown)

        self.connection_badge = Gtk.Label()
        self.connection_badge.add_css_class("status-badge")
        header.pack_end(self.connection_badge)
        return header

    def build_content(self) -> Gtk.Widget:
        scroller = Gtk.ScrolledWindow()
        scroller.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.main_scroller = scroller

        clamp = Adw.Clamp()
        clamp.set_maximum_size(1220)
        clamp.set_tightening_threshold(740)
        scroller.set_child(clamp)

        content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=24)
        content.set_margin_start(24)
        content.set_margin_end(24)
        content.set_margin_top(24)
        content.set_margin_bottom(24)
        content.add_css_class("content-stage")
        self.content_box = content
        clamp.set_child(content)

        self.hero_card = self.build_hero_card()
        content.append(self.hero_card)

        self.top_cards = Gtk.FlowBox()
        self.top_cards.set_selection_mode(Gtk.SelectionMode.NONE)
        self.top_cards.set_max_children_per_line(2)
        self.top_cards.set_min_children_per_line(1)
        self.top_cards.set_row_spacing(12)
        self.top_cards.set_column_spacing(12)
        self.top_cards.insert(self.build_connection_card(), -1)
        self.top_cards.insert(self.build_diagnostics_card(), -1)
        content.append(self.top_cards)

        content.append(self.build_knob_section())
        return scroller

    def build_hero_card(self) -> Gtk.Box:
        card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        card.add_css_class("hero-card")

        self.hero_title_label = Gtk.Label(xalign=0, wrap=True)
        self.hero_title_label.add_css_class("title-1")
        card.append(self.hero_title_label)

        self.hero_description_label = Gtk.Label(xalign=0, wrap=True)
        self.hero_description_label.add_css_class("dim-label")
        card.append(self.hero_description_label)

        self.hero_status = Gtk.Label(xalign=0, wrap=True)
        card.append(self.hero_status)
        return card

    def build_connection_card(self) -> Gtk.Box:
        card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        card.add_css_class("section-card")
        card.set_size_request(520, -1)

        self.connection_heading = Gtk.Label(xalign=0)
        self.connection_heading.add_css_class("title-3")
        card.append(self.connection_heading)

        self.port_caption = Gtk.Label(xalign=0)
        self.port_caption.add_css_class("dim-label")
        card.append(self.port_caption)

        port_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        self.port_model = Gtk.StringList()
        self.port_dropdown = Gtk.DropDown(model=self.port_model)
        self.port_dropdown.set_hexpand(True)
        self.port_dropdown.connect("notify::selected", self.on_port_changed)
        port_row.append(self.port_dropdown)

        self.refresh_button = Gtk.Button()
        self.refresh_button.connect("clicked", self.on_refresh_clicked)
        port_row.append(self.refresh_button)
        card.append(port_row)

        auto_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        auto_label_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        self.auto_title_label = Gtk.Label(xalign=0)
        self.auto_title_label.add_css_class("title-4")
        self.auto_subtitle_label = Gtk.Label(xalign=0, wrap=True)
        self.auto_subtitle_label.add_css_class("dim-label")
        auto_label_box.append(self.auto_title_label)
        auto_label_box.append(self.auto_subtitle_label)
        auto_label_box.set_hexpand(True)
        auto_row.append(auto_label_box)

        self.auto_connect_switch = Gtk.Switch(active=self.app.settings.auto_connect)
        self.auto_connect_switch.connect("notify::active", self.on_auto_connect_toggled)
        self.auto_connect_switch.set_sensitive(not self.runtime_options.demo_mode)
        auto_row.append(self.auto_connect_switch)
        card.append(auto_row)

        button_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        self.connect_button = Gtk.Button()
        self.connect_button.add_css_class("suggested-action")
        self.connect_button.connect("clicked", self.on_connect_clicked)
        button_row.append(self.connect_button)

        self.disconnect_button = Gtk.Button()
        self.disconnect_button.add_css_class("destructive-action")
        self.disconnect_button.connect("clicked", self.on_disconnect_clicked)
        button_row.append(self.disconnect_button)
        card.append(button_row)

        self.connection_title_label = Gtk.Label(xalign=0)
        self.connection_title_label.add_css_class("title-4")
        card.append(self.connection_title_label)

        self.connection_detail_label = Gtk.Label(xalign=0, wrap=True)
        self.connection_detail_label.add_css_class("dim-label")
        card.append(self.connection_detail_label)
        return card

    def build_diagnostics_card(self) -> Gtk.Box:
        card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        card.add_css_class("section-card")
        card.set_size_request(420, -1)

        self.diagnostics_heading = Gtk.Label(xalign=0)
        self.diagnostics_heading.add_css_class("title-3")
        card.append(self.diagnostics_heading)

        self.audio_snapshot_label = Gtk.Label(xalign=0, wrap=True)
        card.append(self.audio_snapshot_label)

        self.active_apps_label = Gtk.Label(xalign=0, wrap=True)
        self.active_apps_label.add_css_class("dim-label")
        card.append(self.active_apps_label)

        self.serial_line_label = Gtk.Label(xalign=0, wrap=True)
        self.serial_line_label.add_css_class("dim-label")
        card.append(self.serial_line_label)

        self.diag_hint_label = Gtk.Label(xalign=0, wrap=True)
        self.diag_hint_label.add_css_class("dim-label")
        card.append(self.diag_hint_label)
        return card

    def build_knob_section(self) -> Gtk.Box:
        section = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)

        self.mapping_heading = Gtk.Label(xalign=0)
        self.mapping_heading.add_css_class("title-3")
        section.append(self.mapping_heading)

        self.knob_flow = Gtk.FlowBox()
        self.knob_flow.set_selection_mode(Gtk.SelectionMode.NONE)
        self.knob_flow.set_max_children_per_line(3)
        self.knob_flow.set_min_children_per_line(1)
        self.knob_flow.set_row_spacing(12)
        self.knob_flow.set_column_spacing(12)

        self.knob_cards: list[KnobCard] = []
        for knob_index, pin_name in enumerate(("A0", "A1", "A2")):
            card = KnobCard(knob_index, pin_name, KNOB_COLORS[knob_index])
            card.target_dropdown.connect(
                "notify::selected", self.on_knob_target_changed, knob_index
            )
            self.knob_cards.append(card)
            self.knob_flow.insert(card, -1)

        section.append(self.knob_flow)
        return section

    def install_css(self) -> None:
        provider = Gtk.CssProvider()
        provider.load_from_data(
            b"""
            window {
              background:
                radial-gradient(circle at top, rgba(48, 79, 120, 0.12), transparent 32%),
                linear-gradient(180deg, rgba(12, 18, 28, 1), rgba(7, 11, 18, 1));
            }

            .hero-card {
              padding: 24px;
              border-radius: 28px;
              background-image: linear-gradient(135deg, rgba(18, 53, 87, 0.92), rgba(14, 26, 44, 0.88));
              border: 1px solid rgba(113, 178, 255, 0.26);
              box-shadow: 0 20px 34px rgba(0, 0, 0, 0.14);
            }

            .content-stage {
              background:
                radial-gradient(circle at top, rgba(48, 79, 120, 0.10), transparent 35%),
                linear-gradient(180deg, rgba(11, 17, 26, 0.98), rgba(7, 11, 18, 0.98));
              border-radius: 32px;
            }

            .section-card,
            .knob-card {
              padding: 20px;
              border-radius: 22px;
              background-color: alpha(@window_fg_color, 0.04);
              border: 1px solid alpha(@window_fg_color, 0.08);
              box-shadow: 0 14px 28px rgba(0, 0, 0, 0.10);
            }

            .dim-label {
              opacity: 0.74;
            }

            .status-badge {
              padding: 6px 12px;
              border-radius: 999px;
              background-color: alpha(@window_fg_color, 0.08);
              font-weight: 700;
            }
            """
        )

        display = Gdk.Display.get_default()
        if display is not None:
            Gtk.StyleContext.add_provider_for_display(
                display,
                provider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
            )
            Adw.StyleManager.get_default().set_color_scheme(
                Adw.ColorScheme.FORCE_DARK
            )

    def apply_language(self) -> None:
        self.set_title(self.translator.t("window_title"))
        self.header_title_label.set_label(self.translator.t("window_title"))
        self.header_subtitle_label.set_label(self.translator.t("header_subtitle"))
        self.language_dropdown.set_tooltip_text(
            self.translator.t("language_accessible")
        )

        self.hero_title_label.set_label(self.translator.t("hero_title"))
        self.hero_description_label.set_label(self.translator.t("hero_description"))

        self.connection_heading.set_label(self.translator.t("hardware_title"))
        self.port_caption.set_label(self.translator.t("port_label"))
        self.refresh_button.set_label(self.translator.t("rescan"))
        self.auto_title_label.set_label(self.translator.t("autoconnect_title"))
        self.auto_subtitle_label.set_label(
            self.translator.t("autoconnect_subtitle")
        )
        self.connect_button.set_label(self.translator.t("connect"))
        self.disconnect_button.set_label(self.translator.t("disconnect"))

        self.diagnostics_heading.set_label(self.translator.t("diagnostics_title"))
        self.mapping_heading.set_label(self.translator.t("mapping_title"))
        self.diag_hint_label.set_label(self.translator.t("diag_hint"))

        for card in self.knob_cards:
            card.apply_language(self.translator)
            card.refresh_selected_target_ui()

        self.refresh_targets_and_snapshot()
        self.serial_line_label.set_label(
            self.translator.t("last_serial", line=self.last_serial_line)
        )

        language_index = 0 if self.translator.language == "pt-BR" else 1
        if int(self.language_dropdown.get_selected()) != language_index:
            self.language_dropdown.set_selected(language_index)

    def format_status(self, status_key: str, payload: dict) -> tuple[str, str]:
        if status_key == "status_ready":
            return (
                self.translator.t("status_ready_title"),
                self.translator.t("status_ready_detail"),
            )
        if status_key == "status_demo":
            return (
                self.translator.t("status_demo_title"),
                self.translator.t("status_demo_detail"),
            )
        if status_key == "status_connecting":
            return (
                self.translator.t("status_connecting_title"),
                self.translator.t("status_connecting_detail"),
            )
        if status_key == "status_no_port":
            return (
                self.translator.t("status_no_port_title"),
                self.translator.t("status_no_port_detail"),
            )
        if status_key == "status_connected":
            detail_key = payload.get("detail_key", "status_connected_waiting")
            detail = self.translator.t(detail_key, **payload)
            return (
                self.translator.t("status_connected_title", port=payload.get("port", "")),
                detail,
            )
        if status_key == "status_open_failed":
            return (
                self.translator.t(
                    "status_open_failed_title", port=payload.get("port", "")
                ),
                payload.get("detail", ""),
            )
        if status_key == "status_connection_lost":
            return (
                self.translator.t(
                    "status_connection_lost_title", port=payload.get("port", "")
                ),
                payload.get("detail", ""),
            )
        if status_key == "status_manual_disconnect":
            return (
                self.translator.t("status_manual_disconnect_title"),
                self.translator.t("status_manual_disconnect_detail"),
            )
        return status_key, str(payload)

    def update_connection_state(
        self, status_key: str, connected: bool, payload: dict
    ) -> bool:
        title, detail = self.format_status(status_key, payload)
        self.connection_title_label.set_label(title)
        self.connection_detail_label.set_label(detail)
        self.hero_status.set_label(detail)

        if self.runtime_options.demo_mode:
            badge = self.translator.t("badge_demo")
        else:
            badge = (
                self.translator.t("badge_online")
                if connected
                else self.translator.t("badge_offline")
            )
        self.connection_badge.set_label(badge)

        self.connect_button.set_sensitive(
            (not connected) and (not self.runtime_options.demo_mode)
        )
        self.disconnect_button.set_sensitive(
            connected and (not self.runtime_options.demo_mode)
        )

        if not connected:
            for card in self.knob_cards:
                card.set_idle_state(self.translator.t("waiting_data"))

        return False

    def handle_knob_reading(self, knob_index: int, raw_value: int, serial_line: str) -> bool:
        if not 0 <= knob_index < len(self.knob_cards):
            return False

        target_identifier = self.knob_cards[knob_index].selected_target_identifier()
        volume = clamp_volume(raw_value / 1023.0)
        percent = int(round(volume * 100))

        try:
            success, detail = self.app.pulse.apply_target(target_identifier, volume)
        except Exception as exc:
            success, detail = False, str(exc)

        if success:
            ui_detail = detail
        else:
            ui_detail = self.translator.t("detail_target_unavailable", detail=detail)

        self.knob_cards[knob_index].update_reading(raw_value, percent, ui_detail)
        self.serial_line_label.set_label(
            self.translator.t("last_serial", line=serial_line)
        )
        self.last_serial_line = serial_line
        return False

    def refresh_serial_ports(self) -> None:
        ports = list_candidate_ports()
        labels = [format_port_label(port_info) for port_info in ports]
        values = [port_info.device for port_info in ports]

        preferred_port = self.app.settings.preferred_port
        if preferred_port and preferred_port not in values:
            labels.insert(0, preferred_port)
            values.insert(0, preferred_port)

        if not values:
            labels = [self.translator.t("port_none")]
            values = [""]

        self.port_labels = labels
        self.port_values = values

        while self.port_model.get_n_items() > 0:
            self.port_model.remove(0)
        for label in labels:
            self.port_model.append(label)

        selected_index = 0
        if preferred_port in values:
            selected_index = values.index(preferred_port)
        self.port_dropdown.set_selected(selected_index)

    def refresh_targets_and_snapshot(self) -> None:
        self.app.pulse.set_translator(self.translator)
        self.app.settings.knob_targets = normalize_knob_targets(
            self.app.settings.knob_targets
        )
        targets = self.app.pulse.list_targets(self.app.settings.knob_targets)

        self.suppress_knob_events = True
        for knob_index, card in enumerate(self.knob_cards):
            card.set_targets(targets, self.app.settings.knob_targets[knob_index])
        self.suppress_knob_events = False

        snapshot = self.app.pulse.diagnostics_summary()
        active_apps = self.app.pulse.active_applications()
        if active_apps:
            app_list = ", ".join(name for name, _count in active_apps[:8])
        else:
            app_list = (
                "nenhuma" if self.translator.language == "pt-BR" else "none"
            )

        self.audio_snapshot_label.set_label(
            self.translator.t("audio_state", summary=snapshot)
        )
        self.active_apps_label.set_label(
            self.translator.t("active_apps", apps=app_list)
        )

    def on_knob_target_changed(self, _dropdown, _param, knob_index: int) -> None:
        if self.suppress_knob_events:
            return
        self.knob_cards[knob_index].refresh_selected_target_ui()
        self.app.settings.knob_targets[knob_index] = self.knob_cards[
            knob_index
        ].selected_target_identifier()
        SettingsStore.save(self.app.settings)
        self.show_toast(
            self.translator.t("toast_knob_updated", index=knob_index + 1)
        )

    def on_port_changed(self, _dropdown, _param) -> None:
        selected_index = int(self.port_dropdown.get_selected())
        if 0 <= selected_index < len(self.port_values):
            self.app.settings.preferred_port = self.port_values[selected_index]
            SettingsStore.save(self.app.settings)

    def on_language_changed(self, _dropdown, _param) -> None:
        selected_index = int(self.language_dropdown.get_selected())
        language = "pt-BR" if selected_index == 0 else "en"
        if language == self.translator.language:
            return

        self.translator.set_language(language)
        self.app.settings.language = language
        self.app.pulse.set_translator(self.translator)
        SettingsStore.save(self.app.settings)
        self.apply_language()
        self.show_toast(
            self.translator.t(
                "toast_language_updated", language=LANGUAGE_LABELS[language]
            )
        )

    def on_auto_connect_toggled(self, switch: Gtk.Switch, _param) -> None:
        self.app.settings.auto_connect = switch.get_active()
        SettingsStore.save(self.app.settings)

    def on_refresh_clicked(self, _button) -> None:
        self.refresh_serial_ports()
        self.refresh_targets_and_snapshot()
        self.show_toast(self.translator.t("toast_ports_refreshed"))

    def on_connect_clicked(self, _button) -> None:
        self.app.start_serial_worker()
        self.show_toast(self.translator.t("toast_connection_started"))

    def on_disconnect_clicked(self, _button) -> None:
        self.app.stop_serial_worker()
        self.update_connection_state("status_manual_disconnect", False, {})
        self.show_toast(self.translator.t("toast_connection_stopped"))

    def on_periodic_port_refresh(self) -> bool:
        if self.runtime_options.demo_mode:
            return False
        self.refresh_serial_ports()
        return True

    def on_periodic_target_refresh(self) -> bool:
        self.refresh_targets_and_snapshot()
        return True

    def start_connection_once(self) -> bool:
        self.app.start_serial_worker()
        return False

    def on_demo_tick(self) -> bool:
        self.demo_phase += 0.055
        values = [
            int((math.sin(self.demo_phase + 0.0) * 0.5 + 0.5) * 1023),
            int((math.sin(self.demo_phase + 1.7) * 0.5 + 0.5) * 1023),
            int((math.sin(self.demo_phase + 3.4) * 0.5 + 0.5) * 1023),
        ]
        line = "|".join(str(value) for value in values)
        for knob_index, raw_value in enumerate(values):
            self.handle_knob_reading(knob_index, raw_value, line)
        self.update_connection_state("status_demo", True, {})
        return True

    def show_toast(self, text: str) -> None:
        if self.runtime_options.screenshot_path:
            return
        self.toast_overlay.add_toast(Adw.Toast.new(text))

    def prepare_screenshot_capture(self) -> bool:
        adjustment = self.main_scroller.get_vadjustment()
        max_value = max(
            adjustment.get_upper() - adjustment.get_page_size(),
            0.0,
        )
        adjustment.set_value(max_value * self.runtime_options.screenshot_scroll_ratio)
        GLib.timeout_add(250, self.export_screenshot_and_quit)
        return False

    def export_screenshot_and_quit(self) -> bool:
        path = Path(self.runtime_options.screenshot_path).expanduser()
        path.parent.mkdir(parents=True, exist_ok=True)

        width = self.get_width()
        height = self.get_height()
        if width <= 0 or height <= 0:
            return True

        paintable = Gtk.WidgetPaintable.new(self)
        snapshot = Gtk.Snapshot.new()
        paintable.snapshot(snapshot, width, height)
        node = snapshot.to_node()
        renderer = self.get_renderer()
        if node is None or renderer is None:
            return True

        texture = renderer.render_texture(node, None)
        texture.save_to_png(str(path))
        self.app.quit()
        return False

    def on_close_request(self, _window) -> bool:
        self.app.settings.window_width = max(self.get_width(), 720)
        self.app.settings.window_height = max(self.get_height(), 520)
        SettingsStore.save(self.app.settings)
        self.app.stop_serial_worker()
        return False


def parse_args() -> RuntimeOptions:
    parser = argparse.ArgumentParser(description="Ioruba desktop audio controller")
    parser.add_argument("--demo", action="store_true", help="Run with mock data")
    parser.add_argument(
        "--lang",
        choices=["pt-BR", "en"],
        help="Force UI language",
    )
    parser.add_argument(
        "--screenshot",
        help="Render the current window to a PNG file and exit",
    )
    parser.add_argument(
        "--width",
        type=int,
        default=0,
        help="Override initial window width",
    )
    parser.add_argument(
        "--height",
        type=int,
        default=0,
        help="Override initial window height",
    )
    parser.add_argument(
        "--scroll-ratio",
        type=float,
        default=0.0,
        help="Visible screenshot scroll position between 0.0 and 1.0",
    )
    args = parser.parse_args()
    return RuntimeOptions(
        demo_mode=args.demo,
        language_override=args.lang,
        screenshot_path=args.screenshot or "",
        width_override=max(args.width, 0),
        height_override=max(args.height, 0),
        screenshot_scroll_ratio=max(0.0, min(args.scroll_ratio, 1.0)),
    )


def main() -> int:
    options = parse_args()
    if not Gtk.init_check():
        translator = Translator(options.language_override or system_language())
        print(translator.t("runtime_no_display"))
        return 1

    app = AudioControllerApp(options)
    return app.run(None)


if __name__ == "__main__":
    raise SystemExit(main())
