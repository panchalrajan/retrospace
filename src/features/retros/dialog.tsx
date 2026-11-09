import type { ReactNode } from "react";
import ModalDialog, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from "@atlaskit/modal-dialog";
import IconButton from "@atlaskit/button/icon/button";
import CrossIcon from "@atlaskit/icon/core/cross";
export function Dialog({ title, children, footer, onClose, busy = false, width = "small" }: { title: string; children: ReactNode; footer?: ReactNode; onClose: () => void; busy?: boolean; width?: "small" | "medium" | "large" }) {
  return <ModalDialog width={width} onClose={() => { if (!busy) onClose(); }} shouldCloseOnOverlayClick={!busy}><ModalHeader><ModalTitle>{title}</ModalTitle><IconButton icon={CrossIcon} appearance="subtle" label="Close dialog" onClick={onClose} isDisabled={busy} /></ModalHeader><ModalBody>{children}</ModalBody>{footer && <ModalFooter>{footer}</ModalFooter>}</ModalDialog>;
}
