"use client";

import React from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#262826] group-[.toaster]:text-[#D9DADF] group-[.toaster]:border-[#383A38] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-[#8A8B82]",
          actionButton:
            "group-[.toast]:bg-[#DD700B] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[#383A38] group-[.toast]:text-[#D9DADF]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
export default Toaster;
