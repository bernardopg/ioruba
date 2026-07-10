import changelogRaw from "../../../../../CHANGELOG.md?raw";

import { Dialog } from "@/components/ui/dialog";
import { useAppVersion } from "@/hooks/use-app-version";
import { parseChangelog } from "@/lib/changelog";
import { translateText } from "@/lib/i18n";
import type { UiLanguage } from "@ioruba/shared";

const releases = parseChangelog(changelogRaw);

interface ChangelogDialogProps {
  language: UiLanguage;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function ChangelogDialog({
  language,
  onOpenChange,
  open,
}: ChangelogDialogProps) {
  const version = useAppVersion();
  const lt = (text: string) => translateText(language, text);

  return (
    <Dialog
      description={`${lt("Versão em execução")}: v${version}`}
      language={language}
      onOpenChange={onOpenChange}
      open={open}
      title={lt("Changelog")}
    >
      <div className="changelog-list">
        {releases.map((release, index) => (
          <details key={release.version} open={index === 0}>
            <summary>
              <span>v{release.version}</span>
              {release.version === version ? (
                <strong>{lt("Em execução")}</strong>
              ) : null}
              {release.date ? <time>{release.date}</time> : null}
            </summary>
            <div className="changelog-release">
              {release.sections.map((section) => (
                <section key={section.title}>
                  <h3>{section.title}</h3>
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </details>
        ))}
      </div>
    </Dialog>
  );
}
