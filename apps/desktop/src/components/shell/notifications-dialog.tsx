import { ExternalLink, Inbox } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { translateText } from "@/lib/i18n";
import { openExternalUrl } from "@/lib/open-external";
import { useIorubaStore } from "@/store/ioruba-store";
import type { UiLanguage } from "@ioruba/shared";

const REPOSITORY_URL = "https://github.com/bernardopg/ioruba";

interface NotificationsDialogProps {
  language: UiLanguage;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function NotificationsDialog({
  language,
  onOpenChange,
  open,
}: NotificationsDialogProps) {
  const notifications = useIorubaStore((state) => state.notifications);
  const markNotificationsRead = useIorubaStore((state) => state.markNotificationsRead);
  const appendWatchLog = useIorubaStore((state) => state.appendWatchLog);
  const lt = (text: string) => translateText(language, text);

  useEffect(() => {
    if (open) {
      markNotificationsRead();
    }
  }, [markNotificationsRead, open]);

  async function handleOpenUrl(url: string) {
    try {
      await openExternalUrl(url);
    } catch (error) {
      appendWatchLog({
        scope: "app",
        level: "error",
        message: "Falha ao abrir link externo",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Dialog
      description={lt("Atualizações e avisos do Ioruba.")}
      language={language}
      onOpenChange={onOpenChange}
      open={open}
      title={lt("Notificações")}
    >
      <div className="notification-panel">
        {notifications.length > 0 ? (
          <div className="notification-list">
            {notifications.map((notification) => (
              <article className="notification-item" key={notification.id}>
                <div className="notification-copy">
                  <p>{lt(notification.title)}</p>
                  {notification.detail ? <span>{lt(notification.detail)}</span> : null}
                </div>
                {notification.url ? (
                  <Button
                    aria-label={lt("Abrir release")}
                    onClick={() => void handleOpenUrl(notification.url!)}
                    size="small"
                    title={lt("Abrir release")}
                    variant="secondary"
                  >
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />
                    {lt("Abrir")}
                  </Button>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="notification-empty">
            <Inbox aria-hidden="true" className="h-5 w-5" />
            <p>{lt("Nenhuma notificação no momento.")}</p>
          </div>
        )}

        <footer className="notification-footer">
          <Button
            onClick={() => void handleOpenUrl(REPOSITORY_URL)}
            size="small"
            variant="ghost"
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            {lt("Repositório do projeto")}
          </Button>
        </footer>
      </div>
    </Dialog>
  );
}
