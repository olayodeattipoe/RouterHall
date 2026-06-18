from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .planner import TripPlanner

class PlanTripView(APIView):
    def post(self, request, *args, **kwargs):
        data = request.data
        
        try:
            # Parse parameters with safe fallbacks
            total_distance = float(data.get("total_distance", 600))
            avg_speed = float(data.get("avg_speed", 55))
            pickup_distance = float(data.get("pickup_distance", 50))
            dropoff_distance = float(data.get("dropoff_distance", total_distance))
            cycle_hours_used = float(data.get("cycle_hours_used", 10))
            
            start_time_raw = data.get("start_time")
            start_time = None
            if start_time_raw:
                try:
                    # Try parsing common ISO formats
                    start_time = datetime.fromisoformat(start_time_raw.replace("Z", ""))
                except ValueError:
                    start_time = datetime.now()
            else:
                start_time = datetime.now()

            # Initialize and run the planner
            planner = TripPlanner(
                total_distance_miles=total_distance,
                avg_speed_mph=avg_speed,
                pickup_distance_miles=pickup_distance,
                dropoff_distance_miles=dropoff_distance,
                cycle_hours_used=cycle_hours_used,
                start_time=start_time
            )
            
            planner.plan()
            daily_logs = planner.to_daily_logs()
            
            # Additional metadata options passed from request to customize header
            carrier = data.get("carrier")
            truck_number = data.get("truck_number")
            trailer_number = data.get("trailer_number")
            shipping_doc_no = data.get("shipping_doc_no")
            shipper_commodity = data.get("shipper_commodity")
            
            for date_key in daily_logs:
                if carrier:
                    daily_logs[date_key]["carrier"] = carrier
                if truck_number:
                    daily_logs[date_key]["truck_number"] = truck_number
                if trailer_number:
                    daily_logs[date_key]["trailer_number"] = trailer_number
                if shipping_doc_no:
                    daily_logs[date_key]["shipping_doc_no"] = shipping_doc_no
                if shipper_commodity:
                    daily_logs[date_key]["shipper_commodity"] = shipper_commodity
                    
            return Response(daily_logs, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to plan trip schedule: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
