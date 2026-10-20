import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { defaultPersistedState } from "../packages/shared/src/defaults.ts";

// Native WebKit + real Tauri IPC; isolate settings and use an unmatched audio target.
const root = path.resolve(import.meta.dirname, "..");
const binary = process.env.IORUBA_BINARY ?? path.join(root, "apps/desktop/src-tauri/target/release/ioruba-desktop");
const port = Number(process.env.IORUBA_WEBDRIVER_PORT ?? 4454);
const base = `http://127.0.0.1:${port}`;
const artifacts = await mkdtemp(path.join(tmpdir(), "ioruba-native-test-"));
const config = path.join(artifacts, "config", "io.ioruba.desktop");
await mkdir(config, { recursive: true });
const shellHome = path.join(artifacts, "home");
await mkdir(path.join(shellHome, ".config"), { recursive: true });
const state = structuredClone(defaultPersistedState);
state.demoMode = false;
state.profiles[0].serial.autoConnect = false;
state.profiles[0].ui.language = "pt-BR";
state.profiles[0].sliders.forEach(s => { s.targets = [{ kind: "application", name: "ioruba-native-test-no-stream" }]; });
if (process.env.IORUBA_TEST_SERIAL_PORT) state.profiles[0].serial.preferredPort = process.env.IORUBA_TEST_SERIAL_PORT;
await writeFile(path.join(config, "ioruba-state.json"), JSON.stringify(state));
console.log(`Native test artifacts: ${artifacts}`);

await test("Linux native app", { timeout: 180_000 }, async t => {
  const driver = spawn("tauri-driver", ["--port", String(port), "--native-port", String(port + 1)], {
    env: { ...process.env, ...(process.env.IORUBA_TEST_DESKTOP_SHELL ? { HOME: shellHome } : {}), DISPLAY: process.env.DISPLAY ?? ":0", GDK_BACKEND: "x11",
      XDG_CONFIG_HOME: path.dirname(config), XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR ?? `/run/user/${process.getuid()}`,
      DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS ?? `unix:path=/run/user/${process.getuid()}/bus` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "", spawnError;
  driver.on("error", error => { spawnError = error; });
  driver.stdout.on("data", data => { output += data; });
  driver.stderr.on("data", data => { output += data; });
  let id;
  async function request(method, route, data) {
    const response = await fetch(base + route, { method, headers: { "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(45_000) });
    const body = await response.json();
    assert.ok(response.ok && !body.value?.error, JSON.stringify(body));
    return body.value;
  }
  const execute = (script, ...args) => request("POST", `/session/${id}/execute/sync`, { script, args });
  const ipc = (command, args = {}) => request("POST", `/session/${id}/execute/async`, {
    script: "const done=arguments[arguments.length-1];window.__TAURI_INTERNALS__.invoke(arguments[0],arguments[1]).then(x=>done({ok:true,value:x})).catch(e=>done({ok:false,error:String(e)}))", args: [command, args],
  });
  async function until(check, message) {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) { if (await check()) return; await delay(100); }
    assert.fail(message);
  }
  async function click(script, ...args) {
    const element = await execute(script, ...args);
    assert.ok(element, `Missing control: ${args}`);
    await request("POST", `/session/${id}/element/${Object.values(element)[0]}/click`, {});
  }
  const tab = label => click('return [...document.querySelectorAll("[role=tab]")].find(x=>x.innerText===arguments[0])', label);
  const button = label => click('return [...document.querySelectorAll("button")].find(x=>x.innerText===arguments[0])', label);
  const text = () => execute("return document.body.innerText");
  async function shot(name) { await writeFile(path.join(artifacts, `${name}.png`), Buffer.from(await request("GET", `/session/${id}/screenshot`), "base64")); }
  try {
    await until(async () => {
      if (spawnError) throw spawnError;
      if (driver.exitCode !== null) throw new Error(output);
      try { await request("GET", "/status"); return true; } catch { return false; }
    }, "tauri-driver did not start; install tauri-driver and WebKitWebDriver");
    const session = await request("POST", "/session", { capabilities: { alwaysMatch: { "tauri:options": { application: binary } } } });
    id = session.sessionId;
    await request("POST", `/session/${id}/timeouts`, { script: 20_000 });
    await t.test("boots with real Linux audio inventory and isolated persistence", async () => {
      await until(async () => (await ipc("load_watch_log_entries")).value?.some(x => x.message === "Boot do runtime concluido"), "App failed to boot");
      assert.equal(await execute("return !!window.__TAURI_INTERNALS__"), true);
      const inventory = await ipc("list_audio_inventory");
      assert.equal(inventory.ok, true);
      assert.equal(inventory.value.backend, "pactl");
      const saved = await ipc("load_persisted_state");
      assert.equal(JSON.parse(saved.value).profiles[0].serial.autoConnect, false);
    });
    await t.test("mixer opens first and destination editing focuses the correct channel", async () => {
      assert.equal(await execute('return document.querySelector("[role=tab][aria-selected=true]").innerText'), "Mixer");
      assert.equal(await execute('return document.querySelectorAll(".channel-level meter").length'), 3);
      assert.equal(await execute('return document.querySelector(".channel-percent").textContent'), "—");
      await click("return document.querySelector(arguments[0])", 'button[aria-label^="Editar destinos"]');
      await until(async () => await execute('return document.activeElement.id === "profile-channel-0"'), "Channel editor did not receive focus");
      await tab("Mixer");
    });
    await t.test("real PulseAudio sink, source, application volumes and mute", async () => {
      const env = { ...process.env, LC_ALL: "C", XDG_RUNTIME_DIR: `/run/user/${process.getuid()}`,
        DBUS_SESSION_BUS_ADDRESS: `unix:path=/run/user/${process.getuid()}/bus` };
      const pactl = (...args) => execFileSync("pactl", args, { env, encoding: "utf8" });
      const sink = `ioruba_test_${process.pid}`;
      const moduleId = pactl("load-module", "module-null-sink", `sink_name=${sink}`).trim();
      const player = spawn("pacat", ["--playback", "--raw", "--rate=8000", "--channels=1", "--format=s16le", `--device=${sink}`, "--client-name=ioruba-native-audio", "/dev/zero"], { env, stdio: "ignore" });
      try {
        await until(async () => JSON.parse(pactl("--format=json", "list", "sink-inputs")).some(x=>x.properties["application.name"] === "ioruba-native-audio"), "Test audio stream did not start");
        await delay(300);
        const applied = await ipc("apply_slider_targets_batch", { request: { sliders: [
          { sliderId: 20, sliderName: "sink", normalizedValue: 0.37, targets: [{ kind: "sink", name: sink }] },
          { sliderId: 21, sliderName: "source", normalizedValue: 0.46, targets: [{ kind: "source", name: `${sink}.monitor` }] },
          { sliderId: 22, sliderName: "application", normalizedValue: 0.29, targets: [{ kind: "application", name: "ioruba-native-audio" }] },
        ] } });
        assert.equal(applied.ok, true);
        for (const outcome of Object.values(applied.value.outcomes)) assert.equal(outcome.severity, "success");
        assert.match(pactl("get-sink-volume", sink), /37%/);
        assert.match(pactl("get-source-volume", `${sink}.monitor`), /46%/);
        const stream = JSON.parse(pactl("--format=json", "list", "sink-inputs")).find(x=>x.properties["application.name"] === "ioruba-native-audio");
        assert.equal(Object.values(stream.volume)[0].value_percent, "29%");
        const muted = await ipc("dispatch_control_action", { action: "mute", target: { kind: "sink", name: sink } });
        assert.equal(muted.value.supported, true);
        assert.match(pactl("get-sink-mute", sink), /yes/);
      } finally { player.kill("SIGTERM"); pactl("unload-module", moduleId); }
    });
    await execute(await readFile(path.join(root, "node_modules/axe-core/axe.min.js"), "utf8"));
    await t.test("all nine sections render and keyboard tabs select a section", async () => {
      for (const name of ["Home", "Painel de controle", "Mixer", "Telemetria", "Hardware", "Diagnósticos", "Perfis", "Editor", "Avançado"]) {
        await tab(name);
        assert.ok(await execute('return document.querySelector("[role=tabpanel]").innerText.length > 80'));
        await shot(name.replaceAll(" ", "-"));
        const accessibility = await request("POST", `/session/${id}/execute/async`, {
          script: "const done=arguments[arguments.length-1];axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}}).then(x=>done({violations:x.violations,incomplete:x.incomplete.map(i=>i.id)}))", args: [],
        });
        await writeFile(path.join(artifacts, `accessibility-${name}.json`), JSON.stringify(accessibility, null, 2));
        assert.deepEqual(accessibility.violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.map(n=>n.target)})), [], `Accessibility: ${name}`);
      }
      await tab("Home");
      const active = await execute('return document.querySelector("[role=tab][aria-selected=true]")');
      await request("POST", `/session/${id}/element/${Object.values(active)[0]}/value`, { text: "\uE015" });
      assert.equal(await execute('return document.querySelector("[role=tab][aria-selected=true]").innerText'), "Painel de controle");
    });
    await t.test("all sections fit window widths from 640 to 1920 pixels", async () => {
      const report = [];
      for (const width of [640, 800, 1024, 1280, 1440, 1920]) {
        await request("POST", `/session/${id}/window/rect`, { width, height: 900 });
        for (const name of ["Mixer", "Home", "Painel de controle", "Telemetria", "Hardware", "Diagnósticos", "Perfis", "Editor", "Avançado"]) {
          await tab(name);
          const layout = await execute('return {width:innerWidth,scroll:document.scrollingElement.scrollWidth}');
          report.push({ requestedWidth: width, name, ...layout });
          assert.ok(Math.abs(layout.width - width) < 40, `Window resize did not apply: ${JSON.stringify(layout)}`);
          assert.ok(layout.scroll <= layout.width + 1, `Horizontal overflow: ${name} ${JSON.stringify(layout)}`);
        }
        await tab("Mixer"); await execute("window.scrollTo(0,0)");
        await shot(`mixer-${width}`);
      }
      await writeFile(path.join(artifacts, "responsive.json"), JSON.stringify(report, null, 2));
      await request("POST", `/session/${id}/window/rect`, { width: 1440, height: 900 });
    });
    await t.test("mixer text meets AA contrast in light and dark themes", async () => {
      const report = [];
      const option = theme => click('return document.querySelector(`dialog[open] option[value="${arguments[0]}"]`)', theme);
      const close = async () => {
        const focused = await execute("return document.activeElement");
        await request("POST", `/session/${id}/element/${Object.values(focused)[0]}/value`, { text: "\uE00C" });
      };
      for (const theme of ["light", "dark", "system"]) {
        await click("return document.querySelector(arguments[0])", 'button[aria-label="Abrir configurações do app"]');
        await option(theme);
        await until(async () => JSON.parse((await ipc("load_persisted_state")).value).profiles[0].ui.theme === theme, "Theme did not persist");
        await close(); await tab("Mixer"); await delay(250);
        if (theme === "system") break;
        const samples = await execute(`
          const ctx = document.createElement('canvas').getContext('2d');
          const luminance = color => {
            ctx.clearRect(0,0,1,1); ctx.fillStyle=color; ctx.fillRect(0,0,1,1);
            return [...ctx.getImageData(0,0,1,1).data].slice(0,3).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[0.2126,0.7152,0.0722][i],0);
          };
          return ['.channel-level-label','.channel-number','.channel-percent','.workspace-heading p','.mixer-actions button','.brand-lockup small','.sidebar-nav-group-label'].map(selector=>{
            const node=document.querySelector(selector), foreground=getComputedStyle(node).color;
            let parent=node, background;
            while(parent){background=getComputedStyle(parent).backgroundColor;if(background!=='rgba(0, 0, 0, 0)'&&!background.includes('/ 0)'))break;parent=parent.parentElement;}
            const a=luminance(foreground),b=luminance(background);
            return {selector,foreground,background,ratio:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)};
          });
        `);
        report.push({ theme, samples });
        for (const sample of samples) assert.ok(sample.ratio >= 4.5, `Contrast: ${theme} ${JSON.stringify(sample)}`);
        await shot(`mixer-${theme}`);
      }
      await writeFile(path.join(artifacts, "contrast.json"), JSON.stringify(report, null, 2));
    });
    await t.test("demo starts, produces telemetry and stops without serial hardware", async () => {
      await tab("Painel de controle");
      const toggle = () => click('return [...document.querySelectorAll("[role=switch]")].find(x=>document.getElementById(x.getAttribute("aria-labelledby"))?.textContent==="Modo demo")');
      await toggle();
      await until(async () => (await text()).includes("demo"), "Demo did not start");
      await delay(1000);
      await tab("Telemetria");
      assert.match(await text(), /tick [1-9]|TICK\n[1-9]/i);
      await tab("Painel de controle"); await toggle();
    });
    await t.test("settings dialog closes with Escape and restores focus", async () => {
      await click("return document.querySelector(arguments[0])", 'button[aria-label="Abrir configurações do app"]');
      assert.ok(await execute('return !!document.querySelector("dialog[open]")'));
      const focused = await execute("return document.activeElement");
      await request("POST", `/session/${id}/element/${Object.values(focused)[0]}/value`, { text: "\uE00C" });
      await until(async () => !(await execute('return !!document.querySelector("dialog[open]")')), "Escape did not close settings");
      assert.equal(await execute('return document.activeElement.getAttribute("aria-label")'), "Abrir configurações do app");
    });
    await t.test("language and theme update live, persist and identify the document language", async () => {
      await click("return document.querySelector(arguments[0])", 'button[aria-label="Abrir configurações do app"]');
      const option = (index, value) => click('return [...document.querySelectorAll("dialog[open] select")][arguments[0]].querySelector(`option[value="${arguments[1]}"]`)', index, value);
      try {
        for (const [language, title] of [["en", "App settings"], ["es", "Configuración de la aplicación"], ["pt-BR", "Configurações do app"]]) {
          await option(0, language);
          assert.equal(await execute('return document.querySelector("dialog[open] h2").textContent'), title);
          await until(async () => JSON.parse((await ipc("load_persisted_state")).value).profiles[0].ui.language === language, "Language was not saved");
          assert.equal(await execute("return document.documentElement.lang"), language);
        }
        for (const theme of ["light", "dark", "system"]) {
          await option(1, theme);
          assert.equal(await execute("return document.documentElement.dataset.themeSource"), theme);
          await until(async () => JSON.parse((await ipc("load_persisted_state")).value).profiles[0].ui.theme === theme, "Theme was not saved");
        }
      } finally {
        await option(0, "pt-BR"); await option(1, "system");
        const focused = await execute("return document.activeElement");
        await request("POST", `/session/${id}/element/${Object.values(focused)[0]}/value`, { text: "\uE00C" });
      }
    });
    await t.test("invalid profile JSON cannot overwrite the saved profile", async () => {
      await tab("Avançado");
      const before = (await ipc("load_persisted_state")).value;
      const element = await execute("return document.querySelector('textarea')");
      const route = `/session/${id}/element/${Object.values(element)[0]}`;
      await request("POST", route + "/clear", {});
      await request("POST", route + "/value", { text: "{broken json" });
      assert.equal(await execute('return [...document.querySelectorAll("button")].find(x=>x.innerText==="Salvar perfil").disabled'), true);
      await delay(350);
      assert.equal((await ipc("load_persisted_state")).value, before);
      assert.match(await text(), /JSON|inválid|erro/i);
    });
    if (process.env.IORUBA_TEST_DESKTOP_SHELL) {
      const xdo = (...args) => execFileSync("xdotool", args, { encoding: "utf8" }).trim();
      async function chooser(title, destination) {
        let win;
        await until(async () => {
          try { win = xdo("search", "--onlyvisible", "--name", `^${title}$`).split("\n")[0]; return !!win; } catch { return false; }
        }, `Native chooser missing: ${title}`);
        await delay(200);
        xdo("windowfocus", "--sync", win);
        if (destination === null) { xdo("key", "Escape"); return; }
        xdo("key", "ctrl+l");
        xdo("key", "ctrl+a");
        xdo("type", "--clearmodifiers", "--", destination);
        xdo("key", "Return");
        await delay(250);
        // GTK save dialogs can require explicit Save after accepting the location.
        try { if (xdo("search", "--onlyvisible", "--name", `^${title}$`)) xdo("key", "alt+s"); } catch {}
      }
      const tray = action => JSON.parse(execFileSync("/usr/bin/python", [path.join(root, "scripts/linux-tray-probe.py"), path.dirname(config), ...(action ? [action] : [])], { encoding: "utf8" }));
      await t.test("close hides the live app and the real desktop tray menu restores it", async () => {
        const item = tray();
        assert.match(JSON.stringify(item.layout), /Sair/);
        await writeFile(path.join(artifacts, "tray.json"), JSON.stringify(item, null, 2));
        const win = xdo("search", "--onlyvisible", "--pid", String(item.pid), "--name", "Ioruba").split("\n")[0];
        execFileSync("/usr/bin/python", [path.join(root, "scripts/linux-close-window.py"), win]);
        await until(async () => (await ipc("plugin:window|is_visible", { label: "main" })).value === false, "Close did not hide window");
        tray("Abrir Ioruba");
        await until(async () => (await ipc("plugin:window|is_visible", { label: "main" })).value === true, "Tray did not restore window");
      });
      await t.test("login preference creates and removes an isolated real autostart entry", async () => {
        assert.equal((await ipc("get_launch_on_login_enabled")).value, false);
        await tab("Painel de controle");
        await click("return document.querySelector(arguments[0])", '[role="switch"][aria-labelledby="launch-on-login-title"]');
        await until(async () => (await ipc("get_launch_on_login_enabled")).value === true, "Login switch did not enable autostart");
        await until(async () => JSON.parse((await ipc("load_persisted_state")).value).launchOnLogin === true, "Login setting not persisted");
        const entry = await readFile(path.join(shellHome, ".config", "autostart", "Ioruba.desktop"), "utf8");
        assert.match(entry, /--autostart/);
        assert.ok(entry.includes(binary), "Autostart must use the tested executable");
        await writeFile(path.join(artifacts, "autostart.desktop"), entry);
        assert.equal((await ipc("get_launch_on_login_enabled")).value, true);
        await click("return document.querySelector(arguments[0])", '[role="switch"][aria-labelledby="launch-on-login-title"]');
        await until(async () => (await ipc("get_launch_on_login_enabled")).value === false, "Login switch did not disable autostart");
        await until(async () => JSON.parse((await ipc("load_persisted_state")).value).launchOnLogin === false, "Disabled login setting not persisted");
        await assert.rejects(readFile(path.join(shellHome, ".config", "autostart", "Ioruba.desktop")), { code: "ENOENT" });
      });
      await t.test("native profile, telemetry and watch-log choosers save valid files and cancel safely", async () => {
        await tab("Perfis");
        const profilePath = path.join(artifacts, "exported-profile.json");
        await button("Exportar perfil");
        await chooser("Exportar perfil", profilePath);
        await until(async () => { try { return !!JSON.parse(await readFile(profilePath, "utf8")); } catch { return false; } }, "Profile export is not valid JSON");
        const savedProfile = (await ipc("load_persisted_state")).value;
        await button("Exportar perfil"); await chooser("Exportar perfil", null);
        assert.equal((await ipc("load_persisted_state")).value, savedProfile);
        await tab("Mixer"); await button("Experimentar demo");
        await tab("Telemetria");
        await until(async () => await execute('return !document.querySelector(\'button[aria-label="Exportar estatísticas em JSON"]\').disabled'), "Demo produced no exportable samples");
        for (const format of ["JSON", "CSV"]) {
          const destination = path.join(artifacts, `exported-stats.${format.toLowerCase()}`);
          await click('return document.querySelector(arguments[0])', `button[aria-label="Exportar estatísticas em ${format}"]`);
          await chooser("Exportar estatisticas da sessao", destination);
          await until(async () => { try { return (await readFile(destination, "utf8")).length > 0; } catch { return false; } }, `No ${format} export`);
          const content = await readFile(destination, "utf8");
          if (format === "JSON") assert.ok(JSON.parse(content).sampleCount > 0);
          else assert.ok(content.includes(",") && content.includes("\n"));
          await click('return document.querySelector(arguments[0])', `button[aria-label="Exportar estatísticas em ${format}"]`);
          await chooser("Exportar estatisticas da sessao", null);
          assert.equal(await readFile(destination, "utf8"), content);
        }
        await tab("Mixer"); await button("Sair do demo");
        await tab("Diagnósticos");
        await button("Exportar");
        const logPath = path.join(artifacts, "exported-watch.jsonl");
        await chooser("Exportar watch log", logPath);
        await until(async () => { try { return (await readFile(logPath, "utf8")).length > 0; } catch { return false; } }, "No watch export");
        for (const line of (await readFile(logPath, "utf8")).trim().split("\n")) assert.ok(JSON.parse(line).message);
        await button("Exportar"); await chooser("Exportar watch log", null);
        await until(async () => !(await text()).includes("Exportando"), "Cancel left export busy");
      });
    }
    if (process.env.IORUBA_TEST_SERIAL_PORT) await t.test("physical controller handshakes and sends frames", async () => {
      await tab("Painel de controle"); await button("Conectar");
      await until(async () => (await text()).includes("Recebendo dados"), "No physical serial frames");
      await tab("Hardware");
      await until(async () => (await text()).includes("protocolo 2"), "No protocol-2 controller handshake");
      await shot("physical-controller");
      await tab("Painel de controle"); await button("Desconectar");
    });
    const logs = await ipc("load_watch_log_entries");
    await writeFile(path.join(artifacts, "watch-log.json"), JSON.stringify(logs.value, null, 2));
    await shot("final");
    assert.equal(JSON.parse(await readFile(path.join(config, "ioruba-state.json"), "utf8")).profiles[0].serial.autoConnect, false);
    if (process.env.IORUBA_TEST_DESKTOP_SHELL) await t.test("autostart launches hidden, tray opens it and Quit ends the process", async () => {
      await request("DELETE", `/session/${id}`); id = undefined;
      await delay(500);
      const session = await request("POST", "/session", { capabilities: { alwaysMatch: { "tauri:options": { application: binary, args: ["--autostart"] } } } });
      id = session.sessionId;
      const tray = action => JSON.parse(execFileSync("/usr/bin/python", [path.join(root, "scripts/linux-tray-probe.py"), path.dirname(config), ...(action ? [action] : [])], { encoding: "utf8" }));
      await until(async () => (await ipc("plugin:window|is_visible", { label: "main" })).value === false, "Autostart window was not hidden");
      const item = tray("Abrir Ioruba");
      await until(async () => (await ipc("plugin:window|is_visible", { label: "main" })).value === true, "Autostart tray did not restore");
      await shot("autostart-restored");
      tray("Sair");
      await until(async () => { try { process.kill(item.pid, 0); return false; } catch { return true; } }, "Tray Quit did not exit");
    });
  } finally {
    if (id) await request("DELETE", `/session/${id}`).catch(() => {});
    driver.kill("SIGTERM");
    await writeFile(path.join(artifacts, "driver.log"), output);
  }
});
