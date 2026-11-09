import { useState } from "react";
import { useRouter } from "next/router";
import ModalDialog, { ModalTransition, ModalHeader, ModalTitle, ModalBody } from "@atlaskit/modal-dialog";
import IconButton from "@atlaskit/button/icon/button";
import CrossIcon from "@atlaskit/icon/core/cross";
import { AuthForm, authCopy } from "./auth-form";
import { getAuthMode } from "./modal-routing";
export function AuthModal() {
  const router = useRouter();
  const mode = getAuthMode(router.query.auth);
  const [busy, setBusy] = useState(false);
  function close() { if (!busy) void router.replace("/", undefined, { shallow: true, scroll: false }); }
  return <ModalTransition>{mode && <ModalDialog width="small" onClose={close} shouldReturnFocus onOpenComplete={() => { document.querySelector<HTMLInputElement>("[data-auth-form] input")?.focus(); }} onCloseComplete={() => { if (!document.querySelector('[role="dialog"]') && (!document.activeElement || document.activeElement === document.body)) document.querySelector<HTMLElement>('[data-auth-login] a')?.focus(); }}>
    <ModalHeader><ModalTitle>{authCopy[mode][0]}</ModalTitle><IconButton appearance="subtle" icon={CrossIcon} label="Close account dialog" onClick={close} isDisabled={busy} /></ModalHeader>
    <ModalBody><div className="auth-modal-content"><p className="auth-description">{authCopy[mode][1]}</p><AuthForm key={mode} mode={mode} onBusyChange={setBusy} /></div></ModalBody>
  </ModalDialog>}</ModalTransition>;
}
