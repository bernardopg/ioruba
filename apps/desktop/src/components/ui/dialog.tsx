import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type SyntheticEvent,
} from "react";

import { translateText } from "@/lib/i18n";
import type { UiLanguage } from "@ioruba/shared";

interface DialogProps {
  children: ReactNode;
  description?: string;
  language: UiLanguage;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

export function Dialog({
  children,
  description,
  language,
  onOpenChange,
  open,
  title,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const lt = (text: string) => translateText(language, text);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
      dialog.querySelector<HTMLElement>("[data-dialog-autofocus]")?.focus();
      return;
    }

    if (!open) {
      if (dialog.open) {
        if (typeof dialog.close === "function") {
          dialog.close();
        } else {
          dialog.removeAttribute("open");
        }
      }
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    }
  }, [open]);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onOpenChange(false);
  }

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className="app-dialog"
      onCancel={handleCancel}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
      onClose={() => onOpenChange(false)}
      ref={dialogRef}
    >
      <div className="app-dialog-surface">
        <header className="app-dialog-header">
          <div>
            <h2 className="app-dialog-title" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className="app-dialog-description" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <button
            aria-label={lt("Fechar")}
            className="icon-button"
            data-dialog-autofocus
            onClick={() => onOpenChange(false)}
            title={lt("Fechar")}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>
        <div className="app-dialog-body">{children}</div>
      </div>
    </dialog>
  );
}
