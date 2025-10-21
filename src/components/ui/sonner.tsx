
"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme="dark"
      position="top-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "!bg-slate-900 !text-slate-100 !border !border-cyber-accent/30 !shadow-xl !shadow-cyber-accent/10 backdrop-blur-sm",
          description: "!text-slate-400 !text-sm",
          actionButton:
            "!bg-cyber-accent !text-white !border !border-cyber-accent hover:!bg-cyber-accent/80",
          cancelButton:
            "!bg-slate-800 !text-slate-300 !border !border-slate-700 hover:!bg-slate-700",
          error: "!bg-red-900/20 !border-red-500/40 !text-red-200",
          success: "!bg-green-900/20 !border-green-500/40 !text-green-200",
          warning: "!bg-yellow-900/20 !border-yellow-500/40 !text-yellow-200",
          info: "!bg-blue-900/20 !border-blue-500/40 !text-blue-200",
        },
        style: {
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#f1f5f9',
          border: '1px solid rgba(34, 211, 238, 0.3)',
          backdropFilter: 'blur(8px)',
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast } from "sonner"
