<<<<<<< HEAD
import { type ClassValue, clsx } from "clsx";
=======
import * as React from "react";
import { clsx, type ClassValue } from "clsx";
>>>>>>> e63d312175e71fdd5328c4dfe59657375603ede8
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
