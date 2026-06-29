/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-zinc-900/60 z-[600] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-zinc-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto relative animate-fade-in">
        <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-3">
          <h2 className="text-sm font-black text-[#B8860B] flex items-center gap-2 uppercase tracking-wide">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 transition-colors text-2xl focus:outline-none cursor-pointer"
          >
            &times;
          </button>
        </div>
        <div className="text-zinc-600 text-sm leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}
