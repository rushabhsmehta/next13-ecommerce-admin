"use client";

import { useState } from "react";


interface OptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (option: string) => void;
  }
  
  export const OptionModal: React.FC<OptionModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [selectedOption, setSelectedOption] = useState('');
  
    const handleConfirm = () => {
      onConfirm(selectedOption);
      onClose(); // Close modal after selection
    };
  
    return (
      <div className={`modal ${isOpen ? 'show' : ''}`}>
        {/* Modal content */}
        <div className="modal-content">
          <h4>Select an Option</h4>
          <select value={selectedOption} onChange={(e) => setSelectedOption(e.target.value)}>
            <option value="">Empty</option>
            <option value="AH">AH</option>
            <option value="KH">KH</option>
            <option value="MT">MT</option>
          </select>
          <button onClick={handleConfirm}>Confirm</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    );
  };
  