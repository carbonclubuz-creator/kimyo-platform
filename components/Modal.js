"use client";

// components/Modal.js
// Oddiy overlay modal — sarlavha, yopish tugmasi va ixtiyoriy kontent bilan.
// Sinf yaratish, o'quvchi qo'shish, tasdiqlash oynalari kabi joylarda
// ishlatiladi.

export default function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl2 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-600"
            aria-label="Yopish"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
