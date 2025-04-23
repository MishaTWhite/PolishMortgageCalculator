import { useLanguage, Language } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { GlobeIcon } from "lucide-react";

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const t = useTranslations(language);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: "pl", label: "Polski", flag: "🇵🇱" },
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "ua", label: "Українська", flag: "🇺🇦" }
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <GlobeIcon size={16} />
          <span>{languages.find(l => l.code === language)?.flag}</span>
          <span className="hidden md:inline">{languages.find(l => l.code === language)?.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={language === lang.code ? "bg-secondary" : ""}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}