import { Toaster as Sonner } from "sonner"

// This app has no light/dark toggle and no next-themes provider mounted
// (system theme would otherwise leave the toast following the OS setting,
// which could render a light toast on our dark surface) — it renders as one
// dark-themed product, matching vouza.ai, so the toast is pinned to dark.
const Toaster = ({
  ...props
}) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props} />
  );
}

export { Toaster }