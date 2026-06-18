import { useState, useRef, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useMap, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet-routing-machine"
import "leaflet-routing-machine/dist/leaflet-routing-machine.css"
import { Search, MapPin, Loader2, ArrowLeft, Navigation, Package, Map as MapIcon, Clock, ChevronUp } from "lucide-react"

function getHaversineDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const createCustomIcon = (colorClass: string) => L.divIcon({
    className: 'custom-ui-marker',
    html: `<div class="pin ${colorClass}"></div><div class="pulse ${colorClass}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -16]
});

type LocationData = { name: string; primaryName: string; secondaryName: string; lat: number; lng: number } | null;

function MapUpdater({ center }: { center: [number, number] | null }) {
    const map = useMap()
    useEffect(() => {
        if (center) {
            map.flyTo(center, 13, { duration: 1.5 })
        }
    }, [center, map])
    return null
}

function RoutingMachine({ waypoints, onMetricsFound, onCalculating }: {
    waypoints: [number, number][],
    onMetricsFound: (m: any) => void,
    onCalculating: (b: boolean) => void
}) {
    const map = useMap();
    const routingControlRef = useRef<any>(null);
    const waypointsKey = JSON.stringify(waypoints);

    useEffect(() => {
        // Always tear down the old control first to guarantee a clean slate
        if (routingControlRef.current) {
            map.removeControl(routingControlRef.current);
            routingControlRef.current = null;
        }

        if (waypoints.length < 2) {
            onMetricsFound(null);
            onCalculating(false); // ensure we never stay stuck on "Calculating..."
            return;
        }

        // Set calculating synchronously — more reliable than waiting for routingstart
        onCalculating(true);

        const latLngs = waypoints.map(w => L.latLng(w[0], w[1]));

        const opts: any = {
            waypoints: latLngs,
            routeWhileDragging: false,
            show: false,
            addWaypoints: false,
            fitSelectedRoutes: true,
            lineOptions: {
                styles: [{ color: '#eab308', weight: 6, opacity: 0.9 }],
                extendToWaypoints: true,
                missingRouteTolerance: 0
            },
            createMarker: () => null
        };

        // @ts-ignore
        const control = L.Routing.control(opts).addTo(map);

        control.on('routesfound', (e: any) => {
            onCalculating(false);
            if (e.routes?.[0]) onMetricsFound(e.routes[0].summary);
        });

        control.on('routingerror', () => {
            onCalculating(false);
            onMetricsFound(null);
        });

        routingControlRef.current = control;

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, waypointsKey]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (routingControlRef.current) map.removeControl(routingControlRef.current);
        };
    }, [map]);

    return null;
}

function formatDuration(totalSeconds: number): string {
    const totalMinutes = Math.round(totalSeconds / 60);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatDistance(meters: number): string {
    const km = meters / 1000;
    if (km < 100) return `${km.toFixed(1)} km`;
    return `${Math.round(km).toLocaleString()} km`;
}

export default function NewTripPage() {
    const navigate = useNavigate()
    const [isExpanded, setIsExpanded] = useState(false)
    const [focusedField, setFocusedField] = useState<'current' | 'pickup' | 'dropoff' | null>(null)
    const [queries, setQueries] = useState({ current: "", pickup: "", dropoff: "" })
    const [locations, setLocations] = useState<{ current: LocationData, pickup: LocationData, dropoff: LocationData }>({
        current: null, pickup: null, dropoff: null
    })
    const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const [routeMetrics, setRouteMetrics] = useState<{ totalDistance: number, totalTime: number } | null>(null)
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)

    const [avgSpeed, setAvgSpeed] = useState(55)
    const [cycleHours, setCycleHours] = useState(10)
    const [carrier, setCarrier] = useState("RouteHaul Logistics Inc.")
    const [truckNo, setTruckNo] = useState("TR-8820")
    const [trailerNo, setTrailerNo] = useState("TRL-991A")
    const [shippingDoc, setShippingDoc] = useState("MN-992031-B")
    const [commodity, setCommodity] = useState("General Electric Motors")
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const handleGenerateHOSLog = async () => {
        if (!routeMetrics || !locations.current || !locations.dropoff) return;
        setIsGenerating(true);
        setError(null);

        const totalDistanceMiles = routeMetrics.totalDistance * 0.000621371;
        const pickupDistanceMiles = locations.pickup
            ? getHaversineDistanceMiles(locations.current.lat, locations.current.lng, locations.pickup.lat, locations.pickup.lng)
            : totalDistanceMiles * 0.1;

        try {
            const response = await fetch("https://spotter-backend-yiaz.onrender.com/api/plan-trip/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    total_distance: totalDistanceMiles,
                    avg_speed: avgSpeed,
                    pickup_distance: pickupDistanceMiles,
                    dropoff_distance: totalDistanceMiles,
                    cycle_hours_used: cycleHours,
                    carrier,
                    truck_number: truckNo,
                    trailer_number: trailerNo,
                    shipping_doc_no: shippingDoc,
                    shipper_commodity: commodity,
                }),
            });

            if (!response.ok) throw new Error("Failed to plan trip schedule");

            const data = await response.json();
            localStorage.setItem("active_eld_logs", JSON.stringify(data));
            navigate("/dashboard/trips");
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        if (!focusedField) return;
        const query = queries[focusedField];

        const delayDebounceFn = setTimeout(() => {
            if (query.trim().length > 2) {
                setIsLoading(true)
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=4`)
                    .then(res => res.json())
                    .then(data => {
                        const formatted = data.map((item: any) => {
                            const parts = item.display_name.split(',');
                            const primaryName = parts[0].trim();
                            const secondaryName = parts.slice(1).join(',').trim();
                            return { name: item.display_name, primaryName, secondaryName, lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
                        });
                        setSuggestions(formatted)
                    })
                    .catch(err => console.error("Geocoding error:", err))
                    .finally(() => setIsLoading(false))
            } else {
                setSuggestions([])
            }
        }, 500)

        return () => clearTimeout(delayDebounceFn)
    }, [focusedField, queries])

    const handleSelectLocation = (loc: any) => {
        if (!focusedField) return;
        setLocations(prev => ({ ...prev, [focusedField]: loc }))
        setQueries(prev => ({ ...prev, [focusedField]: loc.primaryName }))
        setMapCenter([loc.lat, loc.lng])

        if (focusedField === 'current') setFocusedField('pickup')
        else if (focusedField === 'pickup') setFocusedField('dropoff')
        else setFocusedField(null)

        setSuggestions([])
    }

    const handleChange = (field: 'current' | 'pickup' | 'dropoff', val: string) => {
        setQueries(prev => ({ ...prev, [field]: val }))
        if (val === "") {
            setLocations(prev => ({ ...prev, [field]: null }))
        }
    }

    const activeMarkers = useMemo(() => [
        { type: "Current Location", data: locations.current, color: "blue" },
        { type: "Pickup Location", data: locations.pickup, color: "orange" },
        { type: "Dropoff Location", data: locations.dropoff, color: "red" },
    ].filter(m => m.data !== null), [locations])

    const routeCoordinates = useMemo(
        () => activeMarkers.map(m => [m.data!.lat, m.data!.lng] as [number, number]),
        [activeMarkers]
    );

    const isFieldLoading = (field: 'current' | 'pickup' | 'dropoff') => isLoading && focusedField === field;

    return (
        <>
            <MapUpdater center={mapCenter} />

            <RoutingMachine
                waypoints={routeCoordinates}
                onMetricsFound={setRouteMetrics}
                onCalculating={setIsCalculatingRoute}
            />

            {activeMarkers.map((m) => (
                <Marker
                    key={`${m.type}-${m.data!.lat}-${m.data!.lng}`}
                    position={[m.data!.lat, m.data!.lng]}
                    icon={createCustomIcon(m.color)}
                >
                    <Popup className="modern-popup" closeButton={false}>
                        <strong className="block text-[13px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{m.type}</strong>
                        <span className="block text-base font-bold text-foreground">{m.data!.primaryName}</span>
                        <span className="block text-[13px] text-muted-foreground mt-0.5 line-clamp-1">{m.data!.secondaryName}</span>
                    </Popup>
                </Marker>
            ))}

            <div className="w-full max-w-xl mx-auto mt-4 pointer-events-auto flex flex-col gap-3">
                {!isExpanded ? (
                    <>
                        <div
                            onClick={() => setIsExpanded(true)}
                            className="flex w-full items-center gap-3 bg-white/5 backdrop-blur-3xl p-4 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] border border-white/20 cursor-text hover:bg-white/10 hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] transition-all duration-300"
                        >
                            <Search className="size-6 text-slate-800 drop-shadow-sm ml-2" />
                            <span className="text-slate-800 drop-shadow-sm text-[16px] font-bold">Search or plan your route...</span>
                        </div>

                        {routeMetrics && !isCalculatingRoute && (
                            <div className="flex items-center justify-center gap-6 px-6 py-3 rounded-2xl bg-white/5 backdrop-blur-3xl border border-white/20 shadow-[0_4px_16px_0_rgba(0,0,0,0.06)] animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2">
                                    <MapIcon className="size-4 text-slate-700" />
                                    <span className="text-sm font-extrabold text-slate-900 drop-shadow-sm">{formatDistance(routeMetrics.totalDistance)}</span>
                                </div>
                                <div className="w-px h-4 bg-slate-400/30" />
                                <div className="flex items-center gap-2">
                                    <Clock className="size-4 text-slate-700" />
                                    <span className="text-sm font-extrabold text-slate-900 drop-shadow-sm">{formatDuration(routeMetrics.totalTime)}</span>
                                </div>
                                <div className="w-px h-4 bg-slate-400/30" />
                                <div className="flex items-center gap-1">
                                    {activeMarkers.map((m, i) => (
                                        <div key={i} className={`size-2.5 rounded-full ${m.color === 'blue' ? 'bg-blue-500' : m.color === 'orange' ? 'bg-orange-500' : 'bg-red-500'}`} />
                                    ))}
                                    <span className="text-xs font-bold text-slate-600 ml-1">{activeMarkers.length} stops</span>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div ref={wrapperRef} className="w-full bg-white/5 backdrop-blur-3xl rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-white/20 flex flex-col transition-all overflow-visible relative">
                        <div className="p-5 flex items-center justify-between border-b border-white/15">
                            <div className="flex items-center">
                                <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-white/15 rounded-full mr-3 transition-colors">
                                    <ArrowLeft className="size-5 text-slate-900 drop-shadow-sm" />
                                </button>
                                <h3 className="font-extrabold text-lg tracking-tight text-slate-900 drop-shadow-sm">Plan Route</h3>
                            </div>
                            {isCalculatingRoute && (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Loader2 className="size-4 animate-spin" />
                                    <span className="text-xs font-bold">Calculating...</span>
                                </div>
                            )}
                        </div>

                        <div className="p-5 flex flex-col gap-4 relative">
                            <div className="flex items-center gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-500/15">
                                    <Navigation className="size-4 text-blue-600" />
                                </div>
                                <div className="relative flex-1">
                                    <input
                                        value={queries.current}
                                        onChange={e => handleChange('current', e.target.value)}
                                        onFocus={() => setFocusedField('current')}
                                        placeholder="Current Location"
                                        className="w-full bg-white/30 rounded-xl px-4 py-3 text-[15px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 border border-white/30 focus:border-blue-400/50 transition-all placeholder:text-slate-400 shadow-inner pr-10"
                                    />
                                    {isFieldLoading('current') && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-blue-500 animate-spin" />
                                    )}
                                    {locations.current && !isFieldLoading('current') && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 size-2 rounded-full bg-blue-500" />
                                    )}
                                </div>
                            </div>

                            <div className="flex ml-[18px] flex-col gap-0.5 -my-1.5">
                                <div className="size-1 rounded-full bg-slate-400/40" />
                                <div className="size-1 rounded-full bg-slate-400/30" />
                                <div className="size-1 rounded-full bg-slate-400/20" />
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500/15">
                                    <Package className="size-4 text-orange-600" />
                                </div>
                                <div className="relative flex-1">
                                    <input
                                        value={queries.pickup}
                                        onChange={e => handleChange('pickup', e.target.value)}
                                        onFocus={() => setFocusedField('pickup')}
                                        placeholder="Pickup Location"
                                        className="w-full bg-white/30 rounded-xl px-4 py-3 text-[15px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/30 border border-white/30 focus:border-orange-400/50 transition-all placeholder:text-slate-400 shadow-inner pr-10"
                                    />
                                    {isFieldLoading('pickup') && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-orange-500 animate-spin" />
                                    )}
                                    {locations.pickup && !isFieldLoading('pickup') && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 size-2 rounded-full bg-orange-500" />
                                    )}
                                </div>
                            </div>

                            <div className="flex ml-[18px] flex-col gap-0.5 -my-1.5">
                                <div className="size-1 rounded-full bg-slate-400/40" />
                                <div className="size-1 rounded-full bg-slate-400/30" />
                                <div className="size-1 rounded-full bg-slate-400/20" />
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                                    <MapPin className="size-4 text-red-600" />
                                </div>
                                <div className="relative flex-1">
                                    <input
                                        value={queries.dropoff}
                                        onChange={e => handleChange('dropoff', e.target.value)}
                                        onFocus={() => setFocusedField('dropoff')}
                                        placeholder="Drop-off Location"
                                        className="w-full bg-white/30 rounded-xl px-4 py-3 text-[15px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-500/30 border border-white/30 focus:border-red-400/50 transition-all placeholder:text-slate-400 shadow-inner pr-10"
                                    />
                                    {isFieldLoading('dropoff') && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-red-500 animate-spin" />
                                    )}
                                    {locations.dropoff && !isFieldLoading('dropoff') && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 size-2 rounded-full bg-red-500" />
                                    )}
                                </div>
                            </div>

                            {focusedField && suggestions.length > 0 && (
                                <div className="absolute top-[100%] left-0 right-0 mt-3 bg-white/10 backdrop-blur-3xl rounded-[20px] shadow-[0_30px_80px_rgba(0,0,0,0.18)] border border-white/20 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    {suggestions.map((loc, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelectLocation(loc)}
                                            className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-white/20 border-b border-white/10 last:border-0 transition-colors"
                                        >
                                            <div className="flex size-10 shrink-0 mt-0.5 items-center justify-center rounded-lg bg-white/20 border border-white/20">
                                                <MapPin className="size-[18px] text-slate-800 drop-shadow-sm" />
                                            </div>
                                            <div className="flex flex-col gap-0.5 overflow-hidden pr-2">
                                                <span className="text-[15px] font-extrabold text-slate-900 truncate drop-shadow-sm">{loc.primaryName}</span>
                                                <span className="text-[13px] text-slate-700 font-semibold truncate drop-shadow-sm">{loc.secondaryName}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {routeMetrics && !isCalculatingRoute && (
                                <div className="flex items-center justify-between mt-1 px-5 py-4 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-9 items-center justify-center rounded-full bg-primary/15">
                                            <MapIcon className="size-4 text-primary" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-600">Distance</span>
                                            <span className="text-lg font-black text-slate-900 drop-shadow-sm leading-tight">{formatDistance(routeMetrics.totalDistance)}</span>
                                        </div>
                                    </div>
                                    <div className="w-px h-9 bg-white/20" />
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col text-right">
                                            <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-600">Est. Time</span>
                                            <span className="text-lg font-black text-slate-900 drop-shadow-sm leading-tight">{formatDuration(routeMetrics.totalTime)}</span>
                                        </div>
                                        <div className="flex size-9 items-center justify-center rounded-full bg-primary/15">
                                            <Clock className="size-4 text-primary" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {routeMetrics && !isCalculatingRoute && (
                                <div className="flex flex-col gap-3 border-t border-white/15 pt-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 pl-1">Avg Speed (mph)</label>
                                            <input
                                                type="number"
                                                value={avgSpeed}
                                                onChange={e => setAvgSpeed(Number(e.target.value))}
                                                className="bg-white/30 border border-white/30 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 pl-1">Cycle Hours Used</label>
                                            <input
                                                type="number"
                                                value={cycleHours}
                                                onChange={e => setCycleHours(Number(e.target.value))}
                                                className="bg-white/30 border border-white/30 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setShowAdvanced(v => !v)}
                                        className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors text-left"
                                    >
                                        {showAdvanced ? "▲ Hide" : "▼ Show"} Vehicle & Carrier Details
                                    </button>

                                    {showAdvanced && (
                                        <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                                            {[
                                                { label: "Carrier Name", value: carrier, setter: setCarrier },
                                                { label: "Truck No.", value: truckNo, setter: setTruckNo },
                                                { label: "Trailer No.", value: trailerNo, setter: setTrailerNo },
                                                { label: "Shipping Doc No.", value: shippingDoc, setter: setShippingDoc },
                                            ].map(({ label, value, setter }) => (
                                                <div key={label} className="flex flex-col gap-1">
                                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 pl-1">{label}</label>
                                                    <input
                                                        type="text"
                                                        value={value}
                                                        onChange={e => setter(e.target.value)}
                                                        className="bg-white/30 border border-white/30 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                                    />
                                                </div>
                                            ))}
                                            <div className="col-span-2 flex flex-col gap-1">
                                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 pl-1">Shipper & Commodity</label>
                                                <input
                                                    type="text"
                                                    value={commodity}
                                                    onChange={e => setCommodity(e.target.value)}
                                                    className="bg-white/30 border border-white/30 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {error && (
                                        <p className="text-xs font-bold text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                                            ⚠ {error}
                                        </p>
                                    )}

                                    <button
                                        onClick={handleGenerateHOSLog}
                                        disabled={isGenerating || !locations.current || !locations.dropoff}
                                        className="w-full py-3 rounded-2xl bg-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground font-black text-sm shadow-md shadow-primary/25 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="size-4 animate-spin" />
                                                Generating ELD Schedule...
                                            </>
                                        ) : (
                                            "Generate ELD Log →"
                                        )}
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={() => setIsExpanded(false)}
                                className="flex items-center justify-center gap-1 py-1.5 text-slate-500 hover:text-slate-900 transition-colors mx-auto"
                            >
                                <ChevronUp className="size-4" />
                                <span className="text-xs font-bold">Collapse</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
