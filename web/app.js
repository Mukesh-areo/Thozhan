"use strict";
(() => {
  // packages/i18n/locales/en.json
  var en_default = {
    "app.name": "Thozhan",
    "app.tagline": "Your city, your ride",
    "app.language": "Language",
    "category.auto": "Auto",
    "category.bike": "Bike taxi",
    "category.cab-mini": "Cab Mini",
    "category.cab-sedan": "Cab Sedan",
    "category.cab-suv": "Cab SUV",
    "category.parcel-bike": "Parcel by bike",
    "category.parcel-auto": "Parcel by auto",
    "fare.total": "Total fare",
    "fare.line.base": "Minimum fare (first {km} km)",
    "fare.line.distance": "Additional distance ({km} km)",
    "fare.line.ride_time": "Ride time",
    "fare.line.waiting": "Waiting ({minutes} min)",
    "fare.line.night": "Night charge (10 PM – 5 AM)",
    "fare.line.weight": "Parcel weight charge",
    "fare.line.booking_fee": "Booking fee",
    "fare.line.minimum_fare_topup": "Minimum fare adjustment",
    "fare.line.rounding": "Rounding",
    "fare.ghat": "Ghat road fare",
    "fare.notBillable": "Reference fare only — not yet verified for billing",
    "tariff.status.OFFICIAL": "Government tariff",
    "tariff.status.PENDING_APPROVAL": "Awaiting government approval",
    "tariff.status.ILLUSTRATIVE": "Illustrative fare (demo only)",
    "tariff.source": "Source: {reference}",
    "tariff.assumption.rounding-nearest-rupee": "Rounded to the nearest rupee (rule not stated in the order)",
    "tariff.assumption.night-includes-waiting": "Night charge also applies to waiting (to be confirmed)",
    "tariff.assumption.night-by-start-time": "Night charge decided by trip start time (to be confirmed)",
    "tariff.assumption.ghat-base-distance-1800m": "Ghat minimum fare covers the first 1.8 km (to be confirmed)",
    "tariff.assumption.waiting-completed-minutes": "Waiting charged per completed minute (to be confirmed)",
    "tariff.assumption.no-published-bike-tariff": "No published government bike-taxi tariff",
    "tariff.assumption.no-sourced-cab-tariff": "Cab tariff not yet sourced",
    "tariff.assumption.parcel-commercial-pricing": "Parcel price is commercial, not a government fare",
    "trip.status.REQUESTED": "Looking for a driver",
    "trip.status.ACCEPTED": "Driver on the way",
    "trip.status.ARRIVED": "Driver has arrived",
    "trip.status.IN_PROGRESS": "On trip",
    "trip.status.METER_RUNNING": "Meter running",
    "trip.status.METER_PAUSED": "Meter paused",
    "trip.status.AT_PICKUP": "At pickup",
    "trip.status.PICKED_UP": "Parcel picked up",
    "trip.status.IN_TRANSIT": "Parcel on the way",
    "trip.status.AT_DROP": "At drop location",
    "trip.status.DELIVERED": "Delivered",
    "trip.status.RETURNED": "Returned to sender",
    "trip.status.COMPLETED": "Completed",
    "trip.status.CANCELLED": "Cancelled",
    "trip.action.accept": "Accept",
    "trip.action.arrive": "I have arrived",
    "trip.action.start": "Start trip",
    "trip.action.pause": "Pause meter",
    "trip.action.resume": "Resume meter",
    "trip.action.pickup": "Confirm pickup",
    "trip.action.depart": "Start delivery",
    "trip.action.reach-drop": "Reached drop",
    "trip.action.deliver": "Confirm delivery",
    "trip.action.return": "Return to sender",
    "trip.action.complete": "End trip",
    "trip.action.cancel": "Cancel",
    "meter.title": "Auto meter",
    "meter.start": "Start meter",
    "meter.stop": "Stop meter",
    "meter.hint": "Got an auto on the street? Start the meter for a fair, government-tariff fare.",
    "meter.vehicleNumber": "Auto registration number",
    "meter.scanQr": "Scan auto QR",
    "meter.distance": "Distance",
    "meter.waiting": "Waiting",
    "meter.elapsed": "Time",
    "meter.liveFare": "Fare so far",
    "meter.announce": "Fare so far is {amount}",
    "meter.flag.gps-gap": "GPS signal was lost for part of the trip",
    "meter.flag.speed-jump": "Some impossible GPS jumps were ignored",
    "meter.flag.clock-skew": "Device clock changed during the trip",
    "meter.flag.mock-location": "Fake location detected",
    "meter.flag.low-accuracy": "Some low-accuracy GPS readings were ignored",
    "meter.reportOvercharge": "Report overcharging",
    "parcel.restricted.cash": "Cash or jewellery",
    "parcel.restricted.hazardous": "Flammable or hazardous goods",
    "parcel.restricted.liquor": "Alcohol",
    "parcel.restricted.medicines-rx": "Prescription medicines",
    "parcel.restricted.animals": "Live animals",
    "parcel.weight": "Weight",
    "parcel.sender": "Sender",
    "parcel.receiver": "Receiver",
    "safety.sos": "SOS",
    "safety.shareTrip": "Share trip",
    "otp.label": "Trip OTP: {otp}",
    "ui.otherLanguage": "தமிழ்",
    "ui.brandSmall": "MOBILITY",
    "ui.workspace": "YOUR WORKSPACE",
    "ui.asideTitle": "A better way to move.",
    "ui.asideBody": "Built around our people. Made for Tamil Nadu.",
    "ui.pilot": "Chennai pilot",
    "ui.demoAccount": "Demo account",
    "ui.location": "Chennai, Tamil Nadu",
    "ui.demoPill": "INTERACTIVE DEMO",
    "ui.footer": "Designed for everyday journeys.",
    "ui.footerNote": "Demo rides · Government auto tariff · No real dispatch or payments",
    "ui.gotIt": "Got it",
    "ui.edition": "CHENNAI · PILOT EDITION",
    "ui.help.title": "Welcome to the pilot",
    "ui.help.body1": "Book a ride or parcel, switch to Driver workspace to accept it, verify the OTP and complete the trip. Got an auto on the street? Use the Auto meter. Officials can check any fare in Fare check.",
    "ui.help.body2": "Data is saved only in this browser. Drivers, booking routes and payments are simulated. The meter uses real phone GPS. No real emergency response is connected.",
    "ui.nav.ride": "Book a ride",
    "ui.nav.meter": "Auto meter",
    "ui.nav.parcel": "Send parcel",
    "ui.nav.trips": "My trips",
    "ui.nav.driver": "Driver workspace",
    "ui.nav.ops": "Operations",
    "ui.nav.verify": "Fare check",
    "ui.ride.title": "Where are we going today?",
    "ui.ride.sub": "Auto fares follow the Tamil Nadu government tariff.",
    "ui.ride.now": "Ride now",
    "ui.ride.later": "Schedule",
    "ui.field.pickup": "PICKUP",
    "ui.field.drop": "WHERE TO?",
    "ui.field.departure": "DEPARTURE TIME",
    "ui.route.approx": "Approx. {km} km",
    "ui.route.note": "Estimated route, not live GPS",
    "ui.choose": "Choose your ride",
    "ui.seats": "{n} seats",
    "ui.estimated": "estimated",
    "ui.payment": "Payment method",
    "ui.pay.cash": "Cash",
    "ui.pay.upi": "UPI",
    "ui.book": "Book {name}",
    "ui.schedule": "Schedule {name}",
    "ui.demoOnly": "Demo booking only",
    "ui.fareDetails": "View fare details",
    "ui.fare.title": "Fare details",
    "ui.fare.estimateNote": "Estimate from an approximate route. The final fare uses measured distance and waiting time.",
    "ui.map.area": "Chennai service area",
    "ui.map.title": "Got an auto on the street?",
    "ui.map.sub": "Start the auto meter →",
    "ui.map.legend": "Illustrative map · not GPS",
    "ui.benefit1.title": "Government fare, every time",
    "ui.benefit1.body": "Itemised receipt that quotes the tariff order.",
    "ui.benefit2.title": "People before percentages",
    "ui.benefit2.body": "₹10 per active day. Zero commission.",
    "ui.benefit3.title": "Safety at every turn",
    "ui.benefit3.body": "Trip OTP, trip sharing and safety reporting.",
    "ui.banner.title": "Our city. Our people. Our journey.",
    "ui.banner.body": "A more connected Tamil Nadu begins with a better everyday ride.",
    "ui.banner.cta": "About the pilot",
    "ui.about.title": "Made for Tamil Nadu",
    "ui.about.body": "Thozhan is a pilot concept for transparent government-tariff fares, fair driver earnings and accessible mobility in Tamil and English. Live dispatch, verification, payments and emergency response need production implementation and approval.",
    "ui.legal.PERMITTED": "Permitted",
    "ui.legal.PILOT_APPROVAL_REQUIRED": "Needs pilot approval",
    "ui.legal.PENDING_CLARIFICATION": "Awaiting government permission",
    "ui.hint.requested": "Switch to Driver workspace to accept this request.",
    "ui.hint.accepted": "Driver is on the way. Mark arrival in Driver workspace.",
    "ui.hint.arrived": "Share the start OTP with the driver.",
    "ui.hint.inProgress": "Trip in progress. Complete it in Driver workspace.",
    "ui.hint.inTransit": "The receiver shares the drop OTP at delivery.",
    "ui.trip.scheduled": "Scheduled: {time}",
    "ui.trip.awaitingDriver": "Awaiting demo driver",
    "ui.trip.startOtp": "START OTP",
    "ui.trip.dropOtp": "DROP OTP (give to receiver)",
    "ui.trip.estimatedFare": "Estimated fare",
    "ui.trip.payment": "Payment",
    "ui.trip.demoPayment": "{method} · demo only",
    "ui.trip.safety": "Safety help",
    "ui.trip.shareText": "Thozhan demo trip {id}: {from} to {to}. Status: {status}. Not live tracking.",
    "ui.trip.summary": "Trip summary",
    "ui.copied": "Trip summary copied.",
    "ui.cancel.title": "Cancel this request?",
    "ui.cancel.body": "No cancellation fee will be charged.",
    "ui.cancel.confirm": "Confirm cancellation",
    "ui.safety.title": "Safety help — demonstration",
    "ui.safety.body": "This demo does not contact emergency services. In a real emergency call 112 directly.",
    "ui.safety.report": "Create a demo support case",
    "ui.safety.saved": "Case saved. View it in Operations.",
    "ui.err.same-place": "Choose different pickup and drop locations.",
    "ui.err.active-trip": "Finish the current trip first.",
    "ui.err.past-departure": "Choose a future departure time.",
    "ui.err.disabled": "This service is not available yet.",
    "ui.err.weight": "Enter a weight within the vehicle limit.",
    "ui.err.offline": "Go online to accept requests.",
    "ui.err.otp": "OTP does not match.",
    "ui.err.not-allowed": "That action is not allowed now.",
    "ui.err.no-trip": "No active trip.",
    "ui.booked": "Request created. Open Driver workspace to accept.",
    "ui.updated": "Trip status updated.",
    "ui.completedToast": "Trip completed. Earnings updated.",
    "ui.parcel.title": "Send a parcel",
    "ui.parcel.sub": "Pickup and drop OTPs keep your parcel safe.",
    "ui.parcel.receiverName": "Receiver name",
    "ui.parcel.weightKg": "Weight (kg)",
    "ui.parcel.vehicle": "Vehicle",
    "ui.parcel.max": "Up to {kg} kg",
    "ui.parcel.restricted": "Not allowed:",
    "ui.parcel.book": "Send by {name}",
    "ui.meter.sub": "Fair fare under the government tariff, measured by your phone's GPS.",
    "ui.meter.optional": "optional",
    "ui.meter.terrain": "Road type",
    "ui.meter.plain": "City / plain",
    "ui.meter.ghat": "Ghat road",
    "ui.meter.source": "Location source",
    "ui.meter.gps": "Phone GPS",
    "ui.meter.sim": "Demo simulation (10× speed)",
    "ui.meter.voice": "Announce fare by voice",
    "ui.meter.waitingGps": "Waiting for GPS signal…",
    "ui.meter.keepOpen": "Keep this screen open during the trip.",
    "ui.meter.night": "Night fare",
    "ui.meter.receipt": "Meter receipt",
    "ui.meter.asked": "Amount the driver asked (₹)",
    "ui.meter.askedMissing": "Enter the amount the driver asked.",
    "ui.meter.reported": "Report saved. Visible in Operations.",
    "ui.meter.noFix": "No usable GPS reading was received; nothing was saved.",
    "ui.meter.shareText": "I am on an auto ride with the Thozhan meter running.",
    "ui.meter.err.unsupported": "This browser has no GPS access. Try the demo simulation.",
    "ui.meter.err.denied": "Location permission was denied.",
    "ui.meter.err.unavailable": "GPS is unavailable right now.",
    "ui.meter.err.timeout": "GPS took too long to respond.",
    "ui.go.minDist": "Minimum distance",
    "ui.go.minDistVal": "1.8 km",
    "ui.go.minFare": "Minimum fare",
    "ui.go.minFareVal": "₹50",
    "ui.go.perKm": "Each additional km",
    "ui.go.perKmVal": "₹25",
    "ui.go.waiting": "Waiting",
    "ui.go.waitingVal": "₹1 per minute",
    "ui.go.night": "Night (10 PM – 5 AM)",
    "ui.go.nightVal": "1.5 × regular fare",
    "ui.go.ghat": "Ghat road",
    "ui.go.ghatVal": "₹60 base · ₹30 per km",
    "ui.th.trip": "TRIP",
    "ui.th.journey": "JOURNEY",
    "ui.th.service": "SERVICE",
    "ui.th.fare": "FARE",
    "ui.th.status": "STATUS",
    "ui.details": "Details",
    "ui.empty": "No trips yet.",
    "ui.notInvoice": "Demo record only. Not a tax invoice or proof of payment.",
    "ui.trips.title": "Your journeys, all in one place.",
    "ui.trips.sub": "Booked rides, parcels and meter trips.",
    "ui.trips.streetHail": "Street hail (meter)",
    "ui.driver.title": "A good day starts with you.",
    "ui.driver.sub": "Your trips, your earnings, your way.",
    "ui.online": "Online · switch",
    "ui.offline": "Offline · switch",
    "ui.driver.workspace": "Trip workspace",
    "ui.driver.demo": "Demo driver",
    "ui.driver.enterOtp": "ENTER START OTP",
    "ui.driver.enterDropOtp": "ENTER DROP OTP",
    "ui.driver.otpPlaceholder": "4-digit OTP",
    "ui.driver.note": "This updates the passenger and operations views.",
    "ui.driver.ready": "Ready for the next journey. Create a request in Book a ride or Send parcel.",
    "ui.driver.plan": "Your active-day plan",
    "ui.driver.planBody": "₹10 after your first completed trip of the day (India time). No fee just for going online.",
    "ui.driver.commission": "Percentage commission",
    "ui.driver.dailyFee": "Daily platform fee",
    "ui.driver.chargedDays": "Charged days",
    "ui.driver.ledgerNote": "Demonstration ledger. No money is collected.",
    "ui.driver.history": "Ride history",
    "ui.m.completed": "Completed trips",
    "ui.m.completedNote": "In this browser",
    "ui.m.earnings": "Ride earnings",
    "ui.m.earningsNote": "Gross booked fares",
    "ui.m.fees": "Platform fees",
    "ui.m.feesNote": "Once per active day",
    "ui.m.net": "Net earnings",
    "ui.m.netNote": "Before vehicle costs and taxes",
    "ui.ops.title": "The city, at a glance.",
    "ui.ops.sub": "Pilot operations · demonstration records from this browser",
    "ui.ops.requests": "Total requests",
    "ui.ops.active": "Active trips",
    "ui.ops.completed": "Completed",
    "ui.ops.cases": "Support cases",
    "ui.ops.local": "Browser-local demo data",
    "ui.ops.compliance": "Fare compliance (aggregate)",
    "ui.ops.meterTrips": "Meter trips",
    "ui.ops.overcharge": "Overcharge reports",
    "ui.ops.avgOver": "Average asked above meter",
    "ui.ops.complianceNote": "Aggregate figures only. No personal data is shown.",
    "ui.ops.controls": "Service switches",
    "ui.ops.controlsSub": "Turn services on only after the required approval.",
    "ui.on": "On",
    "ui.off": "Off",
    "ui.ops.activity": "Trip activity",
    "ui.ops.activitySub": "One shared view of every journey.",
    "ui.ops.export": "Export CSV",
    "ui.ops.casesTitle": "Safety and fare cases",
    "ui.ops.noCases": "No cases yet.",
    "ui.case.safety": "Safety",
    "ui.case.overcharge": "Asked {asked} · meter {meter}",
    "ui.ops.demoData": "Demo data",
    "ui.ops.demoDataSub": "Records live only in this browser.",
    "ui.ops.reset": "Reset demo data",
    "ui.reset.title": "Reset demo data?",
    "ui.reset.body": "This removes trips, daily charges, cases and service switches saved in this browser.",
    "ui.reset.confirm": "Delete demo records",
    "ui.reset.done": "Demo records cleared.",
    "ui.verify.title": "Fare check",
    "ui.verify.sub": "For officials: check any trip against the notified tariff.",
    "ui.verify.category": "Service",
    "ui.verify.distance": "Distance (km)",
    "ui.verify.waiting": "Waiting (minutes)",
    "ui.verify.ride": "Ride time (minutes)",
    "ui.verify.start": "Trip start (India time; blank = now)",
    "ui.verify.official": "Notified auto rates — G.O. Ms. No. 366 (2026)",
    "ui.verify.note": "The same fare engine runs in the meter, the booking flow and this page.",
    "ui.unit.km": "km",
    "ui.unit.min": "min"
  };

  // packages/i18n/locales/ta.json
  var ta_default = {
    "app.name": "தோழன்",
    "app.tagline": "உங்கள் நகரம், உங்கள் பயணம்",
    "app.language": "மொழி",
    "category.auto": "ஆட்டோ",
    "category.bike": "பைக் டாக்ஸி",
    "category.cab-mini": "கேப் மினி",
    "category.cab-sedan": "கேப் செடான்",
    "category.cab-suv": "கேப் எஸ்யூவி",
    "category.parcel-bike": "பைக் மூலம் பார்சல்",
    "category.parcel-auto": "ஆட்டோ மூலம் பார்சல்",
    "fare.total": "மொத்தக் கட்டணம்",
    "fare.line.base": "குறைந்தபட்சக் கட்டணம் (முதல் {km} கி.மீ.)",
    "fare.line.distance": "கூடுதல் தூரம் ({km} கி.மீ.)",
    "fare.line.ride_time": "பயண நேரம்",
    "fare.line.waiting": "காத்திருப்பு ({minutes} நிமி.)",
    "fare.line.night": "இரவுக் கட்டணம் (இரவு 10 – காலை 5)",
    "fare.line.weight": "பார்சல் எடைக் கட்டணம்",
    "fare.line.booking_fee": "முன்பதிவுக் கட்டணம்",
    "fare.line.minimum_fare_topup": "குறைந்தபட்சக் கட்டணச் சரிசெய்தல்",
    "fare.line.rounding": "முழுமையாக்கல்",
    "fare.ghat": "மலைப்பாதைக் கட்டணம்",
    "fare.notBillable": "குறிப்புக் கட்டணம் மட்டுமே — வசூலுக்கு இன்னும் சரிபார்க்கப்படவில்லை",
    "tariff.status.OFFICIAL": "அரசு நிர்ணயித்த கட்டணம்",
    "tariff.status.PENDING_APPROVAL": "அரசு ஒப்புதலுக்குக் காத்திருக்கிறது",
    "tariff.status.ILLUSTRATIVE": "மாதிரிக் கட்டணம் (செயல்விளக்கம் மட்டும்)",
    "tariff.source": "ஆதாரம்: {reference}",
    "tariff.assumption.rounding-nearest-rupee": "அருகிலுள்ள ரூபாய்க்கு முழுமையாக்கப்பட்டது (அரசாணையில் குறிப்பிடப்படவில்லை)",
    "tariff.assumption.night-includes-waiting": "இரவுக் கட்டணம் காத்திருப்புக்கும் பொருந்தும் (உறுதிசெய்யப்பட வேண்டும்)",
    "tariff.assumption.night-by-start-time": "பயணம் தொடங்கிய நேரத்தைக் கொண்டு இரவுக் கட்டணம் (உறுதிசெய்யப்பட வேண்டும்)",
    "tariff.assumption.ghat-base-distance-1800m": "மலைப்பாதைக் குறைந்தபட்சக் கட்டணம் முதல் 1.8 கி.மீ.க்கு (உறுதிசெய்யப்பட வேண்டும்)",
    "tariff.assumption.waiting-completed-minutes": "முழு நிமிடங்களுக்கு மட்டும் காத்திருப்புக் கட்டணம் (உறுதிசெய்யப்பட வேண்டும்)",
    "tariff.assumption.no-published-bike-tariff": "பைக் டாக்ஸிக்கு அரசு கட்டணம் வெளியிடப்படவில்லை",
    "tariff.assumption.no-sourced-cab-tariff": "கேப் கட்டண ஆதாரம் இன்னும் பெறப்படவில்லை",
    "tariff.assumption.parcel-commercial-pricing": "பார்சல் விலை வணிக விலை; அரசு கட்டணம் அல்ல",
    "trip.status.REQUESTED": "ஓட்டுநரைத் தேடுகிறது",
    "trip.status.ACCEPTED": "ஓட்டுநர் வந்துகொண்டிருக்கிறார்",
    "trip.status.ARRIVED": "ஓட்டுநர் வந்துவிட்டார்",
    "trip.status.IN_PROGRESS": "பயணத்தில்",
    "trip.status.METER_RUNNING": "மீட்டர் இயங்குகிறது",
    "trip.status.METER_PAUSED": "மீட்டர் நிறுத்தப்பட்டுள்ளது",
    "trip.status.AT_PICKUP": "எடுக்கும் இடத்தில்",
    "trip.status.PICKED_UP": "பார்சல் எடுக்கப்பட்டது",
    "trip.status.IN_TRANSIT": "பார்சல் வழியில் உள்ளது",
    "trip.status.AT_DROP": "சேர்க்கும் இடத்தில்",
    "trip.status.DELIVERED": "ஒப்படைக்கப்பட்டது",
    "trip.status.RETURNED": "அனுப்புநருக்குத் திருப்பப்பட்டது",
    "trip.status.COMPLETED": "முடிந்தது",
    "trip.status.CANCELLED": "ரத்துசெய்யப்பட்டது",
    "trip.action.accept": "ஏற்றுக்கொள்",
    "trip.action.arrive": "வந்துவிட்டேன்",
    "trip.action.start": "பயணத்தைத் தொடங்கு",
    "trip.action.pause": "மீட்டரை நிறுத்து",
    "trip.action.resume": "மீட்டரைத் தொடர்",
    "trip.action.pickup": "எடுத்ததை உறுதிசெய்",
    "trip.action.depart": "டெலிவரியைத் தொடங்கு",
    "trip.action.reach-drop": "சேர்க்கும் இடத்தை அடைந்தேன்",
    "trip.action.deliver": "ஒப்படைத்ததை உறுதிசெய்",
    "trip.action.return": "அனுப்புநருக்குத் திருப்பு",
    "trip.action.complete": "பயணத்தை முடி",
    "trip.action.cancel": "ரத்துசெய்",
    "meter.title": "ஆட்டோ மீட்டர்",
    "meter.start": "மீட்டரைத் தொடங்கு",
    "meter.stop": "மீட்டரை முடி",
    "meter.hint": "சாலையில் ஆட்டோ கிடைத்ததா? அரசு கட்டணப்படி நியாயமான கட்டணத்திற்கு மீட்டரைத் தொடங்குங்கள்.",
    "meter.vehicleNumber": "ஆட்டோ பதிவு எண்",
    "meter.scanQr": "ஆட்டோ QR ஸ்கேன் செய்",
    "meter.distance": "தூரம்",
    "meter.waiting": "காத்திருப்பு",
    "meter.elapsed": "நேரம்",
    "meter.liveFare": "இதுவரை கட்டணம்",
    "meter.announce": "இதுவரை கட்டணம் {amount}",
    "meter.flag.gps-gap": "பயணத்தின் ஒரு பகுதியில் GPS சிக்னல் கிடைக்கவில்லை",
    "meter.flag.speed-jump": "சாத்தியமற்ற சில GPS தாவல்கள் புறக்கணிக்கப்பட்டன",
    "meter.flag.clock-skew": "பயணத்தின்போது சாதன நேரம் மாற்றப்பட்டது",
    "meter.flag.mock-location": "போலி இருப்பிடம் கண்டறியப்பட்டது",
    "meter.flag.low-accuracy": "துல்லியம் குறைந்த சில GPS அளவீடுகள் புறக்கணிக்கப்பட்டன",
    "meter.reportOvercharge": "அதிகக் கட்டணம் வசூலித்ததைப் புகாரளி",
    "parcel.restricted.cash": "பணம் அல்லது நகைகள்",
    "parcel.restricted.hazardous": "எளிதில் தீப்பற்றும் அல்லது அபாயகரமான பொருட்கள்",
    "parcel.restricted.liquor": "மதுபானம்",
    "parcel.restricted.medicines-rx": "மருத்துவர் பரிந்துரை மருந்துகள்",
    "parcel.restricted.animals": "உயிருள்ள விலங்குகள்",
    "parcel.weight": "எடை",
    "parcel.sender": "அனுப்புநர்",
    "parcel.receiver": "பெறுநர்",
    "safety.sos": "அவசர உதவி",
    "safety.shareTrip": "பயணத்தைப் பகிர்",
    "otp.label": "பயண OTP: {otp}",
    "ui.otherLanguage": "English",
    "ui.brandSmall": "பயணம்",
    "ui.workspace": "உங்கள் பணியிடம்",
    "ui.asideTitle": "பயணிக்க ஒரு சிறந்த வழி.",
    "ui.asideBody": "நம் மக்களுக்காக உருவானது. தமிழ்நாட்டிற்காக உருவாக்கப்பட்டது.",
    "ui.pilot": "சென்னை முன்னோட்டம்",
    "ui.demoAccount": "செயல்விளக்கக் கணக்கு",
    "ui.location": "சென்னை, தமிழ்நாடு",
    "ui.demoPill": "செயல்விளக்கம்",
    "ui.footer": "அன்றாடப் பயணங்களுக்காக வடிவமைக்கப்பட்டது.",
    "ui.footerNote": "செயல்விளக்கப் பயணங்கள் · அரசு ஆட்டோ கட்டணம் · உண்மையான ஒதுக்கீடு அல்லது பணம் செலுத்துதல் இல்லை",
    "ui.gotIt": "சரி",
    "ui.edition": "சென்னை · முன்னோட்டப் பதிப்பு",
    "ui.help.title": "முன்னோட்டத்திற்கு வரவேற்கிறோம்",
    "ui.help.body1": "பயணம் அல்லது பார்சலை முன்பதிவு செய்து, ஓட்டுநர் பணியிடத்தில் ஏற்று, OTP சரிபார்த்து பயணத்தை முடிக்கவும். சாலையில் ஆட்டோ கிடைத்தால் ஆட்டோ மீட்டரைப் பயன்படுத்துங்கள். அதிகாரிகள் கட்டணச் சரிபார்ப்பில் எந்தக் கட்டணத்தையும் சரிபார்க்கலாம்.",
    "ui.help.body2": "தரவு இந்த உலாவியில் மட்டுமே சேமிக்கப்படுகிறது. ஓட்டுநர்கள், முன்பதிவுப் பாதைகள், பணம் செலுத்துதல் ஆகியவை மாதிரிகள். மீட்டர் உண்மையான கைபேசி GPS-ஐப் பயன்படுத்துகிறது. உண்மையான அவசர உதவி இணைக்கப்படவில்லை.",
    "ui.nav.ride": "பயணம் முன்பதிவு",
    "ui.nav.meter": "ஆட்டோ மீட்டர்",
    "ui.nav.parcel": "பார்சல் அனுப்பு",
    "ui.nav.trips": "என் பயணங்கள்",
    "ui.nav.driver": "ஓட்டுநர் பணியிடம்",
    "ui.nav.ops": "செயல்பாடுகள்",
    "ui.nav.verify": "கட்டணச் சரிபார்ப்பு",
    "ui.ride.title": "இன்று எங்கே போகலாம்?",
    "ui.ride.sub": "ஆட்டோ கட்டணங்கள் தமிழ்நாடு அரசு நிர்ணயித்தபடி.",
    "ui.ride.now": "இப்போதே",
    "ui.ride.later": "பின்னர்",
    "ui.field.pickup": "ஏறும் இடம்",
    "ui.field.drop": "எங்கே?",
    "ui.field.departure": "புறப்படும் நேரம்",
    "ui.route.approx": "சுமார் {km} கி.மீ.",
    "ui.route.note": "மதிப்பீட்டுப் பாதை; நேரடி GPS அல்ல",
    "ui.choose": "வாகனத்தைத் தேர்ந்தெடுங்கள்",
    "ui.seats": "{n} இருக்கைகள்",
    "ui.estimated": "மதிப்பீடு",
    "ui.payment": "பணம் செலுத்தும் முறை",
    "ui.pay.cash": "ரொக்கம்",
    "ui.pay.upi": "UPI (யுபிஐ)",
    "ui.book": "{name} முன்பதிவு",
    "ui.schedule": "{name} திட்டமிடு",
    "ui.demoOnly": "செயல்விளக்க முன்பதிவு மட்டும்",
    "ui.fareDetails": "கட்டண விவரம்",
    "ui.fare.title": "கட்டண விவரம்",
    "ui.fare.estimateNote": "தோராயமான பாதையின் மதிப்பீடு. இறுதிக் கட்டணம் அளவிடப்பட்ட தூரம் மற்றும் காத்திருப்பு நேரத்தைப் பொறுத்தது.",
    "ui.map.area": "சென்னை சேவைப் பகுதி",
    "ui.map.title": "சாலையில் ஆட்டோ கிடைத்ததா?",
    "ui.map.sub": "ஆட்டோ மீட்டரைத் தொடங்கு →",
    "ui.map.legend": "மாதிரி வரைபடம் · GPS அல்ல",
    "ui.benefit1.title": "ஒவ்வொரு முறையும் அரசு கட்டணம்",
    "ui.benefit1.body": "அரசாணையைக் குறிப்பிடும் விரிவான ரசீது.",
    "ui.benefit2.title": "சதவீதத்தை விட மனிதர்கள் முக்கியம்",
    "ui.benefit2.body": "செயல்படும் நாளுக்கு ₹10. கமிஷன் இல்லை.",
    "ui.benefit3.title": "ஒவ்வொரு திருப்பத்திலும் பாதுகாப்பு",
    "ui.benefit3.body": "பயண OTP, பயணப் பகிர்வு, பாதுகாப்புப் புகார்.",
    "ui.banner.title": "நம் நகரம். நம் மக்கள். நம் பயணம்.",
    "ui.banner.body": "சிறந்த அன்றாடப் பயணத்தில் இணைந்த தமிழ்நாடு தொடங்குகிறது.",
    "ui.banner.cta": "முன்னோட்டம் பற்றி",
    "ui.about.title": "தமிழ்நாட்டிற்காக உருவாக்கப்பட்டது",
    "ui.about.body": "தோழன் என்பது வெளிப்படையான அரசு கட்டணம், ஓட்டுநர்களுக்கு நியாயமான வருமானம், தமிழிலும் ஆங்கிலத்திலும் எளிதான பயணம் ஆகியவற்றுக்கான முன்னோட்டத் திட்டம். நேரடி ஒதுக்கீடு, சரிபார்ப்பு, பணம் செலுத்துதல், அவசர உதவி ஆகியவற்றுக்கு முழு உருவாக்கமும் ஒப்புதலும் தேவை.",
    "ui.legal.PERMITTED": "அனுமதிக்கப்பட்டது",
    "ui.legal.PILOT_APPROVAL_REQUIRED": "முன்னோட்ட ஒப்புதல் தேவை",
    "ui.legal.PENDING_CLARIFICATION": "அரசு அனுமதிக்குக் காத்திருக்கிறது",
    "ui.hint.requested": "இந்தக் கோரிக்கையை ஏற்க ஓட்டுநர் பணியிடத்திற்குச் செல்லுங்கள்.",
    "ui.hint.accepted": "ஓட்டுநர் வருகிறார். ஓட்டுநர் பணியிடத்தில் வருகையைக் குறிக்கவும்.",
    "ui.hint.arrived": "தொடக்க OTP-ஐ ஓட்டுநரிடம் சொல்லுங்கள்.",
    "ui.hint.inProgress": "பயணம் நடைபெறுகிறது. ஓட்டுநர் பணியிடத்தில் முடிக்கவும்.",
    "ui.hint.inTransit": "ஒப்படைக்கும்போது பெறுநர் சேர்க்கும் OTP-ஐச் சொல்வார்.",
    "ui.trip.scheduled": "திட்டமிட்டது: {time}",
    "ui.trip.awaitingDriver": "ஓட்டுநருக்காகக் காத்திருக்கிறது",
    "ui.trip.startOtp": "தொடக்க OTP",
    "ui.trip.dropOtp": "சேர்க்கும் OTP (பெறுநரிடம் கொடுங்கள்)",
    "ui.trip.estimatedFare": "மதிப்பீட்டுக் கட்டணம்",
    "ui.trip.payment": "பணம் செலுத்துதல்",
    "ui.trip.demoPayment": "{method} · செயல்விளக்கம் மட்டும்",
    "ui.trip.safety": "பாதுகாப்பு உதவி",
    "ui.trip.shareText": "தோழன் பயணம் {id}: {from} முதல் {to} வரை. நிலை: {status}. நேரடிக் கண்காணிப்பு அல்ல.",
    "ui.trip.summary": "பயணச் சுருக்கம்",
    "ui.copied": "பயணச் சுருக்கம் நகலெடுக்கப்பட்டது.",
    "ui.cancel.title": "இந்தக் கோரிக்கையை ரத்துசெய்யவா?",
    "ui.cancel.body": "ரத்துக் கட்டணம் இல்லை.",
    "ui.cancel.confirm": "ரத்துசெய்வதை உறுதிசெய்",
    "ui.safety.title": "பாதுகாப்பு உதவி — செயல்விளக்கம்",
    "ui.safety.body": "இந்தச் செயல்விளக்கம் அவசர சேவைகளைத் தொடர்புகொள்ளாது. உண்மையான அவசரத்தில் நேரடியாக 112-ஐ அழையுங்கள்.",
    "ui.safety.report": "மாதிரி உதவிப் புகாரை உருவாக்கு",
    "ui.safety.saved": "புகார் சேமிக்கப்பட்டது. செயல்பாடுகளில் பார்க்கலாம்.",
    "ui.err.same-place": "வெவ்வேறு ஏறும் மற்றும் இறங்கும் இடங்களைத் தேர்ந்தெடுங்கள்.",
    "ui.err.active-trip": "முதலில் நடப்புப் பயணத்தை முடியுங்கள்.",
    "ui.err.past-departure": "எதிர்கால நேரத்தைத் தேர்ந்தெடுங்கள்.",
    "ui.err.disabled": "இந்தச் சேவை இன்னும் கிடைக்கவில்லை.",
    "ui.err.weight": "வாகன வரம்பிற்குள் எடையை உள்ளிடுங்கள்.",
    "ui.err.offline": "கோரிக்கைகளை ஏற்க ஆன்லைனுக்கு வாருங்கள்.",
    "ui.err.otp": "OTP பொருந்தவில்லை.",
    "ui.err.not-allowed": "இந்தச் செயல் இப்போது அனுமதிக்கப்படவில்லை.",
    "ui.err.no-trip": "நடப்புப் பயணம் இல்லை.",
    "ui.booked": "கோரிக்கை உருவாக்கப்பட்டது. ஏற்க ஓட்டுநர் பணியிடத்தைத் திறக்கவும்.",
    "ui.updated": "பயண நிலை புதுப்பிக்கப்பட்டது.",
    "ui.completedToast": "பயணம் முடிந்தது. வருமானம் புதுப்பிக்கப்பட்டது.",
    "ui.parcel.title": "பார்சல் அனுப்புங்கள்",
    "ui.parcel.sub": "எடுக்கும் மற்றும் சேர்க்கும் OTP உங்கள் பார்சலைப் பாதுகாக்கும்.",
    "ui.parcel.receiverName": "பெறுநர் பெயர்",
    "ui.parcel.weightKg": "எடை (கி.கி.)",
    "ui.parcel.vehicle": "வாகனம்",
    "ui.parcel.max": "{kg} கி.கி. வரை",
    "ui.parcel.restricted": "அனுமதி இல்லை:",
    "ui.parcel.book": "{name} மூலம் அனுப்பு",
    "ui.meter.sub": "உங்கள் கைபேசி GPS அளவீட்டில், அரசு கட்டணப்படி நியாயமான கட்டணம்.",
    "ui.meter.optional": "விருப்பம்",
    "ui.meter.terrain": "சாலை வகை",
    "ui.meter.plain": "நகரம் / சமவெளி",
    "ui.meter.ghat": "மலைப்பாதை",
    "ui.meter.source": "இருப்பிட ஆதாரம்",
    "ui.meter.gps": "கைபேசி GPS",
    "ui.meter.sim": "மாதிரி ஓட்டம் (10 மடங்கு வேகம்)",
    "ui.meter.voice": "கட்டணத்தைக் குரலில் அறிவி",
    "ui.meter.waitingGps": "GPS சிக்னலுக்காகக் காத்திருக்கிறது…",
    "ui.meter.keepOpen": "பயணம் முழுவதும் இந்தத் திரையைத் திறந்து வைத்திருங்கள்.",
    "ui.meter.night": "இரவுக் கட்டணம்",
    "ui.meter.receipt": "மீட்டர் ரசீது",
    "ui.meter.asked": "ஓட்டுநர் கேட்ட தொகை (₹)",
    "ui.meter.askedMissing": "ஓட்டுநர் கேட்ட தொகையை உள்ளிடுங்கள்.",
    "ui.meter.reported": "புகார் சேமிக்கப்பட்டது. செயல்பாடுகளில் தெரியும்.",
    "ui.meter.noFix": "பயன்படுத்தக்கூடிய GPS அளவீடு கிடைக்கவில்லை; எதுவும் சேமிக்கப்படவில்லை.",
    "ui.meter.shareText": "தோழன் மீட்டருடன் ஆட்டோவில் பயணிக்கிறேன்.",
    "ui.meter.err.unsupported": "இந்த உலாவியில் GPS வசதி இல்லை. மாதிரி ஓட்டத்தை முயற்சிக்கவும்.",
    "ui.meter.err.denied": "இருப்பிட அனுமதி மறுக்கப்பட்டது.",
    "ui.meter.err.unavailable": "GPS இப்போது கிடைக்கவில்லை.",
    "ui.meter.err.timeout": "GPS பதிலளிக்க அதிக நேரம் எடுத்தது.",
    "ui.go.minDist": "குறைந்தபட்சத் தூரம்",
    "ui.go.minDistVal": "1.8 கி.மீ.",
    "ui.go.minFare": "குறைந்தபட்சக் கட்டணம்",
    "ui.go.minFareVal": "₹50 (ரூபாய் 50)",
    "ui.go.perKm": "ஒவ்வொரு கூடுதல் கி.மீ.க்கும்",
    "ui.go.perKmVal": "₹25 (ரூபாய் 25)",
    "ui.go.waiting": "காத்திருப்பு",
    "ui.go.waitingVal": "நிமிடத்திற்கு ₹1",
    "ui.go.night": "இரவு (இரவு 10 – காலை 5)",
    "ui.go.nightVal": "வழக்கமான கட்டணத்தின் 1.5 மடங்கு",
    "ui.go.ghat": "மலைப்பாதை",
    "ui.go.ghatVal": "அடிப்படை ₹60 · கி.மீ.க்கு ₹30",
    "ui.th.trip": "பயணம்",
    "ui.th.journey": "வழி",
    "ui.th.service": "சேவை",
    "ui.th.fare": "கட்டணம்",
    "ui.th.status": "நிலை",
    "ui.details": "விவரம்",
    "ui.empty": "இன்னும் பயணங்கள் இல்லை.",
    "ui.notInvoice": "செயல்விளக்கப் பதிவு மட்டும். வரி விலைப்பட்டியல் அல்லது பணம் செலுத்தியதற்கான சான்று அல்ல.",
    "ui.trips.title": "உங்கள் பயணங்கள் அனைத்தும் ஒரே இடத்தில்.",
    "ui.trips.sub": "முன்பதிவுப் பயணங்கள், பார்சல்கள், மீட்டர் பயணங்கள்.",
    "ui.trips.streetHail": "சாலையில் பிடித்த ஆட்டோ (மீட்டர்)",
    "ui.driver.title": "நல்ல நாள் உங்களிடமிருந்து தொடங்குகிறது.",
    "ui.driver.sub": "உங்கள் பயணங்கள், உங்கள் வருமானம், உங்கள் வழி.",
    "ui.online": "ஆன்லைன் · மாற்று",
    "ui.offline": "ஆஃப்லைன் · மாற்று",
    "ui.driver.workspace": "பயணப் பணியிடம்",
    "ui.driver.demo": "மாதிரி ஓட்டுநர்",
    "ui.driver.enterOtp": "தொடக்க OTP-ஐ உள்ளிடுங்கள்",
    "ui.driver.enterDropOtp": "சேர்க்கும் OTP-ஐ உள்ளிடுங்கள்",
    "ui.driver.otpPlaceholder": "4 இலக்க OTP",
    "ui.driver.note": "இது பயணி மற்றும் செயல்பாட்டுத் திரைகளைப் புதுப்பிக்கும்.",
    "ui.driver.ready": "அடுத்த பயணத்திற்குத் தயார். பயணம் முன்பதிவு அல்லது பார்சல் அனுப்பு பகுதியில் கோரிக்கையை உருவாக்குங்கள்.",
    "ui.driver.plan": "உங்கள் செயல்படும் நாள் திட்டம்",
    "ui.driver.planBody": "அன்றைய முதல் பயணம் முடிந்த பின் ₹10 (இந்திய நேரம்). ஆன்லைனில் வருவதற்கு மட்டும் கட்டணம் இல்லை.",
    "ui.driver.commission": "சதவீதக் கமிஷன்",
    "ui.driver.dailyFee": "தினசரி தளக் கட்டணம்",
    "ui.driver.chargedDays": "கட்டணம் வசூலித்த நாட்கள்",
    "ui.driver.ledgerNote": "மாதிரிக் கணக்கேடு. பணம் வசூலிக்கப்படவில்லை.",
    "ui.driver.history": "பயண வரலாறு",
    "ui.m.completed": "முடிந்த பயணங்கள்",
    "ui.m.completedNote": "இந்த உலாவியில்",
    "ui.m.earnings": "பயண வருமானம்",
    "ui.m.earningsNote": "மொத்த முன்பதிவுக் கட்டணம்",
    "ui.m.fees": "தளக் கட்டணம்",
    "ui.m.feesNote": "செயல்படும் நாளுக்கு ஒருமுறை",
    "ui.m.net": "நிகர வருமானம்",
    "ui.m.netNote": "வாகனச் செலவு மற்றும் வரிக்கு முன்",
    "ui.ops.title": "நகரம், ஒரே பார்வையில்.",
    "ui.ops.sub": "முன்னோட்டச் செயல்பாடுகள் · இந்த உலாவியின் மாதிரிப் பதிவுகள்",
    "ui.ops.requests": "மொத்தக் கோரிக்கைகள்",
    "ui.ops.active": "நடப்புப் பயணங்கள்",
    "ui.ops.completed": "முடிந்தவை",
    "ui.ops.cases": "உதவிப் புகார்கள்",
    "ui.ops.local": "உலாவியிலுள்ள மாதிரித் தரவு",
    "ui.ops.compliance": "கட்டண இணக்கம் (மொத்தம்)",
    "ui.ops.meterTrips": "மீட்டர் பயணங்கள்",
    "ui.ops.overcharge": "அதிகக் கட்டணப் புகார்கள்",
    "ui.ops.avgOver": "மீட்டரை விட சராசரியாகக் கேட்கப்பட்ட கூடுதல்",
    "ui.ops.complianceNote": "மொத்த எண்ணிக்கை மட்டும். தனிப்பட்ட தரவு காட்டப்படவில்லை.",
    "ui.ops.controls": "சேவை இயக்கிகள்",
    "ui.ops.controlsSub": "தேவையான ஒப்புதலுக்குப் பிறகே சேவைகளை இயக்குங்கள்.",
    "ui.on": "இயக்கம்",
    "ui.off": "நிறுத்தம்",
    "ui.ops.activity": "பயணச் செயல்பாடு",
    "ui.ops.activitySub": "ஒவ்வொரு பயணத்தின் பொதுப் பார்வை.",
    "ui.ops.export": "CSV பதிவிறக்கு",
    "ui.ops.casesTitle": "பாதுகாப்பு மற்றும் கட்டணப் புகார்கள்",
    "ui.ops.noCases": "இன்னும் புகார்கள் இல்லை.",
    "ui.case.safety": "பாதுகாப்பு",
    "ui.case.overcharge": "கேட்டது {asked} · மீட்டர் {meter}",
    "ui.ops.demoData": "மாதிரித் தரவு",
    "ui.ops.demoDataSub": "பதிவுகள் இந்த உலாவியில் மட்டுமே உள்ளன.",
    "ui.ops.reset": "மாதிரித் தரவை அழி",
    "ui.reset.title": "மாதிரித் தரவை அழிக்கவா?",
    "ui.reset.body": "இந்த உலாவியில் சேமித்த பயணங்கள், தினசரிக் கட்டணங்கள், புகார்கள், சேவை இயக்கிகள் நீக்கப்படும்.",
    "ui.reset.confirm": "மாதிரிப் பதிவுகளை நீக்கு",
    "ui.reset.done": "மாதிரிப் பதிவுகள் நீக்கப்பட்டன.",
    "ui.verify.title": "கட்டணச் சரிபார்ப்பு",
    "ui.verify.sub": "அதிகாரிகளுக்கு: எந்தப் பயணத்தையும் அறிவிக்கப்பட்ட கட்டணத்துடன் சரிபாருங்கள்.",
    "ui.verify.category": "சேவை",
    "ui.verify.distance": "தூரம் (கி.மீ.)",
    "ui.verify.waiting": "காத்திருப்பு (நிமிடங்கள்)",
    "ui.verify.ride": "பயண நேரம் (நிமிடங்கள்)",
    "ui.verify.start": "பயணத் தொடக்கம் (இந்திய நேரம்; காலியாக இருந்தால் இப்போது)",
    "ui.verify.official": "அறிவிக்கப்பட்ட ஆட்டோ கட்டணம் — அரசாணை (நிலை) எண் 366 (2026)",
    "ui.verify.note": "இதே கட்டணக் கணக்கீடு மீட்டரிலும், முன்பதிவிலும், இந்தப் பக்கத்திலும் இயங்குகிறது.",
    "ui.unit.km": "கி.மீ.",
    "ui.unit.min": "நிமி."
  };

  // packages/i18n/src/index.ts
  var CATALOGS = Object.freeze({ en: en_default, ta: ta_default });
  var INTL_LOCALE = { ta: "ta-IN", en: "en-IN" };
  function pickLocale(preferred = []) {
    return preferred.some((l) => l.toLowerCase().startsWith("ta")) ? "ta" : preferred.length ? "en" : "ta";
  }
  function t(locale2, key, params = {}) {
    const template = CATALOGS[locale2][key] ?? CATALOGS.en[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match);
  }
  function formatMoney(paise, locale2) {
    return new Intl.NumberFormat(INTL_LOCALE[locale2], {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    }).format(paise / 100);
  }
  function formatKm(meters, locale2, digits = 1) {
    return new Intl.NumberFormat(INTL_LOCALE[locale2], { maximumFractionDigits: digits }).format(meters / 1e3);
  }

  // packages/shared/src/services.ts
  var PARCEL_RESTRICTED = ["parcel.restricted.cash", "parcel.restricted.hazardous", "parcel.restricted.liquor", "parcel.restricted.medicines-rx", "parcel.restricted.animals"];
  var noParcelFeatures = { dropOtp: false, proofOfDelivery: false };
  var CATEGORIES = Object.freeze([
    {
      id: "auto",
      service: "auto",
      nameKey: "category.auto",
      icon: "🛺",
      seats: 3,
      flows: ["ride", "meter"],
      driver: { licence: ["TRANS", "LMV-TR"], permit: "contract-carriage-auto", badgeRequired: true },
      features: { startOtp: true, ...noParcelFeatures, ghatFare: true, womenRiderPreference: true },
      legalStatus: "PILOT_APPROVAL_REQUIRED",
      enabledByDefault: true
    },
    {
      id: "bike",
      service: "bike",
      nameKey: "category.bike",
      icon: "🏍️",
      seats: 1,
      flows: ["ride"],
      driver: { licence: ["MCWG"], permit: "bike-taxi", badgeRequired: false },
      features: { startOtp: true, ...noParcelFeatures, ghatFare: false, womenRiderPreference: true },
      legalStatus: "PENDING_CLARIFICATION",
      enabledByDefault: false
    },
    ...["mini", "sedan", "suv"].map((size) => ({
      id: `cab-${size}`,
      service: "cab",
      nameKey: `category.cab-${size}`,
      icon: size === "suv" ? "🚙" : "🚗",
      seats: size === "suv" ? 6 : 4,
      flows: ["ride"],
      driver: { licence: ["LMV-TR", "TRANS"], permit: "contract-carriage-taxi", badgeRequired: true },
      features: { startOtp: true, ...noParcelFeatures, ghatFare: false, womenRiderPreference: true },
      legalStatus: "PILOT_APPROVAL_REQUIRED",
      enabledByDefault: false
    })),
    {
      id: "parcel-bike",
      service: "parcel",
      nameKey: "category.parcel-bike",
      icon: "📦",
      seats: 0,
      flows: ["delivery"],
      driver: { licence: ["MCWG"], permit: "goods-two-wheeler", badgeRequired: false },
      features: { startOtp: true, dropOtp: true, proofOfDelivery: true, ghatFare: false, womenRiderPreference: false },
      parcel: { maxWeightGrams: 1e4, restrictedItemKeys: PARCEL_RESTRICTED },
      legalStatus: "PENDING_CLARIFICATION",
      enabledByDefault: false
    },
    {
      id: "parcel-auto",
      service: "parcel",
      nameKey: "category.parcel-auto",
      icon: "📦",
      seats: 0,
      flows: ["delivery"],
      driver: { licence: ["TRANS", "LMV-TR"], permit: "goods-carriage-three-wheeler", badgeRequired: true },
      features: { startOtp: true, dropOtp: true, proofOfDelivery: true, ghatFare: false, womenRiderPreference: false },
      parcel: { maxWeightGrams: 5e4, restrictedItemKeys: PARCEL_RESTRICTED },
      legalStatus: "PENDING_CLARIFICATION",
      enabledByDefault: false
    }
  ]);
  function getCategory(id) {
    const category = CATEGORIES.find((c) => c.id === id);
    if (!category) throw new RangeError(`Unknown category ${id}`);
    return category;
  }

  // packages/shared/src/trip-machine.ts
  var MACHINES = Object.freeze({
    ride: {
      initial: "REQUESTED",
      terminal: ["COMPLETED", "CANCELLED"],
      transitions: {
        accept: { from: ["REQUESTED"], to: "ACCEPTED", by: ["driver"] },
        arrive: { from: ["ACCEPTED"], to: "ARRIVED", by: ["driver"] },
        start: { from: ["ARRIVED"], to: "IN_PROGRESS", by: ["driver"], guards: ["start-otp"] },
        complete: { from: ["IN_PROGRESS"], to: "COMPLETED", by: ["driver", "ops"] },
        cancel: { from: ["REQUESTED", "ACCEPTED", "ARRIVED"], to: "CANCELLED", by: ["rider", "driver", "ops", "system"] }
      }
    },
    meter: {
      initial: "METER_RUNNING",
      terminal: ["COMPLETED", "CANCELLED"],
      transitions: {
        pause: { from: ["METER_RUNNING"], to: "METER_PAUSED", by: ["rider", "driver"] },
        resume: { from: ["METER_PAUSED"], to: "METER_RUNNING", by: ["rider", "driver"] },
        complete: { from: ["METER_RUNNING", "METER_PAUSED"], to: "COMPLETED", by: ["rider", "driver"] },
        cancel: { from: ["METER_RUNNING", "METER_PAUSED"], to: "CANCELLED", by: ["rider", "driver"] }
      }
    },
    delivery: {
      initial: "REQUESTED",
      terminal: ["DELIVERED", "RETURNED", "CANCELLED"],
      transitions: {
        accept: { from: ["REQUESTED"], to: "ACCEPTED", by: ["driver"] },
        arrive: { from: ["ACCEPTED"], to: "AT_PICKUP", by: ["driver"] },
        pickup: { from: ["AT_PICKUP"], to: "PICKED_UP", by: ["driver"], guards: ["start-otp"] },
        depart: { from: ["PICKED_UP"], to: "IN_TRANSIT", by: ["driver"] },
        "reach-drop": { from: ["IN_TRANSIT"], to: "AT_DROP", by: ["driver"] },
        deliver: { from: ["AT_DROP"], to: "DELIVERED", by: ["driver"], guards: ["drop-otp"] },
        return: { from: ["PICKED_UP", "IN_TRANSIT", "AT_DROP"], to: "RETURNED", by: ["driver", "ops"] },
        cancel: { from: ["REQUESTED", "ACCEPTED", "AT_PICKUP"], to: "CANCELLED", by: ["rider", "driver", "ops", "system"] }
      }
    }
  });
  function transition(flow, status, action, ctx) {
    const t2 = MACHINES[flow].transitions[action];
    if (!t2) return { ok: false, reason: "invalid-action" };
    if (!t2.from.includes(status)) return { ok: false, reason: "wrong-state" };
    if (!t2.by.includes(ctx.actor)) return { ok: false, reason: "not-allowed" };
    const missing = (t2.guards ?? []).filter((g) => !ctx.disabledGuards?.includes(g) && !ctx.satisfied?.includes(g));
    if (missing.length) return { ok: false, reason: "guard", missing };
    return { ok: true, status: t2.to };
  }
  function availableActions(flow, status, actor) {
    return Object.entries(MACHINES[flow].transitions).filter(([, t2]) => t2.from.includes(status) && t2.by.includes(actor)).map(([action]) => action);
  }
  var isTerminal = (flow, status) => MACHINES[flow].terminal.includes(status);

  // packages/tariff/src/engine.ts
  var IST_OFFSET_MINUTES = 330;
  function toEpochMs(value) {
    const ms = value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value);
    if (!Number.isFinite(ms)) throw new RangeError(`Invalid startedAt: ${String(value)}`);
    return ms;
  }
  function parseClock(hhmm) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
    if (!match) throw new RangeError(`Invalid clock time: ${hhmm}`);
    return Number(match[1]) * 60 + Number(match[2]);
  }
  function istMinuteOfDay(at) {
    const minutes = Math.floor(toEpochMs(at) / 6e4) + IST_OFFSET_MINUTES;
    return (minutes % 1440 + 1440) % 1440;
  }
  function isNight(rule, at) {
    const m = istMinuteOfDay(at);
    const start = parseClock(rule.start);
    const end = parseClock(rule.end);
    return start <= end ? m >= start && m < end : m >= start || m < end;
  }
  function nonNegative(name, value) {
    const v = value ?? 0;
    if (!Number.isFinite(v) || v < 0) throw new RangeError(`${name} must be a non-negative number`);
    return v;
  }
  function calculateFare(rule, input) {
    const distanceMeters = nonNegative("distanceMeters", input.distanceMeters);
    const waitingSeconds = nonNegative("waitingSeconds", input.waitingSeconds);
    const rideSeconds = nonNegative("rideSeconds", input.rideSeconds);
    const terrain = input.terrain ?? "plain";
    const band = terrain === "ghat" ? rule.ghat : rule.plain;
    if (!band) throw new RangeError(`Tariff ${rule.id} has no ghat fare`);
    const lines = [];
    const add = (line) => {
      if (line.amountPaise !== 0) lines.push(line);
    };
    lines.push({ code: "base", amountPaise: band.baseFarePaise, detail: { meters: band.baseDistanceMeters } });
    const extraMeters = Math.max(0, distanceMeters - band.baseDistanceMeters);
    const distancePaise = Math.round(extraMeters * band.perKmPaise / 1e3);
    add({ code: "distance", amountPaise: distancePaise, detail: { meters: Math.round(extraMeters) } });
    const rideTimePaise = rule.perRideMinutePaise ? Math.round(rideSeconds / 60 * rule.perRideMinutePaise) : 0;
    add({ code: "ride_time", amountPaise: rideTimePaise, detail: { seconds: Math.round(rideSeconds) } });
    const billableWaitMinutes = Math.max(0, waitingSeconds / 60 - rule.waiting.freeMinutes);
    const waitMinutes = rule.waiting.minuteCounting === "ceil" ? Math.ceil(billableWaitMinutes) : Math.floor(billableWaitMinutes);
    const waitingPaise = waitMinutes * rule.waiting.perMinutePaise;
    add({ code: "waiting", amountPaise: waitingPaise, detail: { minutes: waitMinutes } });
    const startedAt = toEpochMs(input.startedAt);
    const night = rule.night ? isNight(rule.night, startedAt) : false;
    if (night && rule.night) {
      const scope = rule.night.appliesTo;
      const multiplied = band.baseFarePaise + distancePaise + (scope !== "distance" ? waitingPaise : 0) + (scope === "distance+waiting+time" ? rideTimePaise : 0);
      add({
        code: "night",
        amountPaise: Math.round(multiplied * (rule.night.multiplierPermille - 1e3) / 1e3),
        detail: { permille: rule.night.multiplierPermille }
      });
    }
    if (rule.service === "parcel" || input.weightGrams !== void 0) {
      const weight = nonNegative("weightGrams", input.weightGrams);
      if (rule.maxWeightGrams !== void 0 && weight > rule.maxWeightGrams) {
        throw new RangeError(`Parcel weight ${weight} g exceeds ${rule.maxWeightGrams} g for ${rule.category}`);
      }
      const slab = (rule.weightSlabs ?? []).filter((s) => weight > s.aboveGrams).sort((a, b) => b.aboveGrams - a.aboveGrams)[0];
      if (slab) add({ code: "weight", amountPaise: slab.surchargePaise, detail: { grams: weight } });
    }
    add({ code: "booking_fee", amountPaise: rule.bookingFeePaise ?? 0 });
    let total = lines.reduce((sum, l) => sum + l.amountPaise, 0);
    if (rule.minimumFarePaise !== void 0 && total < rule.minimumFarePaise) {
      add({ code: "minimum_fare_topup", amountPaise: rule.minimumFarePaise - total });
      total = rule.minimumFarePaise;
    }
    const rounded = rule.rounding === "nearest-rupee" ? Math.round(total / 100) * 100 : rule.rounding === "ceil-rupee" ? Math.ceil(total / 100) * 100 : total;
    add({ code: "rounding", amountPaise: rounded - total });
    const relevant = { night, ghat: terrain === "ghat", waiting: waitMinutes > 0 };
    const assumptions = rule.assumptions.filter((a) => !a.confirmed && (!a.appliesWhen || relevant[a.appliesWhen])).map((a) => a.code);
    return {
      ruleId: rule.id,
      ruleVersion: rule.version,
      category: rule.category,
      status: rule.status,
      legalReference: rule.legalReference,
      terrain,
      night,
      lines,
      totalPaise: rounded,
      assumptions,
      verifiedForBilling: rule.status === "OFFICIAL" && assumptions.length === 0
    };
  }

  // packages/tariff/rules/tamil-nadu.json
  var tamil_nadu_default = [
    {
      id: "tn-auto-2026",
      version: 1,
      jurisdiction: "IN-TN",
      service: "auto",
      category: "auto",
      status: "OFFICIAL",
      legalReference: "G.O. Ms. No. 366, Home (Transport-I) Department, 27.10.2026; Tamil Nadu Government Gazette Extraordinary No. 466, Part II, Section 2 (Notification No. II(2)/HO/842(f)/2026)",
      effectiveFrom: "2026-10-27",
      plain: {
        baseDistanceMeters: 1800,
        baseFarePaise: 5e3,
        perKmPaise: 2500
      },
      ghat: {
        baseDistanceMeters: 1800,
        baseFarePaise: 6e3,
        perKmPaise: 3e3
      },
      waiting: {
        perMinutePaise: 100,
        freeMinutes: 0,
        minuteCounting: "floor"
      },
      night: {
        start: "22:00",
        end: "05:00",
        multiplierPermille: 1500,
        appliesTo: "distance+waiting",
        decidedBy: "start"
      },
      rounding: "nearest-rupee",
      assumptions: [
        {
          code: "rounding-nearest-rupee",
          confirmed: false
        },
        {
          code: "night-includes-waiting",
          confirmed: false,
          appliesWhen: "night"
        },
        {
          code: "night-by-start-time",
          confirmed: false
        },
        {
          code: "ghat-base-distance-1800m",
          confirmed: false,
          appliesWhen: "ghat"
        },
        {
          code: "waiting-completed-minutes",
          confirmed: false,
          appliesWhen: "waiting"
        }
      ]
    },
    {
      id: "tn-bike-draft",
      version: 1,
      jurisdiction: "IN-TN",
      service: "bike",
      category: "bike",
      status: "ILLUSTRATIVE",
      legalReference: null,
      effectiveFrom: null,
      plain: {
        baseDistanceMeters: 2e3,
        baseFarePaise: 3e3,
        perKmPaise: 1e3
      },
      waiting: {
        perMinutePaise: 100,
        freeMinutes: 3,
        minuteCounting: "floor"
      },
      night: {
        start: "22:00",
        end: "05:00",
        multiplierPermille: 1250,
        appliesTo: "distance+waiting",
        decidedBy: "start"
      },
      rounding: "nearest-rupee",
      assumptions: [
        {
          code: "no-published-bike-tariff",
          confirmed: false
        }
      ]
    },
    {
      id: "tn-cab-mini-draft",
      version: 1,
      jurisdiction: "IN-TN",
      service: "cab",
      category: "cab-mini",
      status: "ILLUSTRATIVE",
      legalReference: null,
      effectiveFrom: null,
      plain: {
        baseDistanceMeters: 2e3,
        baseFarePaise: 1e4,
        perKmPaise: 2e3
      },
      perRideMinutePaise: 150,
      minimumFarePaise: 12e3,
      waiting: {
        perMinutePaise: 200,
        freeMinutes: 3,
        minuteCounting: "floor"
      },
      night: {
        start: "22:00",
        end: "05:00",
        multiplierPermille: 1250,
        appliesTo: "distance+waiting+time",
        decidedBy: "start"
      },
      rounding: "nearest-rupee",
      assumptions: [
        {
          code: "no-sourced-cab-tariff",
          confirmed: false
        }
      ]
    },
    {
      id: "tn-cab-sedan-draft",
      version: 1,
      jurisdiction: "IN-TN",
      service: "cab",
      category: "cab-sedan",
      status: "ILLUSTRATIVE",
      legalReference: null,
      effectiveFrom: null,
      plain: {
        baseDistanceMeters: 2e3,
        baseFarePaise: 12e3,
        perKmPaise: 2400
      },
      perRideMinutePaise: 200,
      minimumFarePaise: 15e3,
      waiting: {
        perMinutePaise: 200,
        freeMinutes: 3,
        minuteCounting: "floor"
      },
      night: {
        start: "22:00",
        end: "05:00",
        multiplierPermille: 1250,
        appliesTo: "distance+waiting+time",
        decidedBy: "start"
      },
      rounding: "nearest-rupee",
      assumptions: [
        {
          code: "no-sourced-cab-tariff",
          confirmed: false
        }
      ]
    },
    {
      id: "tn-cab-suv-draft",
      version: 1,
      jurisdiction: "IN-TN",
      service: "cab",
      category: "cab-suv",
      status: "ILLUSTRATIVE",
      legalReference: null,
      effectiveFrom: null,
      plain: {
        baseDistanceMeters: 2e3,
        baseFarePaise: 16e3,
        perKmPaise: 3e3
      },
      perRideMinutePaise: 250,
      minimumFarePaise: 2e4,
      waiting: {
        perMinutePaise: 300,
        freeMinutes: 3,
        minuteCounting: "floor"
      },
      night: {
        start: "22:00",
        end: "05:00",
        multiplierPermille: 1250,
        appliesTo: "distance+waiting+time",
        decidedBy: "start"
      },
      rounding: "nearest-rupee",
      assumptions: [
        {
          code: "no-sourced-cab-tariff",
          confirmed: false
        }
      ]
    },
    {
      id: "tn-parcel-bike-draft",
      version: 1,
      jurisdiction: "IN-TN",
      service: "parcel",
      category: "parcel-bike",
      status: "ILLUSTRATIVE",
      legalReference: null,
      effectiveFrom: null,
      plain: {
        baseDistanceMeters: 2e3,
        baseFarePaise: 4e3,
        perKmPaise: 1e3
      },
      waiting: {
        perMinutePaise: 100,
        freeMinutes: 5,
        minuteCounting: "floor"
      },
      maxWeightGrams: 1e4,
      weightSlabs: [
        {
          aboveGrams: 5e3,
          surchargePaise: 2e3
        }
      ],
      rounding: "nearest-rupee",
      assumptions: [
        {
          code: "parcel-commercial-pricing",
          confirmed: false
        }
      ]
    },
    {
      id: "tn-parcel-auto-draft",
      version: 1,
      jurisdiction: "IN-TN",
      service: "parcel",
      category: "parcel-auto",
      status: "ILLUSTRATIVE",
      legalReference: null,
      effectiveFrom: null,
      plain: {
        baseDistanceMeters: 2e3,
        baseFarePaise: 7e3,
        perKmPaise: 1500
      },
      waiting: {
        perMinutePaise: 100,
        freeMinutes: 5,
        minuteCounting: "floor"
      },
      maxWeightGrams: 5e4,
      weightSlabs: [
        {
          aboveGrams: 1e4,
          surchargePaise: 3e3
        },
        {
          aboveGrams: 25e3,
          surchargePaise: 6e3
        }
      ],
      rounding: "nearest-rupee",
      assumptions: [
        {
          code: "parcel-commercial-pricing",
          confirmed: false
        }
      ]
    }
  ];

  // packages/tariff/src/registry.ts
  var STATUSES = /* @__PURE__ */ new Set(["OFFICIAL", "PENDING_APPROVAL", "ILLUSTRATIVE"]);
  var SERVICES = /* @__PURE__ */ new Set(["auto", "bike", "cab", "parcel"]);
  var ROUNDINGS = /* @__PURE__ */ new Set(["nearest-rupee", "ceil-rupee", "none"]);
  var isPaise = (v) => Number.isInteger(v) && v >= 0;
  function validateRule(rule) {
    const errors = [];
    const check = (ok, msg) => ok || errors.push(`${rule.id ?? "?"}: ${msg}`);
    check(typeof rule.id === "string" && rule.id.length > 0, "id required");
    check(Number.isInteger(rule.version) && rule.version > 0, "version must be a positive integer");
    check(SERVICES.has(rule.service), `unknown service ${rule.service}`);
    check(STATUSES.has(rule.status), `unknown status ${rule.status}`);
    check(ROUNDINGS.has(rule.rounding), `unknown rounding ${rule.rounding}`);
    check(rule.status !== "OFFICIAL" || !!rule.legalReference, "OFFICIAL rule needs legalReference");
    check(rule.status !== "OFFICIAL" || !!rule.effectiveFrom, "OFFICIAL rule needs effectiveFrom");
    for (const [name, band] of [["plain", rule.plain], ["ghat", rule.ghat]]) {
      if (!band) continue;
      check(isPaise(band.baseFarePaise) && isPaise(band.perKmPaise) && isPaise(band.baseDistanceMeters), `${name} band must be non-negative integers`);
    }
    check(!!rule.plain, "plain band required");
    check(isPaise(rule.waiting?.perMinutePaise) && (rule.waiting?.freeMinutes ?? -1) >= 0, "waiting invalid");
    if (rule.night) check(rule.night.multiplierPermille >= 1e3, "night multiplier must be >= 1000");
    check(rule.service !== "parcel" || rule.maxWeightGrams !== void 0, "parcel rule needs maxWeightGrams");
    return errors;
  }
  var TARIFF_RULES = Object.freeze(tamil_nadu_default);
  {
    const problems = TARIFF_RULES.flatMap(validateRule);
    if (problems.length) throw new Error(`Invalid tariff data:
${problems.join("\n")}`);
  }
  function getActiveRule(category, at = /* @__PURE__ */ new Date(), rules = TARIFF_RULES) {
    const day = new Date(at.getTime() + 330 * 6e4).toISOString().slice(0, 10);
    const candidates = rules.filter((r) => r.category === category);
    const dated = candidates.filter((r) => r.effectiveFrom && r.effectiveFrom <= day && (!r.effectiveTo || day < r.effectiveTo)).sort((a, b) => b.version - a.version);
    const rule = dated[0] ?? candidates.filter((r) => !r.effectiveFrom).sort((a, b) => b.version - a.version)[0];
    if (!rule) throw new RangeError(`No tariff for category ${category} on ${day}`);
    return rule;
  }

  // packages/meter/src/index.ts
  var AUTO_METER_CONFIG = Object.freeze({
    maxAccuracyMeters: 25,
    maxSpeedKmh: 80,
    waitingSpeedKmh: 5,
    waitingAfterSeconds: 60,
    minMoveMeters: 8,
    smoothingMps: 3,
    maxGapSeconds: 30
  });
  var EARTH_RADIUS_M = 63710088e-1;
  var M_PER_DEG_LAT = Math.PI / 180 * EARTH_RADIUS_M;
  var rad = (deg) => deg * Math.PI / 180;
  function haversineMeters(a, b) {
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function createMeter(config = AUTO_METER_CONFIG) {
    const maxSpeed = config.maxSpeedKmh / 3.6;
    const waitSpeed = config.waitingSpeedKmh / 3.6;
    const flags = /* @__PURE__ */ new Set();
    let origin = null;
    let smooth = null;
    let variance = 0;
    let anchor = null;
    let last = null;
    let startedAt = null;
    let distance = 0;
    let waiting = 0;
    let slowRun = 0;
    let accepted = 0;
    let rejected = 0;
    const reject = (flag) => {
      rejected++;
      if (flag) flags.add(flag);
      return false;
    };
    function addFix(fix) {
      if (fix.isMock) return reject("mock-location");
      if (!(fix.accuracyMeters <= config.maxAccuracyMeters)) return reject("low-accuracy");
      if (!last || !origin || !smooth || !anchor) {
        origin = { lat: fix.lat, lon: fix.lon, mPerDegLon: M_PER_DEG_LAT * Math.cos(rad(fix.lat)) };
        smooth = anchor = { x: 0, y: 0, timestamp: fix.timestamp };
        variance = fix.accuracyMeters ** 2;
        last = fix;
        startedAt = fix.timestamp;
        accepted++;
        return true;
      }
      const dt = (fix.timestamp - last.timestamp) / 1e3;
      if (dt <= 0) return reject("clock-skew");
      const measured = { x: (fix.lon - origin.lon) * origin.mPerDegLon, y: (fix.lat - origin.lat) * M_PER_DEG_LAT };
      if (haversineMeters(last, fix) - (last.accuracyMeters + fix.accuracyMeters) > maxSpeed * dt) return reject("speed-jump");
      const predicted = variance + dt * config.smoothingMps ** 2;
      const gain = predicted / (predicted + fix.accuracyMeters ** 2);
      smooth = {
        x: smooth.x + gain * (measured.x - smooth.x),
        y: smooth.y + gain * (measured.y - smooth.y),
        timestamp: fix.timestamp
      };
      variance = (1 - gain) * predicted;
      let slow = true;
      const fromAnchor = Math.hypot(smooth.x - anchor.x, smooth.y - anchor.y);
      if (fromAnchor >= config.minMoveMeters) {
        const segmentSpeed = fromAnchor / ((smooth.timestamp - anchor.timestamp) / 1e3);
        distance += fromAnchor;
        slow = segmentSpeed < waitSpeed;
        anchor = smooth;
      }
      if (dt > config.maxGapSeconds) flags.add("gps-gap");
      if (slow) {
        const before = slowRun;
        slowRun += dt;
        if (slowRun >= config.waitingAfterSeconds) waiting += before < config.waitingAfterSeconds ? slowRun : dt;
      } else {
        slowRun = 0;
      }
      last = fix;
      accepted++;
      return true;
    }
    function snapshot() {
      return {
        startedAt,
        elapsedSeconds: startedAt !== null && last ? (last.timestamp - startedAt) / 1e3 : 0,
        distanceMeters: Math.round(distance),
        waitingSeconds: Math.round(waiting),
        acceptedFixes: accepted,
        rejectedFixes: rejected,
        flags: [...flags].sort()
      };
    }
    return { addFix, snapshot };
  }
  function meterFare(rule, reading, terrain = "plain") {
    if (reading.startedAt === null) throw new RangeError("Meter has not received a usable GPS fix");
    return calculateFare(rule, {
      distanceMeters: reading.distanceMeters,
      waitingSeconds: reading.waitingSeconds,
      rideSeconds: reading.elapsedSeconds,
      startedAt: reading.startedAt,
      terrain
    });
  }

  // web/src/places.ts
  var PLACES = [
    { en: "Chennai Central", ta: "சென்னை சென்ட்ரல்", lat: 13.0837, lon: 80.2707 },
    { en: "Marina Beach", ta: "மெரினா கடற்கரை", lat: 13.05, lon: 80.2824 },
    { en: "T. Nagar", ta: "தி. நகர்", lat: 13.0418, lon: 80.2341 },
    { en: "Anna Nagar", ta: "அண்ணா நகர்", lat: 13.085, lon: 80.2101 },
    { en: "Guindy Metro", ta: "கிண்டி மெட்ரோ", lat: 13.0098, lon: 80.2121 },
    { en: "Adyar", ta: "அடையாறு", lat: 13.0012, lon: 80.2565 },
    { en: "Chennai Airport", ta: "சென்னை விமான நிலையம்", lat: 12.9941, lon: 80.1709 }
  ];
  var placeName = (index, locale2) => index === null ? "—" : PLACES[index]?.[locale2] ?? "—";
  function estimateRouteMeters(from, to) {
    const a = PLACES[from];
    const b = PLACES[to];
    const km2 = Math.hypot((a.lat - b.lat) * 111.195, (a.lon - b.lon) * 108.3);
    return Math.round(km2 * 1.25 * 1e3);
  }
  var SIMULATION_ROUTE = [
    [13.0827, 80.2752],
    [13.0806, 80.2685],
    [13.0789, 80.2612],
    [13.0763, 80.2548],
    [13.0732, 80.2489],
    [13.0688, 80.2441],
    [13.0636, 80.2405],
    [13.0589, 80.2378],
    [13.0544, 80.2341]
  ];

  // web/src/meter-session.ts
  var SIM_PROFILE = [
    [150, 28],
    [75, 0],
    [180, 32],
    [140, 0],
    [240, 26]
  ];
  var SIM_SPEEDUP = 10;
  function simulatedFixes(startAt) {
    const segments = SIMULATION_ROUTE.slice(1).map((to, i) => {
      const from = SIMULATION_ROUTE[i];
      const north = (to[0] - from[0]) * 111195;
      const east = (to[1] - from[1]) * 111195 * Math.cos(from[0] * Math.PI / 180);
      return { from, to, meters: Math.hypot(north, east) };
    });
    const total = segments.reduce((n, s) => n + s.meters, 0);
    const at = (d) => {
      let left = Math.min(d, total);
      for (const s of segments) {
        if (left <= s.meters) {
          const f = left / s.meters;
          return [s.from[0] + (s.to[0] - s.from[0]) * f, s.from[1] + (s.to[1] - s.from[1]) * f];
        }
        left -= s.meters;
      }
      return SIMULATION_ROUTE.at(-1);
    };
    let seed = 42;
    const noise = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296 - 0.5) * 8 / 111195;
    const fixes = [];
    let travelled = 0;
    let t2 = 0;
    for (const [seconds, kmh] of SIM_PROFILE) {
      for (let i = 0; i < seconds; i++, t2++) {
        const [lat, lon] = at(travelled);
        fixes.push({ lat: lat + noise(), lon: lon + noise(), accuracyMeters: 6, timestamp: startAt + t2 * 1e3 });
        travelled += kmh / 3.6;
      }
    }
    return fixes;
  }
  function startMeter(options) {
    const meter2 = createMeter();
    const startedAt = Date.now();
    const rule = getActiveRule("auto", new Date(startedAt));
    let stopped = false;
    let cleanup = () => {
    };
    const read = () => {
      const snapshot = meter2.snapshot();
      return { snapshot, fare: snapshot.startedAt === null ? null : meterFare(rule, snapshot, options.terrain) };
    };
    const feed = (fix) => {
      if (stopped) return;
      meter2.addFix(fix);
      options.onUpdate(read());
    };
    if (options.source === "simulation") {
      const fixes = simulatedFixes(startedAt);
      let i = 0;
      const timer = setInterval(() => {
        const fix = fixes[i++];
        if (fix) feed(fix);
        else clearInterval(timer);
      }, 1e3 / SIM_SPEEDUP);
      cleanup = () => clearInterval(timer);
    } else {
      const geo = globalThis.navigator?.geolocation;
      if (!geo) {
        setTimeout(() => options.onError("unsupported"));
      } else {
        const id = geo.watchPosition(
          (p) => feed({ lat: p.coords.latitude, lon: p.coords.longitude, accuracyMeters: p.coords.accuracy, timestamp: p.timestamp }),
          (e) => options.onError(e.code === 1 ? "denied" : e.code === 3 ? "timeout" : "unavailable"),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 3e4 }
        );
        let lock = null;
        navigator.wakeLock?.request("screen").then((l) => lock = l).catch(() => {
        });
        cleanup = () => {
          geo.clearWatch(id);
          lock?.release().catch(() => {
          });
        };
      }
    }
    return {
      source: options.source,
      terrain: options.terrain,
      vehicleNumber: options.vehicleNumber,
      read,
      stop() {
        stopped = true;
        cleanup();
        return { ...read(), endedAt: Date.now() };
      }
    };
  }

  // web/src/store.ts
  var STORAGE_KEY = "thozhan-v2";
  var DAILY_FEE_PAISE = 1e3;
  var DEMO_FLAGS = Object.freeze({
    auto: true,
    bike: false,
    "cab-mini": true,
    "cab-sedan": true,
    "cab-suv": true,
    "parcel-bike": true,
    "parcel-auto": true
  });
  var emptyState = () => ({ version: 2, trips: [], online: true, charges: [], cases: [], flags: { ...DEMO_FLAGS } });
  function parseState(raw) {
    try {
      const s = JSON.parse(raw ?? "");
      if (s && s.version === 2 && Array.isArray(s.trips) && Array.isArray(s.charges) && Array.isArray(s.cases)) {
        s.flags = { ...DEMO_FLAGS, ...s.flags };
        return s;
      }
    } catch {
    }
    return emptyState();
  }
  var istDay = (at) => new Date(at + 330 * 6e4).toISOString().slice(0, 10);
  var activeTrip = (state2) => state2.trips.find((t2) => t2.flow !== "meter" && !isTerminal(t2.flow, t2.status));
  var otp = (rand) => String(Math.floor(1e3 + rand() * 9e3));
  var CITY_SPEED_MPS = 20 / 3.6;
  function quote(category, distanceMeters, at, opts = {}) {
    return calculateFare(getActiveRule(category, new Date(at)), {
      distanceMeters,
      rideSeconds: distanceMeters / CITY_SPEED_MPS,
      startedAt: at,
      terrain: opts.terrain,
      weightGrams: opts.weightGrams
    });
  }
  function createBooking(state2, input, now, rand = Math.random) {
    const category = getCategory(input.category);
    if (!(state2.flags[category.id] ?? category.enabledByDefault)) return { ok: false, error: "disabled" };
    if (input.pickup === input.drop) return { ok: false, error: "same-place" };
    if (activeTrip(state2)) return { ok: false, error: "active-trip" };
    if (input.departure && !(Date.parse(input.departure) > now)) return { ok: false, error: "past-departure" };
    const flow = category.flows.includes("delivery") ? "delivery" : "ride";
    if (flow === "delivery" && !(input.parcel && input.parcel.weightGrams > 0 && input.parcel.weightGrams <= (category.parcel?.maxWeightGrams ?? 0))) {
      return { ok: false, error: "weight" };
    }
    const distanceMeters = estimateRouteMeters(input.pickup, input.drop);
    const startOtp = otp(rand);
    let dropOtp = null;
    if (flow === "delivery") {
      dropOtp = otp(rand);
      if (dropOtp === startOtp) dropOtp = String((Number(dropOtp) - 1e3 + 1) % 9e3 + 1e3);
    }
    const trip = {
      id: "TZ-" + String(now).slice(-7),
      created: now,
      flow,
      category: category.id,
      pickup: input.pickup,
      drop: input.drop,
      distanceMeters,
      fare: quote(category.id, distanceMeters, input.departure ? Date.parse(input.departure) : now, { weightGrams: input.parcel?.weightGrams }),
      status: "REQUESTED",
      startOtp,
      dropOtp,
      payment: input.payment,
      departure: input.departure || null,
      parcel: flow === "delivery" ? input.parcel : null,
      vehicleNumber: null,
      meterFlags: [],
      completed: null
    };
    state2.trips.unshift(trip);
    return { ok: true, trip };
  }
  function driverAction(state2, action, code, now) {
    const trip = activeTrip(state2);
    if (!trip) return { ok: false, error: "no-trip" };
    if (action === "accept" && !state2.online) return { ok: false, error: "offline" };
    const satisfied = [
      ...code !== null && code === trip.startOtp ? ["start-otp"] : [],
      ...code !== null && code === trip.dropOtp ? ["drop-otp"] : []
    ];
    const result = transition(trip.flow, trip.status, action, { actor: "driver", satisfied, disabledGuards: ["proof-of-delivery"] });
    if (!result.ok) return { ok: false, error: result.reason === "guard" ? "otp" : "not-allowed" };
    trip.status = result.status;
    if (result.status === "COMPLETED" || result.status === "DELIVERED") {
      trip.completed = now;
      chargeDay(state2, now);
    }
    return { ok: true, trip };
  }
  function cancelActive(state2) {
    const trip = activeTrip(state2);
    if (!trip) return false;
    const result = transition(trip.flow, trip.status, "cancel", { actor: "rider" });
    if (!result.ok) return false;
    trip.status = result.status;
    return true;
  }
  function chargeDay(state2, now) {
    const day = istDay(now);
    if (!state2.charges.includes(day)) state2.charges.push(day);
  }
  function recordMeterTrip(state2, input) {
    const trip = {
      id: "TM-" + String(input.endedAt).slice(-7),
      created: input.startedAt,
      flow: "meter",
      category: "auto",
      pickup: null,
      drop: null,
      distanceMeters: input.distanceMeters,
      fare: input.fare,
      status: "COMPLETED",
      startOtp: "",
      dropOtp: null,
      payment: "cash",
      departure: null,
      parcel: null,
      vehicleNumber: input.vehicleNumber,
      meterFlags: input.flags,
      completed: input.endedAt
    };
    state2.trips.unshift(trip);
    return trip;
  }
  function addCase(state2, input) {
    const c = { id: "CASE-" + (state2.cases.length + 1), ...input };
    state2.cases.push(c);
    return c;
  }
  function summarize(state2) {
    const done = state2.trips.filter((t2) => t2.status === "COMPLETED" || t2.status === "DELIVERED");
    const reports = state2.cases.filter((c) => c.kind === "overcharge" && c.askedPaise !== null && c.meterPaise);
    return {
      requests: state2.trips.filter((t2) => t2.flow !== "meter").length,
      active: activeTrip(state2) ? 1 : 0,
      completed: done.length,
      grossPaise: done.filter((t2) => t2.flow !== "meter").reduce((n, t2) => n + t2.fare.totalPaise, 0),
      feesPaise: state2.charges.length * DAILY_FEE_PAISE,
      meterTrips: state2.trips.filter((t2) => t2.flow === "meter").length,
      overchargeReports: reports.length,
      averageOverchargePercent: reports.length ? Math.round(reports.reduce((n, c) => n + (c.askedPaise - c.meterPaise) / c.meterPaise * 100, 0) / reports.length) : null
    };
  }

  // web/src/main.ts
  var LOCALE_KEY = "thozhan-locale";
  var $ = (s) => document.querySelector(s);
  var storage = globalThis.localStorage;
  var locale = storage?.getItem(LOCALE_KEY) ?? pickLocale(globalThis.navigator?.languages ?? []);
  if (locale !== "ta" && locale !== "en") locale = "ta";
  var state = parseState(storage?.getItem(STORAGE_KEY) ?? null);
  var page = "ride";
  var pickup = 0;
  var drop = 1;
  var rideCategory = "auto";
  var parcelCategory = "parcel-bike";
  var payment = "cash";
  var schedule = "now";
  var meterSource = "gps";
  var meterTerrain = "plain";
  var meterVoice = false;
  var meter = null;
  var lastAnnouncedKm = 0;
  var lastMeterTripId = null;
  var verifyInput = { category: "auto", km: "5", waiting: "0", ride: "15", start: "", terrain: "plain", weight: "2" };
  var L = (key, params) => t(locale, key, params);
  var money = (paise) => formatMoney(paise, locale);
  var km = (meters) => formatKm(meters, locale);
  var escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var persist = () => storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  var categoryName = (id) => L(getCategory(id).nameKey);
  var flagOn = (c) => state.flags[c.id] ?? c.enabledByDefault;
  function toast(message) {
    $("#toast").textContent = message;
    $("#toast").style.display = "block";
    setTimeout(() => $("#toast").style.display = "none", 3e3);
  }
  function modal(title, body) {
    $("#dialog-body").innerHTML = "<h2>" + title + "</h2>" + body;
    $("#dialog").showModal();
  }
  function setLocale(next) {
    locale = next;
    storage?.setItem(LOCALE_KEY, next);
    render();
  }
  function go(p) {
    page = p;
    render();
  }
  function chrome() {
    if (document.documentElement) document.documentElement.lang = locale;
    const set = (id, html) => {
      const el = $("#" + id);
      if (el) el.innerHTML = html;
    };
    set("brand-small", escapeHtml(L("ui.brandSmall")));
    set("workspace-label", escapeHtml(L("ui.workspace")));
    set("aside-title", escapeHtml(L("ui.asideTitle")));
    set("aside-body", escapeHtml(L("ui.asideBody")));
    set("pilot-dot", escapeHtml(L("ui.pilot")));
    set("profile-note", escapeHtml(L("ui.demoAccount")));
    set("location-name", escapeHtml(L("ui.location")));
    set("demo-pill", escapeHtml(L("ui.demoPill")));
    set("footer-main", escapeHtml(L("ui.footer")));
    set("footer-note", escapeHtml(L("ui.footerNote")));
    set("close-dialog", escapeHtml(L("ui.gotIt")));
    set("lang", escapeHtml(L("ui.otherLanguage")));
  }
  function nav() {
    const items = [
      ["ride", "↗"],
      ["meter", "⏱"],
      ["parcel", "▣"],
      ["trips", "◷"],
      ["driver", "♧"],
      ["ops", "▦"],
      ["verify", "✓"]
    ];
    $("#nav").innerHTML = items.map(([p, i]) => `<button class="${page === p ? "active" : ""}" data-page="${p}"><span>${i}</span>${L("ui.nav." + p)}</button>`).join("");
    document.querySelectorAll("[data-page]").forEach((b) => b.onclick = () => go(b.dataset.page));
  }
  function heading(title, sub, extra = "") {
    return `<div class="page-heading"><div><h1>${title}</h1><p class="sub">${sub}</p></div>${extra || `<span class="date">${L("ui.edition")}</span>`}</div>`;
  }
  function statusBadge(fare) {
    const cls = fare.status === "OFFICIAL" ? "tag" : "tag tag-warn";
    return `<span class="${cls}">${L("tariff.status." + fare.status)}</span>`;
  }
  function fareLines(fare) {
    return fare.lines.map((l) => {
      const label = L("fare.line." + l.code, {
        km: formatKm(l.detail?.meters ?? 0, locale, 2),
        minutes: l.detail?.minutes ?? 0
      });
      return `<div class="fare"><span>${label}</span><strong>${money(l.amountPaise)}</strong></div>`;
    }).join("");
  }
  function receipt(fare, extra = "") {
    return `<div class="receipt">${statusBadge(fare)}${fare.night ? ` <span class="tag">${L("ui.meter.night")}</span>` : ""}${fare.terrain === "ghat" ? ` <span class="tag">${L("fare.ghat")}</span>` : ""}
    ${extra}${fareLines(fare)}
    <div class="fare total"><span>${L("fare.total")}</span><strong>${money(fare.totalPaise)}</strong></div>
    ${fare.legalReference ? `<p class="small-note">${escapeHtml(L("tariff.source", { reference: fare.legalReference }))}</p>` : ""}
    ${fare.assumptions.length ? `<ul class="assumptions">${fare.assumptions.map((a) => `<li>${L("tariff.assumption." + a)}</li>`).join("")}</ul>` : ""}
    ${fare.verifiedForBilling ? "" : `<p class="small-note warn">${L("fare.notBillable")}</p>`}</div>`;
  }
  function placeOptions(selected) {
    return PLACES.map((_, i) => `<option value="${i}" ${i === selected ? "selected" : ""}>${escapeHtml(placeName(i, locale))}</option>`).join("");
  }
  function map() {
    return `<div class="card map-panel"><svg viewBox="0 0 650 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${L("ui.map.legend")}"><defs><pattern id="blocks" width="85" height="72" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><rect width="85" height="72" fill="#edf0e7"/><rect x="7" y="8" width="65" height="53" rx="6" fill="#e4e9dc"/><path d="M0 0H85M0 0V72" stroke="#fff" stroke-width="7"/></pattern></defs><rect width="650" height="600" fill="url(#blocks)"/><path d="M550 0Q510 120 563 205T550 430L580 600H650V0" fill="#d6e8e9"/><path d="M0 260Q150 280 260 230T550 260" fill="none" stroke="#d6e8e9" stroke-width="22"/><g fill="#d6e1c5"><path d="M45 360l85-15 23 80-85 35z"/><path d="M300 70l83-10 30 70-100 15z"/><path d="M330 440l80-20 30 90-100 20z"/></g><g stroke="#fff" fill="none"><path d="M70 0L240 600M420 0L350 600M0 140L550 160M0 480L565 390" stroke-width="15"/><path d="M70 0L240 600M420 0L350 600M0 140L550 160M0 480L565 390" stroke="#e6dfc6" stroke-width="2"/><path d="M230 0L265 170L320 280L445 390L475 600" stroke-width="18"/></g><path d="M360 150L339 220L350 274L445 310L466 367" fill="none" stroke="#fff" stroke-width="11" stroke-linejoin="round"/><path d="M360 150L339 220L350 274L445 310L466 367" fill="none" stroke="#43694b" stroke-width="5" stroke-linejoin="round"/><circle cx="360" cy="150" r="11" fill="#476f48" stroke="white" stroke-width="4"/><circle cx="466" cy="367" r="11" fill="#233c2d" stroke="white" stroke-width="4"/><g fill="white"><rect x="275" y="110" width="165" height="26" rx="5"/><rect x="405" y="388" width="140" height="26" rx="5"/></g><g font-family="Arial, 'Noto Sans Tamil'" font-size="10" fill="#344d39"><text x="290" y="127">${escapeHtml(placeName(pickup, locale))}</text><text x="415" y="405">${escapeHtml(placeName(drop, locale))}</text></g><g font-size="25"><text x="270" y="340">🛺</text><text x="440" y="190">🛺</text><text x="190" y="210">🛺</text></g></svg><span class="map-label"><i></i> ${L("ui.map.area")}</span><div class="map-info"><span class="symbol">⏱</span><div><strong>${L("ui.map.title")}</strong><small><button class="text-button" id="to-meter">${L("ui.map.sub")}</button></small></div></div><span class="map-legend">${L("ui.map.legend")}</span></div>`;
  }
  function benefits() {
    return `<div class="benefits">${[1, 2, 3].map((n) => `<div class="card benefit"><span class="symbol">${["◇", "♡", "◎"][n - 1]}</span><div><h3>${L(`ui.benefit${n}.title`)}</h3><p>${L(`ui.benefit${n}.body`)}</p></div></div>`).join("")}</div><div class="green-banner"><div><h3>${L("ui.banner.title")}</h3><p>${L("ui.banner.body")}</p></div><button class="text-button" id="about">${L("ui.banner.cta")} ↗</button></div>`;
  }
  function categoryButton(c, selected, distanceMeters, extra = {}) {
    const on2 = flagOn(c);
    let price = "";
    if (on2) {
      try {
        price = money(quote(c.id, distanceMeters, Date.now(), extra).totalPaise);
      } catch {
        price = "—";
      }
    }
    const rule = getActiveRule(c.id);
    return `<button class="vehicle ${selected === c.id ? "selected" : ""}" data-category="${c.id}" ${on2 ? "" : "disabled"}>
    <span class="vehicle-icon">${c.icon}</span>
    <span class="vehicle-info"><strong>${L(c.nameKey)}</strong> <span class="${rule.status === "OFFICIAL" ? "tag" : "tag tag-warn"}">${L("tariff.status." + rule.status)}</span>
    <small>${on2 ? c.seats ? L("ui.seats", { n: c.seats }) : L("ui.parcel.max", { kg: (c.parcel?.maxWeightGrams ?? 0) / 1e3 }) : L("ui.legal." + c.legalStatus)}</small></span>
    <span class="vehicle-price">${price}<small>${on2 ? L("ui.estimated") : ""}</small></span></button>`;
  }
  function tripCard(trip) {
    const hintKey = trip.status === "REQUESTED" ? "ui.hint.requested" : trip.status === "ACCEPTED" ? "ui.hint.accepted" : trip.status === "ARRIVED" || trip.status === "AT_PICKUP" ? "ui.hint.arrived" : trip.status === "IN_PROGRESS" ? "ui.hint.inProgress" : "ui.hint.inTransit";
    return `<section class="card trip-box"><span class="badge">${L("trip.status." + trip.status)}</span>
    <h2 style="margin-top:17px">${categoryName(trip.category)}</h2>
    <p>${escapeHtml(placeName(trip.pickup, locale))} → ${escapeHtml(placeName(trip.drop, locale))}</p>
    ${trip.departure ? `<p>${L("ui.trip.scheduled", { time: escapeHtml(new Date(trip.departure).toLocaleString(locale === "ta" ? "ta-IN" : "en-IN")) })}</p>` : ""}
    ${trip.parcel ? `<p>${L("parcel.receiver")}: ${escapeHtml(trip.parcel.receiver)} · ${L("parcel.weight")}: ${trip.parcel.weightGrams / 1e3} kg</p>` : ""}
    <div class="driver-card"><span class="avatar">RK</span><div><strong>${trip.status === "REQUESTED" ? L("ui.trip.awaitingDriver") : "Ravi Kumar"}</strong><small>TN 01 DEMO · ★ 4.9</small></div></div>
    <div class="trip-status">${L(hintKey)}</div>
    <p>${L("ui.trip.startOtp")}</p><div class="otp">${trip.startOtp}</div>
    ${trip.dropOtp ? `<p>${L("ui.trip.dropOtp")}</p><div class="otp">${trip.dropOtp}</div>` : ""}
    <div class="fare"><span>${L("ui.trip.estimatedFare")}</span><strong>${money(trip.fare.totalPaise)}</strong></div>
    <div class="fare"><span>${L("ui.trip.payment")}</span><span>${L("ui.trip.demoPayment", { method: L("ui.pay." + trip.payment) })}</span></div>
    <div class="actions"><button class="secondary" id="share-trip">${L("safety.shareTrip")}</button><button class="secondary danger" id="safety">${L("ui.trip.safety")}</button></div>
    ${availableActions(trip.flow, trip.status, "rider").includes("cancel") ? `<button class="text-button danger" id="cancel" style="margin-top:20px">${L("trip.action.cancel")}</button>` : ""}</section>`;
  }
  function ridePage() {
    const trip = activeTrip(state);
    const distanceMeters = estimateRouteMeters(pickup, drop);
    const rideCats = CATEGORIES.filter((c) => c.flows.includes("ride"));
    const selected = getCategory(rideCategory);
    const bookable = flagOn(selected);
    return heading(L("ui.ride.title"), L("ui.ride.sub")) + `<div class="booking-layout">${trip ? tripCard(trip) : `<section class="card booking"><div class="tabs"><button class="${schedule === "now" ? "selected" : ""}" id="now">↗ ${L("ui.ride.now")}</button><button class="${schedule === "later" ? "selected" : ""}" id="later">◷ ${L("ui.ride.later")}</button></div>
        <label class="field">${L("ui.field.pickup")}<div><span class="pickup-symbol">●</span><select id="pickup">${placeOptions(pickup)}</select></div></label>
        <label class="field">${L("ui.field.drop")}<div><span class="drop-symbol">■</span><select id="drop">${placeOptions(drop)}</select></div></label>
        ${schedule === "later" ? `<label class="field">${L("ui.field.departure")}<div><input id="departure" type="datetime-local" required></div></label>` : ""}
        <div class="route-summary"><span>↳ ${L("ui.route.approx", { km: km(distanceMeters) })}</span><span>${L("ui.route.note")}</span></div>
        <div class="section-label">${L("ui.choose")}</div>
        ${rideCats.map((c) => categoryButton(c, rideCategory, distanceMeters)).join("")}
        <div class="payment-row"><label for="payment">▣ ${L("ui.payment")}</label><select id="payment"><option value="cash" ${payment === "cash" ? "selected" : ""}>${L("ui.pay.cash")}</option><option value="upi" ${payment === "upi" ? "selected" : ""}>${L("ui.pay.upi")}</option></select></div>
        <button class="primary" id="book" ${bookable ? "" : "disabled"}>${L(schedule === "later" ? "ui.schedule" : "ui.book", { name: L(selected.nameKey) })} <span style="float:right">${bookable ? money(quote(rideCategory, distanceMeters, Date.now()).totalPaise) : ""} →</span></button>
        <p class="small-note">${L("ui.demoOnly")} · <button class="text-button" id="breakdown">${L("ui.fareDetails")}</button></p></section>`}${map()}</div>` + benefits();
  }
  function parcelPage() {
    const trip = activeTrip(state);
    const distanceMeters = estimateRouteMeters(pickup, drop);
    const cats = CATEGORIES.filter((c) => c.flows.includes("delivery"));
    const selected = getCategory(parcelCategory);
    const weightGrams = Math.round(Number($("#weight")?.value || 2) * 1e3);
    const restricted = selected.parcel?.restrictedItemKeys ?? [];
    return heading(L("ui.parcel.title"), L("ui.parcel.sub")) + `<div class="booking-layout">${trip ? tripCard(trip) : `<section class="card booking">
        <label class="field">${L("parcel.sender")} · ${L("ui.field.pickup")}<div><span class="pickup-symbol">●</span><select id="pickup">${placeOptions(pickup)}</select></div></label>
        <label class="field">${L("parcel.receiver")} · ${L("ui.field.drop")}<div><span class="drop-symbol">■</span><select id="drop">${placeOptions(drop)}</select></div></label>
        <label class="field">${L("ui.parcel.receiverName")}<div><input id="receiver" maxlength="40" autocomplete="off"></div></label>
        <label class="field">${L("ui.parcel.weightKg")}<div><input id="weight" type="number" min="0.1" step="0.1" max="${(selected.parcel?.maxWeightGrams ?? 0) / 1e3}" value="${weightGrams / 1e3}"></div></label>
        <div class="section-label">${L("ui.parcel.vehicle")}</div>
        ${cats.map((c) => categoryButton(c, parcelCategory, distanceMeters, { weightGrams: Math.min(weightGrams, c.parcel?.maxWeightGrams ?? 0) })).join("")}
        <p class="small-note">${L("ui.parcel.restricted")} ${restricted.map((k) => L(k)).join(", ")}</p>
        <button class="primary" id="book-parcel" ${flagOn(selected) ? "" : "disabled"}>${L("ui.parcel.book", { name: L(selected.nameKey) })} →</button>
        <p class="small-note">${L("ui.demoOnly")}</p></section>`}${map()}</div>`;
  }
  function meterLive(reading) {
    const s = reading.snapshot;
    const mm = String(Math.floor(s.elapsedSeconds / 60)).padStart(2, "0");
    const ss = String(Math.floor(s.elapsedSeconds % 60)).padStart(2, "0");
    return `<div class="meter-fare" id="meter-fare">${reading.fare ? money(reading.fare.totalPaise) : "—"}</div>
    <p class="meter-caption">${reading.fare ? L("meter.liveFare") : L("ui.meter.waitingGps")}</p>
    <div class="meter-stats">
      <div><small>${L("meter.distance")}</small><strong>${km(s.distanceMeters)} ${L("ui.unit.km")}</strong></div>
      <div><small>${L("meter.waiting")}</small><strong>${Math.floor(s.waitingSeconds / 60)} ${L("ui.unit.min")}</strong></div>
      <div><small>${L("meter.elapsed")}</small><strong>${mm}:${ss}</strong></div>
    </div>
    ${reading.fare?.night ? `<p><span class="tag">${L("ui.meter.night")}</span></p>` : ""}
    ${s.flags.length ? `<ul class="assumptions">${s.flags.map((f) => `<li>${L("meter.flag." + f)}</li>`).join("")}</ul>` : ""}`;
  }
  function meterPage() {
    const rule = getActiveRule("auto");
    const body = meter ? `<section class="card booking meter-card"><span class="badge">${L("trip.status.METER_RUNNING")}</span>
        <div id="meter-live">${meterLive(meter.read())}</div>
        <p class="small-note">${L("ui.meter.keepOpen")}</p>
        <button class="primary danger-bg" id="meter-stop">${L("meter.stop")}</button>
        <div class="actions"><button class="secondary danger" id="safety">${L("safety.sos")}</button></div></section>` : `<section class="card booking"><p>${L("meter.hint")}</p>
        <label class="field">${L("meter.vehicleNumber")} (${L("ui.meter.optional")})<div><input id="vehicle-number" maxlength="13" placeholder="TN 01 AB 1234" autocomplete="off" style="text-transform:uppercase"></div></label>
        <div class="section-label">${L("ui.meter.terrain")}</div>
        <div class="tabs"><button class="${meterTerrain === "plain" ? "selected" : ""}" id="terrain-plain">${L("ui.meter.plain")}</button><button class="${meterTerrain === "ghat" ? "selected" : ""}" id="terrain-ghat">${L("ui.meter.ghat")}</button></div>
        <div class="section-label">${L("ui.meter.source")}</div>
        <div class="tabs"><button class="${meterSource === "gps" ? "selected" : ""}" id="source-gps">${L("ui.meter.gps")}</button><button class="${meterSource === "simulation" ? "selected" : ""}" id="source-sim">${L("ui.meter.sim")}</button></div>
        <label class="check"><input type="checkbox" id="meter-voice" ${meterVoice ? "checked" : ""}> ${L("ui.meter.voice")}</label>
        <button class="primary" id="meter-start">⏱ ${L("meter.start")}</button></section>`;
    const tariff = `<section class="card pad"><h2>${L("ui.verify.official")}</h2>${goTable()}<p class="small-note">${escapeHtml(L("tariff.source", { reference: rule.legalReference ?? "" }))}</p></section>`;
    return heading(L("meter.title"), L("ui.meter.sub")) + `<div class="booking-layout">${body}${tariff}</div>`;
  }
  function goTable() {
    return [
      ["ui.go.minDist", "ui.go.minDistVal"],
      ["ui.go.minFare", "ui.go.minFareVal"],
      ["ui.go.perKm", "ui.go.perKmVal"],
      ["ui.go.waiting", "ui.go.waitingVal"],
      ["ui.go.night", "ui.go.nightVal"],
      ["ui.go.ghat", "ui.go.ghatVal"]
    ].map(([k, v]) => `<div class="fare"><span>${L(k)}</span><strong>${L(v)}</strong></div>`).join("");
  }
  function tripsTable(trips) {
    if (!trips.length) return `<div class="empty">${L("ui.empty")}</div>`;
    const dateLocale = locale === "ta" ? "ta-IN" : "en-IN";
    return `<div class="table-wrap"><table><thead><tr><th>${L("ui.th.trip")}</th><th>${L("ui.th.journey")}</th><th>${L("ui.th.service")}</th><th>${L("ui.th.fare")}</th><th>${L("ui.th.status")}</th><th></th></tr></thead><tbody>${trips.map(
      (tr) => `<tr><td>${tr.id}<br><small>${new Date(tr.created).toLocaleDateString(dateLocale)}</small></td><td>${tr.flow === "meter" ? `${L("ui.trips.streetHail")}<br><small>${escapeHtml(tr.vehicleNumber ?? "—")}</small>` : `${escapeHtml(placeName(tr.pickup, locale))}<br><small>→ ${escapeHtml(placeName(tr.drop, locale))}</small>`}</td><td>${categoryName(tr.category)}</td><td>${money(tr.fare.totalPaise)}</td><td><span class="badge">${L("trip.status." + tr.status)}</span></td><td><button class="text-button" data-detail="${tr.id}">${L("ui.details")} ↗</button></td></tr>`
    ).join("")}</tbody></table></div>`;
  }
  function metrics() {
    const s = summarize(state);
    return `<div class="metrics">${[
      ["ui.m.completed", String(s.completed), "ui.m.completedNote"],
      ["ui.m.earnings", money(s.grossPaise), "ui.m.earningsNote"],
      ["ui.m.fees", money(s.feesPaise), "ui.m.feesNote"],
      ["ui.m.net", money(s.grossPaise - s.feesPaise), "ui.m.netNote"]
    ].map(([label, value, note]) => `<div class="card metric"><small>${L(label)}</small><strong>${value}</strong><p>${L(note)}</p></div>`).join("")}</div>`;
  }
  function nextDriverAction() {
    const trip = activeTrip(state);
    return trip ? availableActions(trip.flow, trip.status, "driver").find((a) => a !== "cancel" && a !== "return") : void 0;
  }
  function driverPage() {
    const trip = activeTrip(state);
    const action = nextDriverAction();
    const needsOtp = action === "start" || action === "pickup" ? "start" : action === "deliver" ? "drop" : null;
    return heading(L("ui.driver.title"), L("ui.driver.sub"), `<button class="online" id="online">● ${L(state.online ? "ui.online" : "ui.offline")}</button>`) + metrics() + `<div class="driver-grid"><div class="card"><div class="card-head"><h2>${L("ui.driver.workspace")}</h2><span class="badge">${L("ui.driver.demo")}</span></div><div class="pad">${trip && action ? `<h3>${escapeHtml(placeName(trip.pickup, locale))} → ${escapeHtml(placeName(trip.drop, locale))}</h3>
          <p class="sub" style="margin:15px 0">${categoryName(trip.category)} · ${km(trip.distanceMeters)} ${L("ui.unit.km")} · ${money(trip.fare.totalPaise)} · ${L("trip.status." + trip.status)}</p>
          ${needsOtp ? `<label class="field">${L(needsOtp === "start" ? "ui.driver.enterOtp" : "ui.driver.enterDropOtp")}<div><input id="otp-input" inputmode="numeric" maxlength="4" placeholder="${L("ui.driver.otpPlaceholder")}"></div></label>` : ""}
          <button class="primary" id="advance" ${!state.online && action === "accept" ? "disabled" : ""}>${L("trip.action." + action)}</button>
          <p class="small-note">${L("ui.driver.note")}</p>` : `<div class="empty">${L("ui.driver.ready")}</div>`}</div></div>
    <div class="card pad"><h2>${L("ui.driver.plan")}</h2><p class="sub" style="margin:15px 0">${L("ui.driver.planBody")}</p>
      <div class="fare"><span>${L("ui.driver.commission")}</span><strong>0%</strong></div>
      <div class="fare"><span>${L("ui.driver.dailyFee")}</span><strong>${money(1e3)}</strong></div>
      <div class="fare"><span>${L("ui.driver.chargedDays")}</span><strong>${state.charges.length}</strong></div>
      <p class="small-note">${L("ui.driver.ledgerNote")}</p></div></div>
    <div class="card" style="margin-top:22px"><div class="card-head"><h2>${L("ui.driver.history")}</h2></div>${tripsTable(state.trips.filter((tr) => tr.flow !== "meter"))}</div>`;
  }
  function opsPage() {
    const s = summarize(state);
    return heading(L("ui.ops.title"), L("ui.ops.sub")) + `<div class="metrics">${[
      ["ui.ops.requests", s.requests],
      ["ui.ops.active", s.active],
      ["ui.ops.completed", s.completed],
      ["ui.ops.cases", state.cases.length]
    ].map(([label, n]) => `<div class="card metric"><small>${L(label)}</small><strong>${n}</strong><p>${L("ui.ops.local")}</p></div>`).join("")}</div>
    <div class="driver-grid" style="margin-bottom:22px"><div class="card pad"><h2>${L("ui.ops.compliance")}</h2>
      <div class="fare"><span>${L("ui.ops.meterTrips")}</span><strong>${s.meterTrips}</strong></div>
      <div class="fare"><span>${L("ui.ops.overcharge")}</span><strong>${s.overchargeReports}</strong></div>
      <div class="fare"><span>${L("ui.ops.avgOver")}</span><strong>${s.averageOverchargePercent === null ? "—" : s.averageOverchargePercent + "%"}</strong></div>
      <p class="small-note">${L("ui.ops.complianceNote")}</p></div>
    <div class="card pad"><h2>${L("ui.ops.controls")}</h2><p class="sub" style="margin:10px 0">${L("ui.ops.controlsSub")}</p>
      ${CATEGORIES.map(
      (c) => `<div class="fare"><span>${c.icon} ${L(c.nameKey)}<br><small>${L("ui.legal." + c.legalStatus)} · ${L("tariff.status." + getActiveRule(c.id).status)}</small></span><button class="secondary" data-flag="${c.id}">${L(flagOn(c) ? "ui.on" : "ui.off")}</button></div>`
    ).join("")}</div></div>
    <div class="card"><div class="card-head"><div><h2>${L("ui.ops.activity")}</h2><p class="sub">${L("ui.ops.activitySub")}</p></div><button class="secondary" id="export">${L("ui.ops.export")} ↓</button></div>${tripsTable(state.trips)}</div>
    <div class="driver-grid" style="margin-top:22px"><div class="card pad"><h2>${L("ui.ops.casesTitle")}</h2>${state.cases.length ? state.cases.map(
      (c) => `<div class="fare"><span>${c.id} · ${c.trip}</span><span class="badge">${c.kind === "overcharge" ? L("ui.case.overcharge", { asked: money(c.askedPaise ?? 0), meter: money(c.meterPaise ?? 0) }) : L("ui.case.safety")}</span></div>`
    ).join("") : `<p class="sub" style="margin-top:15px">${L("ui.ops.noCases")}</p>`}</div>
    <div class="card pad"><h2>${L("ui.ops.demoData")}</h2><p class="sub" style="margin:15px 0">${L("ui.ops.demoDataSub")}</p><button class="secondary" id="reset">${L("ui.ops.reset")}</button></div></div>`;
  }
  function verifyResult() {
    try {
      const startedAt = verifyInput.start ? Date.parse(verifyInput.start + ":00+05:30") : Date.now();
      const rule = getActiveRule(verifyInput.category, new Date(startedAt));
      const fare = calculateFare(rule, {
        distanceMeters: Math.round(Number(verifyInput.km) * 1e3),
        waitingSeconds: Math.round(Number(verifyInput.waiting) * 60),
        rideSeconds: Math.round(Number(verifyInput.ride) * 60),
        startedAt,
        terrain: verifyInput.terrain,
        weightGrams: getCategory(verifyInput.category).service === "parcel" ? Math.round(Number(verifyInput.weight) * 1e3) : void 0
      });
      return receipt(fare, `<p class="small-note">${escapeHtml(rule.id)} · v${rule.version}</p>`);
    } catch (e) {
      return `<p class="warn">${escapeHtml(e.message)}</p>`;
    }
  }
  function verifyPage() {
    const v = verifyInput;
    const cat = getCategory(v.category);
    const ghatAllowed = !!getActiveRule(v.category).ghat;
    return heading(L("ui.verify.title"), L("ui.verify.sub")) + `<div class="booking-layout"><section class="card booking">
      <label class="field">${L("ui.verify.category")}<div><select id="v-category">${CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === v.category ? "selected" : ""}>${L(c.nameKey)}</option>`).join("")}</select></div></label>
      <label class="field">${L("ui.verify.distance")}<div><input id="v-km" type="number" min="0" step="0.1" value="${escapeHtml(v.km)}"></div></label>
      <label class="field">${L("ui.verify.waiting")}<div><input id="v-waiting" type="number" min="0" step="1" value="${escapeHtml(v.waiting)}"></div></label>
      ${TARIFF_RULES.some((r) => r.category === v.category && r.perRideMinutePaise) ? `<label class="field">${L("ui.verify.ride")}<div><input id="v-ride" type="number" min="0" step="1" value="${escapeHtml(v.ride)}"></div></label>` : ""}
      ${cat.service === "parcel" ? `<label class="field">${L("ui.parcel.weightKg")}<div><input id="v-weight" type="number" min="0" step="0.1" value="${escapeHtml(v.weight)}"></div></label>` : ""}
      <label class="field">${L("ui.verify.start")}<div><input id="v-start" type="datetime-local" value="${escapeHtml(v.start)}"></div></label>
      ${ghatAllowed ? `<div class="tabs"><button class="${v.terrain === "plain" ? "selected" : ""}" id="v-plain">${L("ui.meter.plain")}</button><button class="${v.terrain === "ghat" ? "selected" : ""}" id="v-ghat">${L("ui.meter.ghat")}</button></div>` : ""}
      <div id="v-result">${verifyResult()}</div></section>
      <section class="card pad"><h2>${L("ui.verify.official")}</h2>${goTable()}<p class="small-note">${L("ui.verify.note")}</p></section></div>`;
  }
  function render() {
    chrome();
    nav();
    const pages = {
      ride: ridePage,
      parcel: parcelPage,
      meter: meterPage,
      trips: () => heading(L("ui.trips.title"), L("ui.trips.sub")) + `<div class="card">${tripsTable(state.trips)}</div>`,
      driver: driverPage,
      ops: opsPage,
      verify: verifyPage
    };
    $("#app").innerHTML = pages[page]();
    bind();
  }
  function on(id, fn) {
    const el = $("#" + id);
    if (el) el.onclick = fn;
  }
  function speak(text) {
    const synth = globalThis.speechSynthesis;
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale === "ta" ? "ta-IN" : "en-IN";
    synth.speak(u);
  }
  function onMeterUpdate(reading) {
    const whole = Math.floor(reading.snapshot.distanceMeters / 1e3);
    if (meterVoice && reading.fare && whole > lastAnnouncedKm) speak(L("meter.announce", { amount: money(reading.fare.totalPaise) }));
    lastAnnouncedKm = Math.max(lastAnnouncedKm, whole);
    const live = $("#meter-live");
    if (page === "meter" && live) live.innerHTML = meterLive(reading);
  }
  function stopMeter() {
    if (!meter) return;
    const session = meter;
    meter = null;
    const result = session.stop();
    render();
    if (!result.fare) return toast(L("ui.meter.noFix"));
    const trip = recordMeterTrip(state, {
      fare: result.fare,
      distanceMeters: result.snapshot.distanceMeters,
      startedAt: result.snapshot.startedAt,
      endedAt: result.endedAt,
      vehicleNumber: session.vehicleNumber,
      flags: result.snapshot.flags
    });
    lastMeterTripId = trip.id;
    persist();
    modal(
      L("ui.meter.receipt"),
      `<p>${km(trip.distanceMeters)} ${L("ui.unit.km")} · ${L("meter.waiting")} ${Math.floor(result.snapshot.waitingSeconds / 60)} ${L("ui.unit.min")}${trip.vehicleNumber ? " · " + escapeHtml(trip.vehicleNumber) : ""}</p>${receipt(trip.fare)}
    ${trip.meterFlags.length ? `<ul class="assumptions">${trip.meterFlags.map((f) => `<li>${L("meter.flag." + f)}</li>`).join("")}</ul>` : ""}
    <label class="field">${L("ui.meter.asked")}<div><input id="asked" type="number" min="0" step="1" inputmode="numeric"></div></label>
    <button class="secondary danger" id="report-overcharge">${L("meter.reportOvercharge")}</button>`
    );
  }
  function bind() {
    on("about", () => modal(L("ui.about.title"), `<p>${L("ui.about.body")}</p>`));
    on("to-meter", () => go("meter"));
    ["pickup", "drop"].forEach((id) => {
      const el = $("#" + id);
      if (el)
        el.onchange = () => {
          if (id === "pickup") pickup = +el.value;
          else drop = +el.value;
          render();
        };
    });
    const weight = $("#weight");
    if (weight) weight.onchange = () => render();
    document.querySelectorAll("[data-category]").forEach(
      (b) => b.onclick = () => {
        if (page === "parcel") parcelCategory = b.dataset.category;
        else rideCategory = b.dataset.category;
        render();
      }
    );
    const pay = $("#payment");
    if (pay) pay.onchange = (e) => payment = e.target.value;
    on("now", () => (schedule = "now", render()));
    on("later", () => (schedule = "later", render()));
    on("breakdown", () => {
      const distanceMeters = estimateRouteMeters(pickup, drop);
      modal(L("ui.fare.title"), `<p>${categoryName(rideCategory)} · ${L("ui.route.approx", { km: km(distanceMeters) })}</p>${receipt(quote(rideCategory, distanceMeters, Date.now()))}<p class="small-note">${L("ui.fare.estimateNote")}</p>`);
    });
    const book = (category, parcel) => {
      const result = createBooking(state, { category, pickup, drop, payment, departure: $("#departure")?.value || null, parcel }, Date.now());
      if (!result.ok) return toast(L("ui.err." + result.error));
      persist();
      render();
      toast(L("ui.booked"));
    };
    on("book", () => book(rideCategory, null));
    on(
      "book-parcel",
      () => book(parcelCategory, { weightGrams: Math.round(Number($("#weight")?.value || 0) * 1e3), receiver: String($("#receiver")?.value || "").trim() || "—" })
    );
    on("cancel", () => modal(L("ui.cancel.title"), `<p>${L("ui.cancel.body")}</p><button class="secondary danger" id="confirm-cancel">${L("ui.cancel.confirm")}</button>`));
    on("share-trip", async () => {
      const trip = activeTrip(state);
      const text = trip ? L("ui.trip.shareText", { id: trip.id, from: placeName(trip.pickup, locale), to: placeName(trip.drop, locale), status: L("trip.status." + trip.status) }) : L("ui.meter.shareText");
      try {
        await navigator.clipboard.writeText(text);
        toast(L("ui.copied"));
      } catch {
        modal(L("ui.trip.summary"), `<p>${escapeHtml(text)}</p>`);
      }
    });
    on("safety", () => modal(L("ui.safety.title"), `<p>${L("ui.safety.body")}</p><button class="secondary" id="report">${L("ui.safety.report")}</button>`));
    on("online", () => {
      state.online = !state.online;
      persist();
      render();
    });
    on("advance", () => {
      const action = nextDriverAction();
      if (!action) return;
      const code = $("#otp-input") ? String($("#otp-input").value) : null;
      const result = driverAction(state, action, code, Date.now());
      if (!result.ok) return toast(L("ui.err." + result.error));
      persist();
      render();
      toast(L(result.trip.completed ? "ui.completedToast" : "ui.updated"));
    });
    document.querySelectorAll("[data-detail]").forEach(
      (b) => b.onclick = () => {
        const trip = state.trips.find((tr) => tr.id === b.dataset.detail);
        if (!trip) return;
        modal(
          trip.id,
          `<p>${trip.flow === "meter" ? L("ui.trips.streetHail") : `${escapeHtml(placeName(trip.pickup, locale))} → ${escapeHtml(placeName(trip.drop, locale))}`}<br>${categoryName(trip.category)} · ${L("trip.status." + trip.status)} · ${km(trip.distanceMeters)} ${L("ui.unit.km")}</p>${trip.status === "CANCELLED" ? "" : receipt(trip.fare)}<p class="small-note">${L("ui.notInvoice")}</p>`
        );
      }
    );
    on("export", () => {
      const rows = [
        ["Trip", "Flow", "Category", "Pickup", "Destination", "Distance km", "Fare INR", "Tariff", "Tariff status", "Status"],
        ...state.trips.map((tr) => [tr.id, tr.flow, tr.category, placeName(tr.pickup, "en"), placeName(tr.drop, "en"), tr.distanceMeters / 1e3, tr.fare.totalPaise / 100, tr.fare.ruleId, tr.fare.status, tr.status])
      ];
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "thozhan-demo-trips.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
    on("reset", () => modal(L("ui.reset.title"), `<p>${L("ui.reset.body")}</p><button class="secondary danger" id="confirm-reset">${L("ui.reset.confirm")}</button>`));
    document.querySelectorAll("[data-flag]").forEach(
      (b) => b.onclick = () => {
        const c = getCategory(b.dataset.flag);
        state.flags[c.id] = !flagOn(c);
        persist();
        render();
      }
    );
    on("terrain-plain", () => (meterTerrain = "plain", render()));
    on("terrain-ghat", () => (meterTerrain = "ghat", render()));
    on("source-gps", () => (meterSource = "gps", render()));
    on("source-sim", () => (meterSource = "simulation", render()));
    const voice = $("#meter-voice");
    if (voice) voice.onchange = () => meterVoice = !!voice.checked;
    on("meter-start", () => {
      const vehicleNumber = String($("#vehicle-number")?.value || "").trim().toUpperCase() || null;
      lastAnnouncedKm = 0;
      meter = startMeter({
        source: meterSource,
        terrain: meterTerrain,
        vehicleNumber,
        onUpdate: onMeterUpdate,
        onError: (error) => {
          meter?.stop();
          meter = null;
          render();
          toast(L("ui.meter.err." + error));
        }
      });
      render();
    });
    on("meter-stop", stopMeter);
    const bindInput = (id, key) => {
      const el = $("#" + id);
      if (el)
        el.oninput = () => {
          verifyInput[key] = el.value;
          $("#v-result").innerHTML = verifyResult();
        };
    };
    bindInput("v-km", "km");
    bindInput("v-waiting", "waiting");
    bindInput("v-ride", "ride");
    bindInput("v-weight", "weight");
    bindInput("v-start", "start");
    const vc = $("#v-category");
    if (vc)
      vc.onchange = () => {
        verifyInput.category = vc.value;
        if (!getActiveRule(vc.value).ghat) verifyInput.terrain = "plain";
        render();
      };
    on("v-plain", () => (verifyInput.terrain = "plain", render()));
    on("v-ghat", () => (verifyInput.terrain = "ghat", render()));
  }
  $("#close-dialog").onclick = () => $("#dialog").close();
  $("#help").onclick = () => modal(L("ui.help.title"), `<p>${L("ui.help.body1")}</p><p>${L("ui.help.body2")}</p>`);
  var langButton = $("#lang");
  if (langButton) langButton.onclick = () => setLocale(locale === "ta" ? "en" : "ta");
  $("#dialog").addEventListener("click", (e) => {
    const id = e.target.id;
    if (id === "confirm-cancel") {
      cancelActive(state);
      persist();
      $("#dialog").close();
      render();
    }
    if (id === "report") {
      const trip = activeTrip(state);
      addCase(state, { trip: trip?.id ?? (meter ? "METER" : "—"), kind: "safety", askedPaise: null, meterPaise: null, created: Date.now() });
      persist();
      $("#dialog").close();
      toast(L("ui.safety.saved"));
    }
    if (id === "report-overcharge") {
      const trip = state.trips.find((tr) => tr.id === lastMeterTripId);
      const asked = Math.round(Number($("#asked")?.value || 0) * 100);
      if (!trip || !(asked > 0)) return toast(L("ui.meter.askedMissing"));
      addCase(state, { trip: trip.id, kind: "overcharge", askedPaise: asked, meterPaise: trip.fare.totalPaise, created: Date.now() });
      persist();
      $("#dialog").close();
      toast(L("ui.meter.reported"));
    }
    if (id === "confirm-reset") {
      state = emptyState();
      persist();
      $("#dialog").close();
      render();
      toast(L("ui.reset.done"));
    }
  });
  globalThis.thozhanDemo = {
    go,
    render,
    setLocale,
    active: () => activeTrip(state),
    get state() {
      return state;
    }
  };
  render();
})();
