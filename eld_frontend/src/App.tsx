import { BrowserRouter, Routes, Route } from "react-router-dom"
import { WelcomeScreen } from "@/components/welcome-screen"
import DashboardLayout from "@/pages/dashboard"
import OverviewPage from "@/pages/overview"
import TripsPage from "@/pages/trips"
import SettingsPage from "@/pages/settings"
import NewTripPage from "@/pages/newtrip"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="new-trip" element={<NewTripPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
