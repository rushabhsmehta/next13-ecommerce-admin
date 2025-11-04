"use client";

import { useState } from "react";


interface OptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (option: string) => void;
  }
  
  export const OptionModal: React.FC<OptionModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const handleConfirm = () => {
      // Always use AH as the default option
      onConfirm("AH");
      onClose();
    };
  
    return (
      <div className={`modal ${isOpen ? 'show' : ''}`}>
        {/* Modal content */}
        <div className="modal-content">
          <h4>Generating PDF with Aagam Holidays</h4>
          <button onClick={handleConfirm}>Generate PDF</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    );
  };
  
