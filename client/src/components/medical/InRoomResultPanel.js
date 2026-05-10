import React from 'react';
import './InRoomResultPanel.css';
import MedicalRecordFormPage from '../../pages/MedicalRecordFormPage';

const InRoomResultPanel = ({ appointmentCode, onClose }) => {
  if (!appointmentCode) return null;

  return (
    <div className="inroom-result-panel-root">
      <div className="inroom-result-panel-header">
        <div>Nhập kết quả (Trong phòng)</div>
        <button className="inroom-result-panel-close" onClick={onClose}>×</button>
      </div>

      <div className="inroom-result-panel-body">
        <MedicalRecordFormPage embeddedCode={appointmentCode} onClose={onClose} />
      </div>
    </div>
  );
};

export default InRoomResultPanel;
