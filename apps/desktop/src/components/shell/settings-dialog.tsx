import { ScrollText } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAppVersion } from "@/hooks/use-app-version";
import { setLaunchOnLoginEnabled } from "@/lib/backend";
import { translateText } from "@/lib/i18n";
import { useIorubaStore } from "@/store/ioruba-store";
import { resolveActiveProfile, type ThemeMode, type UiLanguage } from "@ioruba/shared";

interface SettingsDialogProps {
  language: UiLanguage;
  onOpenChangelog: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function SettingsDialog({
  language,
  onOpenChangelog,
  onOpenChange,
  open,
}: SettingsDialogProps) {
  const persisted = useIorubaStore((state) => state.persisted);
  const setLanguage = useIorubaStore((state) => state.setLanguage);
  const setThemeMode = useIorubaStore((state) => state.setThemeMode);
  const setNotificationsEnabled = useIorubaStore(
    (state) => state.setNotificationsEnabled,
  );
  const setLaunchOnLogin = useIorubaStore((state) => state.setLaunchOnLogin);
  const appendWatchLog = useIorubaStore((state) => state.appendWatchLog);
  const [launchPending, setLaunchPending] = useState(false);
  const version = useAppVersion();
  const notificationId = useId();
  const launchId = useId();
  const activeProfile = resolveActiveProfile(persisted);
  const lt = (text: string) => translateText(language, text);

  async function handleLaunchOnLogin(checked: boolean) {
    setLaunchPending(true);
    try {
      setLaunchOnLogin(await setLaunchOnLoginEnabled(checked));
    } catch (error) {
      appendWatchLog({
        scope: "app",
        level: "error",
        message: "Falha ao atualizar inicializacao com a sessao",
        detail: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLaunchPending(false);
    }
  }

  return (
    <Dialog
      description={lt("Preferências do perfil ativo e do aplicativo.")}
      language={language}
      onOpenChange={onOpenChange}
      open={open}
      title={lt("Configurações do app")}
    >
      <div className="settings-dialog-fields">
        <label className="grid gap-2">
          <span className="settings-dialog-label">{lt("Idioma")}</span>
          <select
            className="field"
            onChange={(event) => setLanguage(event.currentTarget.value as UiLanguage)}
            value={activeProfile.ui.language}
          >
            <option value="pt-BR">{lt("Português (Brasil)")}</option>
            <option value="en">{lt("English")}</option>
            <option value="es">{lt("Español")}</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="settings-dialog-label">{lt("Tema")}</span>
          <select
            className="field"
            onChange={(event) => setThemeMode(event.currentTarget.value as ThemeMode)}
            value={activeProfile.ui.theme}
          >
            <option value="system">{lt("Seguir sistema")}</option>
            <option value="light">{lt("Claro de bancada")}</option>
            <option value="dark">{lt("Escuro de estúdio")}</option>
          </select>
        </label>

        <div className="settings-dialog-toggle">
          <div>
            <p id={`${notificationId}-title`}>{lt("Notificações de release")}</p>
            <span id={`${notificationId}-description`}>
              {lt("Avisa quando uma versão mais recente estiver disponível.")}
            </span>
          </div>
          <Switch
            aria-describedby={`${notificationId}-description`}
            aria-labelledby={`${notificationId}-title`}
            checked={persisted.notificationsEnabled !== false}
            onCheckedChange={setNotificationsEnabled}
          />
        </div>

        <div className="settings-dialog-toggle">
          <div>
            <p id={`${launchId}-title`}>{lt("Iniciar com o sistema")}</p>
            <span id={`${launchId}-description`}>
              {lt("Mantém o Ioruba disponível no tray após o login.")}
            </span>
          </div>
          <Switch
            aria-describedby={`${launchId}-description`}
            aria-labelledby={`${launchId}-title`}
            checked={persisted.launchOnLogin}
            disabled={launchPending}
            onCheckedChange={(checked) => void handleLaunchOnLogin(checked)}
          />
        </div>

        <div className="settings-dialog-version">
          <div>
            <span>{lt("Versão em execução")}</span>
            <strong>v{version}</strong>
          </div>
          <Button onClick={onOpenChangelog} size="small" variant="secondary">
            <ScrollText aria-hidden="true" className="h-4 w-4" />
            {lt("Ver changelog")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
