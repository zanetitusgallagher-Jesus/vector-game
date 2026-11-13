## Install AirHands (no Xcode needed)

1. Download **AirHands.zip** below and double-click it. You get **AirHands.app**.
2. Drag **AirHands.app** into your **Applications** folder.
3. Double-click it. macOS will say it "cannot verify the developer" (this build is not
   notarized by Apple). Click **Done**, then open **System Settings → Privacy & Security**,
   scroll down and click **Open Anyway** next to AirHands, then confirm.
   *(Alternative, in Terminal: `xattr -dr com.apple.quarantine /Applications/AirHands.app`)*
4. A welcome window walks you through three permissions:
   - **Camera** — to see your hands.
   - **Accessibility** — so AirHands can move the cursor, click, scroll and move windows.
   - **Input Monitoring** — so gestures pause automatically while you type.
   For Accessibility and Input Monitoring, switch AirHands on in the System Settings page that
   opens, then quit and reopen AirHands.
5. Click the hand icon in the menu bar (or press **⌃⌥Space**) to turn AirHands on and off.

**Quick start:** ☝️ point to move the cursor · 🤏 pinch thumb + index to click (pinch twice
to double-click, hold and move to drag) · ✋ open hand to stop the cursor · ✌️ two fingers
together to scroll. Everything else (swipes, volume knob, window throwing, two-hand zoom…)
is listed in **Settings → Gestures**, where you can also switch gestures off or remap them.

Installing a new version: macOS asks for the permissions again (this build is not signed
with an Apple Developer ID).

Runs entirely on your Mac: camera frames are never saved or sent anywhere.
Requires macOS 14 or later.
