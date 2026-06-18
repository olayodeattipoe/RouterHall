# RouteHaul

A full-stack ELD trip planning application for commercial truck drivers. Enter your trip details and RouteHaul calculates your route, schedules mandatory HOS (Hours of Service) rest stops, fueling stops, and generates filled-out daily ELD log sheets — all in one place.

**Live App:** https://routerhaul.netlify.app  
**Backend API:** https://spotter-backend-yiaz.onrender.com

---

## What It Does

Commercial truck drivers are bound by federal HOS regulations — 11-hour driving limits, 30-minute break requirements, 10-hour rest periods, and a 70-hour/8-day cycle cap. RouteHaul automates all of that math.

You enter four inputs:

- Current location
- Pickup location
- Drop-off location
- Current cycle hours used

RouteHaul gives you back:

- An interactive map with your full route plotted, including all stops
- A breakdown of every stop — rest, fuel, pickup, drop-off — with timing
- Multiple ELD daily log sheets drawn out for the entire trip duration

---

## Tech Stack

**Frontend**
- React + TypeScript (Vite)
- Leaflet / React-Leaflet for maps
- Leaflet Routing Machine for route drawing
- Tailwind CSS

**Backend**
- Python + Django 6
- Django REST Framework
- SQLite (development)

**Infrastructure**
- Frontend: Netlify
- Backend: Render

---

## Features

- HOS-compliant trip planning (70hrs/8days, property-carrying driver)
- Automatic rest stop scheduling (10-hour breaks, 30-minute breaks)
- Fueling stop insertion every 1,000 miles
- 1-hour pickup and drop-off windows factored in
- ELD log sheets drawn and filled per day for the full trip
- Interactive map with route and stop markers
- Multi-day trip support with multiple log sheets

---

## Running Locally

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend runs at `http://localhost:8000`

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend runs at `http://localhost:5173`

Make sure the frontend is pointing to `http://localhost:8000` for the API in your local environment config.

---

## Assumptions

- Property-carrying driver
- 70-hour / 8-day HOS cycle
- No adverse driving conditions
- Fueling stop required at least every 1,000 miles
- 1 hour allocated for both pickup and drop-off

---

## Author

Built by [Olayode Attipoe](https://github.com/olayodeattipoe) as part of a Spotter AI technical assessment.
