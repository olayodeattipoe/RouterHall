import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Route, Truck } from "lucide-react"

export function WelcomeScreen() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        // ease toward 100 with a little randomness
        const step = Math.max(1, Math.round((100 - prev) * 0.06))
        return Math.min(100, prev + step)
      })
    }, 120)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(() => navigate("/dashboard/new-trip"), 600)
      return () => clearTimeout(timeout)
    }
  }, [progress, navigate])

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-16 text-center">
      {/* Animated Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] mix-blend-multiply opacity-50 animate-pulse pointer-events-none" />

      {/* Background grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(0 0 0 / 0.1) 1px, transparent 1px), linear-gradient(to bottom, oklch(0 0 0 / 0.1) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 45%, black, transparent)",
        }}
      />

      {/* Diagonal dashed route lines */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 top-0 h-[200%] w-px rotate-[35deg] border-l-2 border-dashed border-black/20" />
        <div className="absolute left-1/3 -top-1/4 h-[200%] w-px rotate-[35deg] border-l-2 border-dashed border-black/20" />
        <div className="absolute right-1/4 -top-1/4 h-[200%] w-px rotate-[35deg] border-l-2 border-dashed border-black/20" />
      </div>

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-6">
        {/* Logo */}
        <div className="relative flex size-20 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
          <div className="absolute inset-0 -z-10 rounded-2xl bg-primary/40 blur-2xl" />
          <Truck className="size-9 text-primary-foreground" strokeWidth={2.25} />
        </div>

        {/* Heading */}
        <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-7xl">
          RouteHaul
        </h1>

        <p className="max-w-sm text-pretty text-lg text-muted-foreground">
          Your smart ELD & Trip Planner.
        </p>

        {/* Progress bar */}
        <div className="mt-4 flex w-full max-w-md flex-col items-center gap-3">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Loading your saved routes"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Route className="size-4 text-primary" />
            <span>Loading your saved routes</span>
            <span className="font-semibold text-foreground">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-8 z-10 text-sm text-muted-foreground">
        Drive safe. Stay compliant.
      </p>
    </main>
  )
}
