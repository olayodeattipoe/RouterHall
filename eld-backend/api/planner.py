from datetime import datetime, timedelta

# ---- Status constants ----
DRIVING = "driving"
ON_DUTY_NOT_DRIVING = "on_duty_not_driving"
OFF_DUTY = "off_duty"
SLEEPER = "sleeper"

# ---- HOS Rule constants (in minutes, since that's our smallest unit) ----
MAX_DRIVING_PER_DAY = 11 * 60          # 11 hour driving limit
MAX_DUTY_WINDOW = 14 * 60              # 14 hour on-duty window
BREAK_AFTER_DRIVING = 8 * 60           # need 30 min break after 8 cumulative hrs driving
REQUIRED_BREAK = 30                    # the break itself, in minutes
REQUIRED_OFF_DUTY = 10 * 60            # 10 consecutive hours off duty between shifts
FUEL_STOP_EVERY_MILES = 1000
FUEL_STOP_DURATION = 30                # minutes
PICKUP_DROPOFF_DURATION = 60           # minutes
MAX_CYCLE_HOURS = 70 * 60              # 70 hour / 8 day limit


class Segment:
    """One continuous block of time in a single status."""
    def __init__(self, status, start_time, duration_minutes, location_label=""):
        self.status = status
        self.start_time = start_time
        self.duration_minutes = duration_minutes
        self.end_time = start_time + timedelta(minutes=duration_minutes)
        self.location_label = location_label

    def to_dict(self):
        return {
            "status": self.status,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "duration_minutes": self.duration_minutes,
            "location_label": self.location_label,
        }


class TripPlanner:
    def __init__(self, total_distance_miles, avg_speed_mph,
                 pickup_distance_miles, dropoff_distance_miles,
                 cycle_hours_used, start_time=None):
        self.total_distance = total_distance_miles
        self.avg_speed_mph = avg_speed_mph
        self.pickup_distance = pickup_distance_miles      # distance from start to pickup
        self.dropoff_distance = dropoff_distance_miles    # distance from start to dropoff (total trip end)

        self.cycle_minutes_used = cycle_hours_used * 60
        self.start_time = start_time or datetime.now()

        # running counters
        self.distance_covered = 0
        self.minutes_driven_today = 0          # resets on 10hr off duty
        self.minutes_on_duty_today = 0         # resets on 10hr off duty
        self.minutes_since_break = 0           # resets on 30 min break OR on duty status change
        self.miles_since_fuel = 0

        self.segments = []
        self.current_time = self.start_time

        # flags so we only trigger pickup/dropoff once
        self.pickup_done = False
        self.dropoff_done = False

    # ---------- helpers ----------

    def _add_segment(self, status, duration_minutes, label=""):
        seg = Segment(status, self.current_time, duration_minutes, label)
        self.segments.append(seg)
        self.current_time = seg.end_time
        return seg

    def _do_off_duty_reset(self, hours=10, label="Mandatory 10hr rest"):
        minutes = hours * 60
        self._add_segment(OFF_DUTY, minutes, label)
        self.minutes_driven_today = 0
        self.minutes_on_duty_today = 0
        self.minutes_since_break = 0
        self.cycle_minutes_used += 0  # off duty doesn't add to cycle, but doesn't reduce it either here

    def _do_on_duty_stop(self, minutes, label):
        self._add_segment(ON_DUTY_NOT_DRIVING, minutes, label)
        self.minutes_on_duty_today += minutes
        self.cycle_minutes_used += minutes
        self.minutes_since_break = 0  # a stop counts as breaking up driving

    # ---------- core loop ----------

    def plan(self):
        """
        Walk through the trip in chunks. At each step we find the SMALLEST
        constraint that would trigger next, drive up to that point, then
        apply whichever stop is needed (break, fuel, pickup, dropoff, or
        end-of-day rest). Repeat until distance_covered >= total_distance.
        """
        safety_counter = 0  # avoid infinite loops while debugging

        while self.distance_covered < self.total_distance:
            safety_counter += 1
            if safety_counter > 2000:
                raise RuntimeError("Trip planning loop ran too long — check logic")

            remaining_distance = self.total_distance - self.distance_covered

            # Figure out how many minutes of DRIVING we can do before hitting
            # whichever limit comes first.
            minutes_to_11hr_limit = MAX_DRIVING_PER_DAY - self.minutes_driven_today
            minutes_to_14hr_window = MAX_DUTY_WINDOW - self.minutes_on_duty_today
            minutes_to_break = BREAK_AFTER_DRIVING - self.minutes_since_break

            # convert remaining distance to minutes of driving needed
            minutes_to_finish_trip = (remaining_distance / self.avg_speed_mph) * 60

            # convert "miles until next fuel stop" to minutes of driving
            miles_to_fuel = FUEL_STOP_EVERY_MILES - self.miles_since_fuel
            minutes_to_fuel = (miles_to_fuel / self.avg_speed_mph) * 60

            # distance (in minutes of driving) until pickup / dropoff trigger
            minutes_to_pickup = None
            if not self.pickup_done:
                dist_to_pickup = self.pickup_distance - self.distance_covered
                if dist_to_pickup > 0:
                    minutes_to_pickup = (dist_to_pickup / self.avg_speed_mph) * 60

            minutes_to_dropoff = None
            if not self.dropoff_done:
                dist_to_dropoff = self.dropoff_distance - self.distance_covered
                if dist_to_dropoff > 0:
                    minutes_to_dropoff = (dist_to_dropoff / self.avg_speed_mph) * 60

            # candidates: (minutes_available, what_happens_next)
            candidates = [
                (minutes_to_11hr_limit, "rest_11hr"),
                (minutes_to_14hr_window, "rest_14hr"),
                (minutes_to_break, "break"),
                (minutes_to_finish_trip, "finish"),
                (minutes_to_fuel, "fuel"),
            ]
            if minutes_to_pickup is not None:
                candidates.append((minutes_to_pickup, "pickup"))
            if minutes_to_dropoff is not None:
                candidates.append((minutes_to_dropoff, "dropoff"))

            # pick whichever happens soonest (smallest positive minutes)
            candidates = [c for c in candidates if c[0] > 0.01]
            drive_minutes, trigger = min(candidates, key=lambda c: c[0])

            # ---- drive for that many minutes ----
            drive_minutes = round(drive_minutes, 2)
            miles_this_leg = (drive_minutes / 60) * self.avg_speed_mph

            self._add_segment(DRIVING, drive_minutes, "En route")
            self.distance_covered += miles_this_leg
            self.minutes_driven_today += drive_minutes
            self.minutes_on_duty_today += drive_minutes
            self.minutes_since_break += drive_minutes
            self.miles_since_fuel += miles_this_leg

            # ---- apply whichever trigger fired ----
            if trigger == "finish":
                self.dropoff_done = True
                self._do_on_duty_stop(PICKUP_DROPOFF_DURATION, "Drop-off")
                break

            elif trigger == "pickup":
                self.pickup_done = True
                self._do_on_duty_stop(PICKUP_DROPOFF_DURATION, "Pick-up")

            elif trigger == "dropoff":
                # shouldn't normally hit this before "finish", but just in case
                self.dropoff_done = True
                self._do_on_duty_stop(PICKUP_DROPOFF_DURATION, "Drop-off")
                break

            elif trigger == "fuel":
                self._do_on_duty_stop(FUEL_STOP_DURATION, "Fuel stop")
                self.miles_since_fuel = 0

            elif trigger == "break":
                self._add_segment(OFF_DUTY, REQUIRED_BREAK, "30-min break")
                self.minutes_since_break = 0
                self.minutes_on_duty_today += REQUIRED_BREAK  # break still counts in 14hr window per FMCSA

            elif trigger in ("rest_11hr", "rest_14hr"):
                self._do_off_duty_reset(hours=10, label="End of day — 10hr rest")

        return self.segments

    def to_daily_logs(self):
        """
        Group segments by calendar day so the frontend can draw one
        ELD grid per day. Any segment crossing midnight is split at the boundary.
        """
        split_segments = []
        for seg in self.segments:
            curr_start = seg.start_time
            curr_end = seg.end_time
            
            # Split segment at each midnight it crosses
            while curr_start.date() < curr_end.date():
                # Find the next midnight
                next_midnight = datetime.combine(curr_start.date() + timedelta(days=1), datetime.min.time())
                duration = int((next_midnight - curr_start).total_seconds() / 60)
                if duration > 0:
                    split_segments.append(Segment(seg.status, curr_start, duration, seg.location_label))
                curr_start = next_midnight
            
            # Add the remaining part
            duration = int((curr_end - curr_start).total_seconds() / 60)
            if duration > 0:
                split_segments.append(Segment(seg.status, curr_start, duration, seg.location_label))

        days = {}
        for seg in split_segments:
            day_key = seg.start_time.date().isoformat()
            # Construct a full day layout with basic metadata placeholder
            if day_key not in days:
                days[day_key] = {
                    "date_formatted": {
                        "month": f"{seg.start_time.month:02d}",
                        "day": f"{seg.start_time.day:02d}",
                        "year": str(seg.start_time.year)
                    },
                    "from_city": "Departure Point",
                    "to_city": "Arrival Point",
                    "carrier": "RouteHaul Logistics Inc.",
                    "home_terminal": "Primary Terminal",
                    "main_office": "Logistics HQ Office",
                    "truck_number": "TRK-900",
                    "trailer_number": "TRL-900",
                    "total_miles_driving": 0,
                    "total_miles_today": 0,
                    "shipping_doc_no": "SH-DOC-9000",
                    "shipper_commodity": "General Cargo",
                    "segments": []
                }
            
            # Map segment status
            status_map = seg.to_dict()
            status_map["location"] = seg.location_label or "Transit"
            status_map["remark"] = seg.location_label or "En route"
            
            # Sum up miles if status is driving
            if seg.status == DRIVING:
                segment_miles = int((seg.duration_minutes / 60) * self.avg_speed_mph)
                days[day_key]["total_miles_driving"] += segment_miles
                days[day_key]["total_miles_today"] += segment_miles
                
            days[day_key]["segments"].append(status_map)

        # Fill any gaps with off_duty segments to ensure a continuous line from 00:00 to 24:00
        for day_key, day_data in days.items():
            day_start = datetime.combine(datetime.fromisoformat(day_key).date(), datetime.min.time())
            day_end = day_start + timedelta(days=1)
            
            day_segments = sorted(day_data["segments"], key=lambda s: s["start_time"])
            filled_segments = []
            
            curr_time = day_start
            for seg in day_segments:
                seg_start = datetime.fromisoformat(seg["start_time"])
                seg_end = datetime.fromisoformat(seg["end_time"])
                
                # Gap before this segment
                if seg_start > curr_time:
                    gap_duration = int((seg_start - curr_time).total_seconds() / 60)
                    if gap_duration > 0:
                        filled_segments.append({
                            "status": OFF_DUTY,
                            "start_time": curr_time.isoformat(),
                            "end_time": seg_start.isoformat(),
                            "duration_minutes": gap_duration,
                            "location_label": "Off Duty",
                            "location": "Off Duty",
                            "remark": "Off Duty"
                        })
                
                filled_segments.append(seg)
                curr_time = max(curr_time, seg_end)
            
            # Gap at the end of the day
            if curr_time < day_end:
                gap_duration = int((day_end - curr_time).total_seconds() / 60)
                if gap_duration > 0:
                    filled_segments.append({
                        "status": OFF_DUTY,
                        "start_time": curr_time.isoformat(),
                        "end_time": day_end.isoformat(),
                        "duration_minutes": gap_duration,
                        "location_label": "Off Duty",
                        "location": "Off Duty",
                        "remark": "Off Duty"
                    })
            
            day_data["segments"] = filled_segments
            
        return days
