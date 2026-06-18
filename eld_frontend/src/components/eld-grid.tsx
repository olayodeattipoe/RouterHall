import { useState, useMemo } from "react"
import { ShieldAlert, CheckCircle } from "lucide-react"

export type DutyStatus = "off_duty" | "sleeper" | "driving" | "on_duty_not_driving"

export interface LogSegment {
  status: DutyStatus
  start_time: string
  end_time: string
  duration_minutes: number
  location: string
  remark?: string
}

export interface DailyLogs {
  [date: string]: {
    date_formatted: { month: string; day: string; year: string }
    from_city: string
    to_city: string
    carrier: string
    home_terminal: string
    main_office: string
    truck_number: string
    trailer_number: string
    total_miles_driving: number
    total_miles_today: number
    shipping_doc_no: string
    shipper_commodity: string
    segments: LogSegment[]
  }
}

interface EldGridProps {
  logs?: DailyLogs
  compact?: boolean
}

const defaultDummyLogs: DailyLogs = {
  "2026-06-17": {
    date_formatted: { month: "06", day: "17", year: "2026" },
    from_city: "Chicago, IL",
    to_city: "Atlanta, GA",
    carrier: "RouteHaul Logistics Inc.",
    home_terminal: "Chicago Terminal East",
    main_office: "100 Logistics Way, Suite 400, Chicago, IL",
    truck_number: "TR-8820",
    trailer_number: "TRL-991A",
    total_miles_driving: 480,
    total_miles_today: 512,
    shipping_doc_no: "MN-992031-B",
    shipper_commodity: "General Electric Motors",
    segments: [
      { status: "off_duty", start_time: "2026-06-17T00:00:00", end_time: "2026-06-17T06:00:00", duration_minutes: 360, location: "Chicago Terminal", remark: "Pre-trip Sleep" },
      { status: "driving", start_time: "2026-06-17T06:00:00", end_time: "2026-06-17T09:30:00", duration_minutes: 210, location: "Lafayette, IN", remark: "Interstate Transit" },
      { status: "on_duty_not_driving", start_time: "2026-06-17T09:30:00", end_time: "2026-06-17T10:00:00", duration_minutes: 30, location: "Indianapolis, IN", remark: "Inspection & Fueling" },
      { status: "sleeper", start_time: "2026-06-17T10:00:00", end_time: "2026-06-17T12:00:00", duration_minutes: 120, location: "Seymour, IN", remark: "Rest Break" },
      { status: "driving", start_time: "2026-06-17T12:00:00", end_time: "2026-06-17T16:30:00", duration_minutes: 270, location: "Chattanooga, TN", remark: "Afternoon Route" },
      { status: "on_duty_not_driving", start_time: "2026-06-17T16:30:00", end_time: "2026-06-17T17:00:00", duration_minutes: 30, location: "Atlanta Terminal", remark: "Post-trip Inspection" },
      { status: "off_duty", start_time: "2026-06-17T17:00:00", end_time: "2026-06-17T24:00:00", duration_minutes: 420, location: "Atlanta Terminal", remark: "Off-duty rest" }
    ]
  },
  "2026-06-18": {
    date_formatted: { month: "06", day: "18", year: "2026" },
    from_city: "Atlanta, GA",
    to_city: "Birmingham, AL",
    carrier: "RouteHaul Logistics Inc.",
    home_terminal: "Atlanta Hub South",
    main_office: "100 Logistics Way, Suite 400, Chicago, IL",
    truck_number: "TR-8820",
    trailer_number: "TRL-991A",
    total_miles_driving: 147,
    total_miles_today: 155,
    shipping_doc_no: "MN-992200-C",
    shipper_commodity: "Industrial Steel Coil",
    segments: [
      { status: "off_duty", start_time: "2026-06-18T00:00:00", end_time: "2026-06-18T07:00:00", duration_minutes: 420, location: "Atlanta Terminal", remark: "Rest Period" },
      { status: "on_duty_not_driving", start_time: "2026-06-18T07:00:00", end_time: "2026-06-18T07:30:00", duration_minutes: 30, location: "Atlanta Terminal", remark: "Pre-trip DVIR" },
      { status: "driving", start_time: "2026-06-18T07:30:00", end_time: "2026-06-18T10:30:00", duration_minutes: 180, location: "Anniston, AL", remark: "Westbound transit" },
      { status: "on_duty_not_driving", start_time: "2026-06-18T10:30:00", end_time: "2026-06-18T11:00:00", duration_minutes: 30, location: "Pell City, AL", remark: "Mid-trip inspection" },
      { status: "driving", start_time: "2026-06-18T11:00:00", end_time: "2026-06-18T12:00:00", duration_minutes: 60, location: "Birmingham Terminal", remark: "Final leg" },
      { status: "off_duty", start_time: "2026-06-18T12:00:00", end_time: "2026-06-18T24:00:00", duration_minutes: 720, location: "Birmingham Terminal", remark: "End of shift off-duty" }
    ]
  }
}

const statusMetadata = {
  off_duty: { label: "Off Duty", code: "OFF", color: "#64748b" },
  sleeper: { label: "Sleeper Berth", code: "SB", color: "#8b5cf6" },
  driving: { label: "Driving", code: "D", color: "#10b981" },
  on_duty_not_driving: { label: "On Duty (ND)", code: "ON", color: "var(--primary, #eab308)" },
}

export default function EldGrid({ logs: initialLogs = defaultDummyLogs }: EldGridProps) {
  const getInitialLogs = (): DailyLogs => {
    try {
      const saved = localStorage.getItem("active_eld_logs")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Object.keys(parsed).length > 0) return parsed as DailyLogs
      }
    } catch { }
    return initialLogs
  }

  const [logs, setLogs] = useState<DailyLogs>(getInitialLogs)
  const dates = Object.keys(logs)
  const [selectedDate, setSelectedDate] = useState<string>(dates[0] || "2026-06-17")

  const currentDayData = useMemo(() => logs[selectedDate], [logs, selectedDate])
  const currentSegments = useMemo(() => currentDayData?.segments || [], [currentDayData])

  const getMinutesSinceMidnight = (timeStr: string, logDate: string = selectedDate): number => {
    if (timeStr.includes("T")) {
      const [datePart, timePart] = timeStr.split("T")
      const parts = timePart.split(":")
      const hours = parseInt(parts[0], 10)
      const minutes = parseInt(parts[1], 10)
      if (datePart > logDate) return 1440
      if (datePart < logDate) return 0
      return hours * 60 + minutes
    }
    const parts = timeStr.split(":")
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
  }

  const summary = useMemo(() => {
    const totals = { off_duty: 0, sleeper: 0, driving: 0, on_duty_not_driving: 0 }
    currentSegments.forEach((seg) => { totals[seg.status] += seg.duration_minutes })
    return {
      off_duty: (totals.off_duty / 60).toFixed(1),
      sleeper: (totals.sleeper / 60).toFixed(1),
      driving: (totals.driving / 60).toFixed(1),
      on_duty_not_driving: (totals.on_duty_not_driving / 60).toFixed(1),
      total: ((totals.off_duty + totals.sleeper + totals.driving + totals.on_duty_not_driving) / 60).toFixed(1),
    }
  }, [currentSegments])

  const hosStats = useMemo(() => {
    const totalDrivingMinutes = currentSegments.filter(s => s.status === "driving").reduce((sum, s) => sum + s.duration_minutes, 0)
    const activeSegments = currentSegments.filter(s => s.status === "driving" || s.status === "on_duty_not_driving")
    let dutyWindowMinutes = 0
    if (activeSegments.length > 0) {
      const startMinutes = getMinutesSinceMidnight(activeSegments[0].start_time)
      const lastSegment = activeSegments[activeSegments.length - 1]
      const endMinutes = getMinutesSinceMidnight(lastSegment.end_time)
      dutyWindowMinutes = endMinutes - startMinutes
    }
    return {
      drivingHours: (totalDrivingMinutes / 60).toFixed(1),
      drivingLimitExceeded: totalDrivingMinutes > 11 * 60,
      dutyHours: (dutyWindowMinutes / 60).toFixed(1),
      dutyLimitExceeded: dutyWindowMinutes > 14 * 60,
    }
  }, [currentSegments])

  const rowOrder: DutyStatus[] = ["off_duty", "sleeper", "driving", "on_duty_not_driving"]
  const rowLabels = ["1. Off Duty", "2. Sleeper", "3. Driving", "4. On Duty (ND)"]

  const svgPath = useMemo(() => {
    if (currentSegments.length === 0) return ""
    const width = 960
    const rowHeight = 30
    const halfRow = rowHeight / 2
    let path = ""
    currentSegments.forEach((seg, index) => {
      const startMin = getMinutesSinceMidnight(seg.start_time)
      const endMin = Math.min(1440, getMinutesSinceMidnight(seg.end_time.endsWith("24:00:00") ? "24:00" : seg.end_time))
      const xStart = (startMin / 1440) * width
      const xEnd = (endMin / 1440) * width
      const rowIndex = rowOrder.indexOf(seg.status)
      const yVal = rowIndex * rowHeight + halfRow
      if (index === 0) path += `M ${xStart} ${yVal}`
      else path += ` L ${xStart} ${yVal}`
      path += ` L ${xEnd} ${yVal}`
    })
    return path
  }, [currentSegments])

  const formatTimeLabel = (timeStr: string) => {
    if (timeStr.includes("T")) return timeStr.split("T")[1].substring(0, 5)
    return timeStr
  }

  const handleMetaChange = (field: keyof typeof currentDayData, value: any) => {
    if (!currentDayData) return
    setLogs(prev => ({ ...prev, [selectedDate]: { ...prev[selectedDate], [field]: value } }))
  }

  if (!currentDayData) return <div className="text-slate-800 font-bold p-4">No log for selected date.</div>

  return (
    <div className="flex flex-col gap-3 w-full max-w-5xl text-slate-800">

      {/* Date Switcher */}
      <div className="flex justify-between items-center bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
        <span className="text-[10px] font-black text-slate-600 tracking-wider uppercase">Log day:</span>
        <div className="flex gap-1.5">
          {dates.map((date) => (
            <button key={date} onClick={() => setSelectedDate(date)}
              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${selectedDate === date ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-600 hover:bg-white/10"}`}>
              {date}
            </button>
          ))}
        </div>
      </div>

      {/* Paper Log */}
      <div className="bg-white/85 backdrop-blur-2xl rounded-2xl border border-slate-900/10 shadow-xl text-slate-900 relative overflow-hidden">

        {/* ELD Verified ribbon */}
        <div className="absolute top-0 right-0 bg-slate-900 text-white font-extrabold text-[8px] py-0.5 px-7 uppercase tracking-widest rotate-45 translate-x-6 translate-y-2.5">
          ELD Verified
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 px-5 py-3">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-950 uppercase">Driver's Daily Log</h2>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">24-Hour Schedule</p>
          </div>
          {/* Compact meta: route + vehicle inline */}
          <div className="flex items-center gap-4 text-[11px] font-bold text-slate-700">
            <span>{currentDayData.from_city} → {currentDayData.to_city}</span>
            <span className="text-slate-400">|</span>
            <span>{currentDayData.truck_number} / {currentDayData.trailer_number}</span>
            <span className="text-slate-400">|</span>
            <span>{currentDayData.total_miles_driving} mi</span>
          </div>
        </div>

        {/* Grid */}
        <div className="w-full overflow-x-auto px-4 pt-3 pb-2">
          <div className="min-w-[700px] flex flex-col">

            {/* Hour labels */}
            <div className="flex w-full items-stretch">
              <div className="w-[100px] shrink-0" />
              <div className="flex-1 grid bg-slate-950 text-white text-[7px] font-black text-center rounded-t-md"
                style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="border-r border-slate-800 last:border-r-0 py-1 flex items-center justify-center min-w-[24px]">
                    {h === 0 ? "Mid" : h === 12 ? "Noon" : h}
                  </div>
                ))}
              </div>
              <div className="w-[52px] shrink-0 bg-slate-950 text-white text-[7px] font-black flex items-center justify-center rounded-tr-md border-l border-slate-800">
                HRS
              </div>
            </div>

            {/* Grid body */}
            <div className="flex w-full border-2 border-slate-950 relative">
              {/* Row labels */}
              <div className="w-[100px] shrink-0 flex flex-col bg-slate-100 border-r-2 border-slate-950 divide-y divide-slate-300 text-[9px] font-black text-slate-700">
                {rowLabels.map((label) => (
                  <div key={label} className="h-[30px] flex items-center px-2">{label}</div>
                ))}
              </div>

              {/* Grid canvas */}
              <div className="flex-1 h-[120px] relative bg-white">
                {/* Hour columns */}
                <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="h-full border-r-2 border-slate-950/20 last:border-r-0 relative">
                      <div className="absolute left-[25%] top-0 bottom-0 border-r border-slate-400/30 border-dotted" />
                      <div className="absolute left-[50%] top-0 bottom-0 border-r border-slate-950/15" />
                      <div className="absolute left-[75%] top-0 bottom-0 border-r border-slate-400/30 border-dotted" />
                    </div>
                  ))}
                </div>

                {/* Row dividers */}
                <div className="absolute inset-0 flex flex-col pointer-events-none divide-y-2 divide-slate-950/15">
                  {[0, 1, 2, 3].map(i => <div key={i} className="h-[30px]" />)}
                </div>

                {/* SVG plot */}
                <svg className="absolute inset-0 w-full h-[120px] pointer-events-none z-10"
                  viewBox="0 0 960 120" preserveAspectRatio="none">
                  <path d={svgPath} fill="none" stroke="rgba(16,185,129,0.12)" strokeWidth="14" strokeLinecap="square" strokeLinejoin="miter" />
                  <path d={svgPath} fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" />
                </svg>
              </div>

              {/* Total hours */}
              <div className="w-[52px] shrink-0 flex flex-col bg-slate-50 border-l-2 border-slate-950 divide-y divide-slate-300 text-[10px] font-extrabold text-slate-800 text-center">
                <div className="h-[30px] flex items-center justify-center">{summary.off_duty}</div>
                <div className="h-[30px] flex items-center justify-center">{summary.sleeper}</div>
                <div className="h-[30px] flex items-center justify-center">{summary.driving}</div>
                <div className="h-[30px] flex items-center justify-center">{summary.on_duty_not_driving}</div>
              </div>
            </div>

            {/* Total row */}
            <div className="flex justify-end gap-2 mt-1 text-[10px] font-black text-slate-900">
              <span>Total:</span>
              <span className="underline decoration-2 underline-offset-1">{summary.total} hrs</span>
            </div>
          </div>
        </div>

        {/* Bottom strip: remarks + HOS + shipping in one row */}
        <div className="border-t-2 border-slate-950 px-5 py-3 grid grid-cols-3 gap-4 text-[10px]">

          {/* Remarks list */}
          <div className="col-span-1 flex flex-col gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-600">Duty Changes</span>
            <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto pr-1">
              {currentSegments.map((seg, idx) => {
                const meta = statusMetadata[seg.status]
                return (
                  <div key={idx} className="flex items-center gap-2 text-[10px]">
                    <span className="w-6 h-6 rounded shrink-0 flex items-center justify-center text-[8px] font-black text-white" style={{ backgroundColor: meta.color }}>
                      {meta.code}
                    </span>
                    <div className="flex flex-col leading-tight">
                      <span className="font-bold text-slate-800">{formatTimeLabel(seg.start_time)}–{formatTimeLabel(seg.end_time)}</span>
                      <span className="text-slate-500 font-medium">{seg.location}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* HOS Stats */}
          <div className="col-span-1 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className={`size-3 ${hosStats.drivingLimitExceeded || hosStats.dutyLimitExceeded ? "text-red-500" : "text-emerald-600"}`} />
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-600">FMCSA Recap</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="border border-slate-200 rounded-lg p-2 bg-slate-50">
                <span className="text-[8px] font-bold text-slate-500 block">Driving (11h limit)</span>
                <span className={`text-sm font-black ${hosStats.drivingLimitExceeded ? "text-red-600" : "text-slate-900"}`}>
                  {hosStats.drivingHours}h
                </span>
              </div>
              <div className="border border-slate-200 rounded-lg p-2 bg-slate-50">
                <span className="text-[8px] font-bold text-slate-500 block">On Duty (14h limit)</span>
                <span className={`text-sm font-black ${hosStats.dutyLimitExceeded ? "text-red-600" : "text-slate-900"}`}>
                  {hosStats.dutyHours}h
                </span>
              </div>
            </div>
          </div>

          {/* Shipping + certify */}
          <div className="col-span-1 flex flex-col gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-600">Shipping Docs</span>
            <div className="flex flex-col gap-1">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-slate-400 uppercase">Doc No.</span>
                <input type="text" value={currentDayData.shipping_doc_no}
                  onChange={e => handleMetaChange("shipping_doc_no", e.target.value)}
                  className="border-b border-slate-300 bg-transparent py-0.5 font-extrabold text-[11px] focus:outline-none text-slate-900" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-slate-400 uppercase">Commodity</span>
                <input type="text" value={currentDayData.shipper_commodity}
                  onChange={e => handleMetaChange("shipper_commodity", e.target.value)}
                  className="border-b border-slate-300 bg-transparent py-0.5 font-extrabold text-[11px] focus:outline-none text-slate-900" />
              </div>
            </div>
            <button className="mt-auto w-full py-2 bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1.5">
              <CheckCircle className="size-3 text-emerald-400" />
              Certify & Sign
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}