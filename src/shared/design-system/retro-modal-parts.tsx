import ButtonGroup from "@atlaskit/button/button-group";
import ModalBody, { type ModalBodyProps } from "@atlaskit/modal-dialog/modal-body";
import ModalFooter, { type ModalFooterProps } from "@atlaskit/modal-dialog/modal-footer";
import ModalHeader, { type ModalHeaderProps } from "@atlaskit/modal-dialog/modal-header";

type IdentifiedPart = { id: string };

export function RetroModalActions({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return <ButtonGroup label={label}>{children}</ButtonGroup>;
}

export function RetroModalHeader({ id, ...props }: ModalHeaderProps & IdentifiedPart) {
  return <ModalHeader {...props} testId={`retro-modal-header-${id}`} />;
}

export function RetroModalBody({ id, ...props }: ModalBodyProps & IdentifiedPart) {
  return <ModalBody {...props} testId={`retro-modal-body-${id}`} />;
}

export function RetroModalFooter({ id, ...props }: ModalFooterProps & IdentifiedPart) {
  return <ModalFooter {...props} testId={`retro-modal-footer-${id}`} />;
}
