import EldGrid from "@/components/eld-grid"

export default function TripsPage() {
  const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <div
      className="pointer-events-auto w-full max-w-5xl bg-white/5 backdrop-blur-3xl rounded-[28px] border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] p-7 sm:p-8 flex flex-col gap-6 mt-4 mb-8 mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500 overflow-y-auto max-h-[calc(100vh-6rem)]"
      onWheel={stopPropagation}
      onTouchMove={stopPropagation}
      onTouchStart={stopPropagation}
    >
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">Daily Logs & Trips</h1>
        <p className="text-slate-700 mt-1 text-[15px] font-semibold drop-shadow-sm">Review your ELD logs and active route timelines.</p>
      </div>
      <div className="border-t border-white/10 pt-4">
        <EldGrid />
      </div>
    </div>
  )
}
