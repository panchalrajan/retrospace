import { useSyncExternalStore, type ReactNode } from "react";
import ScreenIcon from "@atlaskit/icon/core/screen";
import { RetrospaceBrand } from "@/features/navigation/components/retrospace-brand";
import { supportsDesktopLayout } from "./desktop-viewport";
const touchQuery = "(hover: none) and (pointer: coarse)";
function subscribe(callback: () => void) {
  const touch = window.matchMedia(touchQuery);
  window.addEventListener("resize", callback);
  touch.addEventListener("change", callback);
  return () => { window.removeEventListener("resize", callback); touch.removeEventListener("change", callback); };
}
function getSnapshot() { return supportsDesktopLayout(window.innerWidth, window.innerHeight, window.matchMedia(touchQuery).matches); }
function getServerSnapshot() { return true; }

/** CSS blocks the first mobile paint; the matching client gate unmounts the app. */
export function DesktopGate({ children }: { children: ReactNode }) {
  const supported = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return <><div className="desktop-required"><header><RetrospaceBrand /></header><main><span className="desktop-required-icon"><ScreenIcon label="" /></span><p className="desktop-required-eyebrow">A LITTLE MORE ROOM TO REFLECT</p><h1>Open Retrospace<br />on a bigger screen.</h1><p>Retrospace is designed for desktop and iPad. Please open this link on one of those devices to use the workspace.</p><span className="desktop-required-note">Your ideas deserve a little space.</span></main><footer>A little reflection. A better next sprint.</footer></div>{supported && <div className="desktop-application">{children}</div>}</>;
}
