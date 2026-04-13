import { Modal } from "../../common/Modal";

const R2_BASE_URL = "https://pub-f0bcf28b115849ffbbb6ac15fb70a6c2.r2.dev";

interface ProductImageModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  imageKey: string;
}

export function ProductImageModal({
  open,
  onClose,
  productName,
  imageKey,
}: ProductImageModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={productName} size="md">
      <div className="flex items-center justify-center">
        <img
          src={`${R2_BASE_URL}/${imageKey}`}
          alt={productName}
          className="max-h-[60vh] w-full rounded-[var(--radius-lg)] object-contain"
        />
      </div>
    </Modal>
  );
}
