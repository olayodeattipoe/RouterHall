import { useEffect, useRef } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import { Truck, Map, LogOut, Route } from "lucide-react"
import { MapContainer, TileLayer } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

export default function DashboardLayout() {
  const location = useLocation()
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    L.DomEvent.disableScrollPropagation(el)
    L.DomEvent.disableClickPropagation(el)
  }, [])

  const navItems = [
    { name: "Plan Trip", href: "/dashboard/new-trip", icon: Route },
    { name: "My Trips", href: "/dashboard/trips", icon: Map },
  ]

  return (
    <div className="fixed inset-0 w-full h-full bg-muted">
      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={4}
        zoomControl={false}
        style={{ height: "100%", width: "100%", position: "absolute", inset: 0, zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Global Floating UI Layer */}
        <div className="absolute inset-0 z-[1000] pointer-events-none flex flex-col sm:flex-row p-4 sm:p-5 gap-5">

          {/* Floating Glass Sidebar */}
          <aside className="pointer-events-auto shrink-0 w-full sm:w-18 lg:w-60 flex flex-row sm:flex-col items-center lg:items-stretch bg-white/5 backdrop-blur-3xl border border-white/15 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] transition-all h-fit overflow-hidden">

            {/* Logo */}
            <div className="flex sm:h-20 shrink-0 items-center justify-center lg:justify-start gap-3 sm:border-b border-white/10 px-5 sm:py-0 py-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20">
                <Truck className="size-5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="font-extrabold tracking-wider text-[15px] hidden lg:block text-slate-800 drop-shadow-sm">RouteHaul</span>
            </div>

            {/* Navigation */}
            <nav className="flex flex-row sm:flex-col gap-1 p-3 items-center lg:items-stretch">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href || (item.href !== "/dashboard" && location.pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    title={item.name}
                    className={`flex items-center lg:justify-start justify-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-200 group ${isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-slate-600 hover:bg-white/15 hover:text-slate-900"
                      }`}
                  >
                    <Icon className={`size-5 shrink-0 transition-transform duration-200 ${isActive ? "scale-105" : "group-hover:scale-105"}`} />
                    <span className="hidden lg:block font-semibold text-[14px]">{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Sign Out */}
            <div className="p-3 border-t border-white/10 hidden sm:block">
              <Link
                to="/"
                title="Sign Out"
                className="flex items-center lg:justify-start justify-center gap-3 rounded-xl px-3.5 py-3 text-slate-500 transition-all duration-200 hover:bg-red-500/10 hover:text-red-600"
              >
                <LogOut className="size-5 shrink-0" />
                <span className="hidden lg:block font-semibold text-[14px]">Sign Out</span>
              </Link>
            </div>
          </aside>

          {/* Main Content Area — pointer-events-auto + overflow-y-auto so it owns scroll */}
          <main
            ref={mainRef}
            className="flex-1 pointer-events-auto relative h-full flex flex-col overflow-y-auto"
          >
            <Outlet />
          </main>

        </div>
      </MapContainer>
    </div>
  )
}