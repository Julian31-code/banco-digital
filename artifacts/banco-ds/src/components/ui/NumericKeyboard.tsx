import { Delete } from "lucide-react";
import { motion } from "framer-motion";

interface NumericKeyboardProps {
  value: string;
  onChange: (val: string) => void;
  maxDecimals?: number;
}

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [",", "0", "⌫"],
];

export function NumericKeyboard({ value, onChange, maxDecimals = 5 }: NumericKeyboardProps) {
  const handle = (key: string) => {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === ",") {
      if (value.includes(",")) return;
      if (value === "") { onChange("0,"); return; }
      onChange(value + ",");
      return;
    }
    const afterComma = value.split(",")[1];
    if (afterComma !== undefined && afterComma.length >= maxDecimals) return;
    if (value === "0" && key !== ",") { onChange(key); return; }
    if (value.length >= 15) return;
    onChange(value + key);
  };

  return (
    <div className="w-full max-w-xs mx-auto select-none">
      {KEYS.map((row, ri) => (
        <div key={ri} className="flex gap-2 mb-2">
          {row.map((k) => (
            <motion.button
              key={k}
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => handle(k)}
              className={`
                flex-1 h-14 rounded-2xl font-semibold text-xl flex items-center justify-center
                transition-colors duration-100 active:scale-90
                ${k === "⌫"
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : k === ","
                  ? "bg-muted/80 text-foreground hover:bg-muted"
                  : "bg-muted/60 text-foreground hover:bg-muted"
                }
              `}
            >
              {k === "⌫" ? <Delete className="w-5 h-5" /> : k}
            </motion.button>
          ))}
        </div>
      ))}
    </div>
  );
}
