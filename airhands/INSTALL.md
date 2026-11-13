## Install AirHands (no Xcode needed)

1. Download **AirHands.zip** below and double-click it. You get **AirHands.app**.
2. Drag **AirHands.app** into your **Applications** folder.
3. Double-click it. macOS will say it "cannot verify the developer" (this build is not
   notarized by Apple). Click **Done**, then open **System Settings → Privacy & Security**,
   scroll down and click **Open Anyway** next to AirHands, then confirm.
   *(Alternative, in Terminal: `xattr -dr com.apple.quarantine /Applications/AirHands.app`)*
4. A hand icon appears in the menu bar (top right). Click it → turn **AirHands** on →
   allow camera access.

Runs entirely on your Mac: camera frames are never saved or sent anywhere.
Requires macOS 14 or later.
