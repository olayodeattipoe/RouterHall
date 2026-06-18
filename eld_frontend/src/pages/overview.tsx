import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { TrendingUp, Truck, Clock, AlertTriangle } from "lucide-react"

const stats = [
  { label: "Active Trips", value: "2", icon: Truck, color: "text-blue-600", bg: "bg-blue-500/10" },
  { label: "Total Miles", value: "1,240", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  { label: "Hours Logged", value: "32.5", icon: Clock, color: "text-primary", bg: "bg-primary/10" },
  { label: "Alerts", value: "0", icon: AlertTriangle, color: "text-slate-500", bg: "bg-slate-500/10" },
]

export default function OverviewPage() {
  return (
    <div className="pointer-events-auto w-full max-w-4xl bg-white/5 backdrop-blur-3xl rounded-[28px] border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] p-7 sm:p-8 flex flex-col gap-7 mt-4 mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="flex sm:flex-row flex-col sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">Overview</h1>
          <p className="text-slate-700 mt-1 text-[15px] font-semibold drop-shadow-sm">Welcome back to RouteHaul.</p>
        </div>
        <Button nativeButton={false} className="rounded-xl h-11 px-5 shadow-md shadow-primary/20 text-primary-foreground font-bold text-sm">
          <Link to="/dashboard/new-trip">Plan New Trip</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-5 shadow-sm hover:bg-white/10 hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 drop-shadow-sm">{stat.label}</h3>
                <div className={`flex size-8 items-center justify-center rounded-lg ${stat.bg}`}>
                  <Icon className={`size-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 drop-shadow-sm">{stat.value}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
