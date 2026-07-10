import { Bell, ScrollText, Settings } from "lucide-react";
import { useState } from "react";

import { ChangelogDialog } from "@/components/shell/changelog-dialog";
import { NotificationsDialog } from "@/components/shell/notifications-dialog";
import { SettingsDialog } from "@/components/shell/settings-dialog";
import { translateText } from "@/lib/i18n";
import {
  selectUnreadNotificationCount,
  useIorubaStore,
} from "@/store/ioruba-store";
import type { UiLanguage } from "@ioruba/shared";

export function HeaderActions({ language }: { language: UiLanguage }) {
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const unreadCount = useIorubaStore(selectUnreadNotificationCount);
  const lt = (text: string) => translateText(language, text);

  return (
    <>
      <div aria-label={lt("Ações do aplicativo")} className="header-actions" role="toolbar">
        <button
          aria-label={lt("Abrir changelog")}
          className="icon-button"
          onClick={() => setChangelogOpen(true)}
          title={lt("Changelog")}
          type="button"
        >
          <ScrollText aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          aria-label={lt("Abrir notificações")}
          className="icon-button"
          onClick={() => setNotificationsOpen(true)}
          title={lt("Notificações")}
          type="button"
        >
          <Bell aria-hidden="true" className="h-4 w-4" />
          {unreadCount > 0 ? <span aria-hidden="true" className="notification-dot" /> : null}
        </button>
        <button
          aria-label={lt("Abrir configurações do app")}
          className="icon-button"
          onClick={() => setSettingsOpen(true)}
          title={lt("Configurações do app")}
          type="button"
        >
          <Settings aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <ChangelogDialog
        language={language}
        onOpenChange={setChangelogOpen}
        open={changelogOpen}
      />
      <NotificationsDialog
        language={language}
        onOpenChange={setNotificationsOpen}
        open={notificationsOpen}
      />
      <SettingsDialog
        language={language}
        onOpenChangelog={() => {
          setSettingsOpen(false);
          setChangelogOpen(true);
        }}
        onOpenChange={setSettingsOpen}
        open={settingsOpen}
      />
    </>
  );
}
