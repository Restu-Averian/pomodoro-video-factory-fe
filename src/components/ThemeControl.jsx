import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const icons = { light: Sun, dark: Moon, system: Laptop };

export function ThemeControl() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const Icon = icons[theme === "system" ? "system" : resolvedTheme];

  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger
        className="w-9 px-2"
        aria-label={`Change theme. Current setting: ${theme}`}
      >
        <Icon aria-hidden="true" />
        <span className="sr-only"><SelectValue /></span>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          <SelectLabel>Theme</SelectLabel>
          <SelectItem value="light"><Sun aria-hidden="true" /> Light</SelectItem>
          <SelectItem value="dark"><Moon aria-hidden="true" /> Dark</SelectItem>
          <SelectItem value="system"><Laptop aria-hidden="true" /> System</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
