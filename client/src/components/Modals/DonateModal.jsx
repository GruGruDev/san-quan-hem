import EconomyShop from "./EconomyShop";

export default function DonateModal({
  isOpen,
  onClose,
  currentUser,
  onAccountUpdate,
}) {
  return (
    <EconomyShop
      isOpen={isOpen}
      onClose={onClose}
      currentUser={currentUser}
      onAccountUpdate={onAccountUpdate}
    />
  );
}
