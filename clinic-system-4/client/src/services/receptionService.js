import api from './api';

// --- CA LÀM VIỆC ---
const startShift = (data) => api.post('/work-shifts/start', data);
const endShift = (data) => api.post('/work-shifts/end', data);
const getCurrentShift = () => api.get('/work-shifts/current');

// --- TIẾP ĐÓN ---
// Tạo user + patient + appointment + payment(pending) trong 1 lệnh
const registerWalkIn = (data) => api.post('/reception/walk-in', data); 
// Lấy danh sách appointment hôm nay (có filter)
const getTodayAppointments = (params) => api.get('/appointments/today', { params });

// --- THU NGÂN ---
// Lấy danh sách payment pending tại quầy
const getPendingPayments = () => api.get('/payments/pending-clinic');
const processPayment = (id, method) => api.post(`/payments/${id}/pay`, { method });

// --- NHÀ THUỐC ---
const getMedicines = (search) => api.get('/pharmacy/medicines', { params: { search, limit: 100 } });
const createRetailOrder = (items) => api.post('/pharmacy/retail', { items });

const receptionService = {
  startShift,
  endShift,
  getCurrentShift,
  registerWalkIn,
  getTodayAppointments,
  getPendingPayments,
  processPayment,
  getMedicines,
  createRetailOrder
};

export default receptionService;