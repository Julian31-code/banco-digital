import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDolar(amount: string | number | undefined | null): string {
  if (amount === undefined || amount === null) return "D$ 0,00000";
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return "D$ 0,00000";
  const [intPart, decPart] = num.toFixed(5).split(".");
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `D$ ${intFormatted},${decPart}`;
}

export function parseAmount(input: string): string {
  return input.replace(/,/g, '.');
}

export function extractError(err: any): string {
  if (!err) return "Ocurrió un error inesperado";
  return err?.response?.data?.error || err?.error || err?.message || err.toString();
}
