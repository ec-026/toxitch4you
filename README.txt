T4 WebRTC ICE ordering patch (experimental)

REPLACE ONE FILE ONLY:
  toxitch4you_cloudflare/public/app.js
with:
  public/app.js from this ZIP.

Keep original SWF, server, CSS, HTML, and other files unchanged.
Back up the existing app.js first.
Run your usual deployment workflow only on the test Worker (NOT production).

Why:
  The original browser code discarded rtc-ice messages received before the
  RTCPeerConnection was created. This patch queues those messages and
  applies them after remoteDescription is set. It also logs connection/
  ICE states in the console to distinguish signaling issues from NAT failure.

Test:
  Host in one device, guest in another. Open Console on guest and host;
  filter for [T4 WebRTC]. Check ICE state. Connected/completed indicates
  peer transport worked; failed means direct connectivity is unsuccessful.

Limitations:
  This is a targeted race-condition patch, not a guarantee of successful
  WebRTC media connections. STUN alone may fail across carrier-grade NAT,
  restrictive Wi-Fi or firewalls. In that case use a properly configured TURN
  service with short-lived credentials. No TURN credentials are included.
