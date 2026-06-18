export default function SettingsPage() {
  return (
    <div className="pointer-events-auto w-full max-w-3xl bg-white/5 backdrop-blur-3xl rounded-[28px] border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] p-7 sm:p-8 flex flex-col gap-7 mt-4 mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">Settings</h1>
        <p className="text-slate-700 mt-1 text-[15px] font-semibold drop-shadow-sm">Manage your account and preferences.</p>
      </div>
      <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-7 shadow-sm">
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 drop-shadow-sm">Profile</h3>
            <p className="text-sm text-slate-700 mt-0.5 font-semibold drop-shadow-sm">Update your personal details.</p>
          </div>
          <div className="h-px bg-white/15" />
          <div className="space-y-4 pt-1">
            <div className="grid gap-1.5">
              <label className="text-sm font-bold text-slate-800 drop-shadow-sm">Name</label>
              <input disabled className="flex h-11 w-full rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-[14px] font-semibold text-slate-900 ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 shadow-inner drop-shadow-sm" value="John Doe" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-bold text-slate-800 drop-shadow-sm">Email</label>
              <input disabled className="flex h-11 w-full rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-[14px] font-semibold text-slate-900 ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 shadow-inner drop-shadow-sm" value="john@example.com" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
