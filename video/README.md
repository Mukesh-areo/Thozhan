# Thozhan Android format demo video

A Remotion composition using nine HTML scenes generated from the actual Thozhan web prototype's demo state transitions.

## Render on a desktop

Install Node.js 22 or newer. Extract this folder, open a terminal in it, and run:

    npm ci
    npm run render

The output will be `../media/Thozhan-Demo.mp4`. Copy this MP4 to an Android phone for playback or sharing. Run `npm run studio` to inspect and edit the composition first.

## Video specification

- Portrait 720 by 1280 pixels, 24 fps, 50 seconds
- English captions, no audio
- Thozhan branding and Android-style phone frame
- Booking, request, driver acceptance, arrival, OTP, in-progress trip, earnings and operations
- Rendered walkthrough, not a physical-phone screen recording
- Simulated fares, rides, payments and support only

## Verification status

Dependencies installed successfully. App state generation succeeded. The Remotion browser renderer failed to launch with SIGTRAP in the creation environment; `/proc` was unavailable. The local attempt produced no MP4 or visually verified preview. Check the repository render workflow for subsequent render results. Inspect all scenes in Remotion Studio before rendering and sharing. Scrolling and text placement may require adjustment.

The original web app remains a prototype, not a native Android APK. This project is self-contained: pre-generated HTML scenes in `public` require no sign-in or external app connection. No private user records or credentials are included.

Remotion has its own licensing terms; see https://github.com/remotion-dev/remotion/blob/main/LICENSE.md for applicable use.

# Thozhan explainer video (5 minutes, narrated)

`ThozhanExplainer` is a 1920 by 1080, 30 fps landscape explainer of about five minutes. It covers the problem, the G.O. 366 auto tariff, the bilingual app step by step (booking, fare details, driver accept and OTP, earnings, the virtual street-hail meter, parcels, operations, fare check), the ₹10 active-day revenue model, and the benefits for government, public and drivers. Each scene has English narration, timed captions and a Tamil subtitle line.

Rebuild it in this order (Windows, with Chrome or Edge installed):

    npm ci
    npm run screens          # real screenshots of ../web, clock pinned to 4 Nov 2026 11:00 IST
    npm run narration        # Windows en-IN voice -> public/narration/*.wav, then explainer/durations.json
    npm run render:explainer # -> ../media/Thozhan-Explainer.mp4

`npm run studio:explainer` previews it. The narration text, scene order and zoom targets are in `explainer/script.json`; scene lengths follow the measured audio, so edit the script and rerun `npm run narration` before rendering. Revenue figures in the video are illustrative and say so on screen; bike, cab and parcel rates are illustrative pending government approval.
