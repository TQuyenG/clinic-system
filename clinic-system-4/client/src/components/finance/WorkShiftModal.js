// client/src/components/finance/WorkShiftModal.js
import React, { useState, useEffect } from 'react';
import { FaCashRegister, FaUser, FaClock, FaTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import './WorkShiftModal.css';

const WorkShiftModal = ({ 
  show, 
  onHide, 
  mode, // 'start' | 'end'
  onSubmit, 
  shiftStats = { startCash: 0, revenueCash: 0 },
  currentUser = 'Admin' // Mặc định là Admin nếu không truyền vào
}) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Cập nhật đồng hồ mỗi giây
  useEffect(() => {
    if (!show) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    setAmount('');
    setNote('');
    return () => clearInterval(timer);
  }, [show]);

  if (!show) return null; // Không render gì nếu show = false

  // Logic tính toán
  const systemTotal = (shiftStats.startCash || 0) + (shiftStats.revenueCash || 0);
  const actualAmount = parseInt(amount) || 0;
  const difference = actualAmount - systemTotal;
  
  const formatMoney = (n) => n ? n.toLocaleString('vi-VN') : '0';

  // Format ngày giờ
  const timeString = currentTime.toLocaleTimeString('vi-VN');
  const dateString = currentTime.toLocaleDateString('vi-VN');

  return (
    <div className="ws-overlay">
      <div className="ws-container">
        
        {/* 1. HEADER */}
        <div className={`ws-header ${mode}`}>
          <div className="ws-title">
            <FaCashRegister /> 
            {mode === 'start' ? 'KHAI BÁO ĐẦU CA' : 'KẾT THÚC CA LÀM VIỆC'}
          </div>
          <FaTimes style={{cursor: 'pointer'}} onClick={onHide} size={20}/>
        </div>

        {/* 2. INFO BAR (Người dùng & Thời gian) */}
        <div className="ws-info-bar">
          <div className="ws-info-item">
            <FaUser className="text-primary"/> 
            <span>Nhân viên: {currentUser}</span>
          </div>
          <div className="ws-info-item">
            <FaClock className="text-success"/> 
            <span>{timeString} - {dateString}</span>
          </div>
        </div>

        {/* 3. BODY */}
        <div className="ws-body">
          {mode === 'start' ? (
            /* --- GIAO DIỆN MỞ CA --- */
            <>
              <div className="ws-input-group">
                <label className="ws-label">Tiền mặt đang có trong két (Tiền lẻ/Tiền vốn):</label>
                <div className="position-relative">
                   <input 
                      type="number" 
                      className="ws-money-input"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0"
                      autoFocus
                   />
                   <span style={{position:'absolute', right: 20, top: 15, fontWeight:'bold', color: '#888'}}>VNĐ</span>
                </div>
                <small className="text-muted mt-2 d-block">
                  * Hãy đếm kỹ tiền lẻ trong két trước khi nhập. Số tiền này sẽ là số dư đầu kỳ.
                </small>
              </div>
            </>
          ) : (
            /* --- GIAO DIỆN KẾT CA --- */
            <>
               <div className="ws-diff-box mb-3">
                  <div className="diff-row">
                    <span>Tiền đầu ca:</span>
                    <strong>{formatMoney(shiftStats.startCash)} đ</strong>
                  </div>
                  <div className="diff-row text-success">
                    <span>Doanh thu ca (Tiền mặt):</span>
                    <strong>+ {formatMoney(shiftStats.revenueCash)} đ</strong>
                  </div>
                  <div className="diff-result text-primary">
                    <span>TỔNG LÝ THUYẾT TRONG KÉT:</span>
                    <span>{formatMoney(systemTotal)} đ</span>
                  </div>
               </div>

               <div className="ws-input-group">
                <label className="ws-label text-danger">TIỀN THỰC TẾ ĐẾM ĐƯỢC:</label>
                <div className="position-relative">
                   <input 
                      type="number" 
                      className={`ws-money-input ${difference !== 0 && amount ? 'error' : ''}`}
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="Nhập tổng tiền đếm được..."
                      autoFocus
                   />
                   <span style={{position:'absolute', right: 20, top: 15, fontWeight:'bold', color: '#888'}}>VNĐ</span>
                </div>
              </div>

              {/* Hiển thị trạng thái thừa/thiếu */}
              {amount !== '' && (
                <div className={`p-2 rounded text-center fw-bold ${difference === 0 ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                   {difference === 0 ? (
                     <><FaCheckCircle/> Khớp số liệu chính xác</>
                   ) : (
                     <><FaExclamationTriangle/> {difference > 0 ? 'DƯ (THỪA): ' : 'THIẾU (THẤT THOÁT): '} {formatMoney(Math.abs(difference))} đ</>
                   )}
                </div>
              )}
            </>
          )}

          {/* Ô nhập ghi chú chung */}
          <div className="ws-input-group mt-3">
            <label className="ws-label">Ghi chú / Bàn giao ca:</label>
            <textarea 
              className="form-control" 
              rows="2"
              placeholder="Ghi chú về thiết bị hỏng, các vấn đề phát sinh..."
              value={note}
              onChange={e => setNote(e.target.value)}
            ></textarea>
          </div>
        </div>

        {/* 4. FOOTER */}
        <div className="ws-footer">
          <button className="ws-btn ws-btn-cancel" onClick={onHide}>Hủy bỏ</button>
          <button 
            className={`ws-btn ws-btn-submit ${mode === 'end' ? 'danger' : ''}`}
            onClick={() => onSubmit({ amount: parseInt(amount)||0, note, difference })}
            disabled={!amount}
          >
            {mode === 'start' ? 'XÁC NHẬN MỞ CA' : 'XÁC NHẬN KẾT CA'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default WorkShiftModal;