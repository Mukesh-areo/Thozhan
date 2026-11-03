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
