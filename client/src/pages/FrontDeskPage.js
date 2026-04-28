// client/src/pages/FrontDeskPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // <--- THÊM DÒNG NÀY
import axios from 'axios'; 
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext'; // <--- THÊM DÒNG NÀY
import WorkShiftModal from '../components/finance/WorkShiftModal'; // Giữ nguyên file này
// Custom Modal — không dùng Bootstrap
// Thêm FaInfoCircle vào danh sách icon
import { 
  FaUserPlus, FaMoneyBillWave, FaPills, FaSearch, FaPrint, FaEdit, 
  FaStethoscope, FaClock, FaCheckCircle, FaTrash, FaHistory, FaFilePrescription,
  FaQrcode, FaCreditCard, FaTag, FaArrowRight, FaUndo, FaTicketAlt, FaCalendarAlt, FaInfoCircle,
  FaChevronLeft, FaChevronRight, FaCalendarDay,
  // Icon cho giao diện chi tiết mới
  FaHospital, FaUserMd, FaPhone, FaEnvelope, FaMapMarkerAlt, FaVideo, FaNotesMedical, FaUser,
  FaTimes,
  FaHeart, FaBan, FaShieldAlt, // <--- Đã thêm các icon này
   FaSmile
} from 'react-icons/fa';
import appointmentService from '../services/appointmentService'; // <--- Import Service
import './FrontDeskPage.css';

// ─── CUSTOM MODAL (không dùng Bootstrap) ──────────────────────────────────
// Render vào document.body qua Portal để tránh stacking context của layout cha
import { createPortal } from 'react-dom';

const FrdModal = ({ show, onHide, size = 'md', children, className = '' }) => {
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [show]);

  if (!show) return null;

  const sizeClass = size === 'lg' ? 'frd-modal-lg' : size === 'xl' ? 'frd-modal-xl' : size === 'sm' ? 'frd-modal-sm' : '';

  return createPortal(
    <div className="frd-modal-backdrop" onClick={onHide}>
      <div className={`frd-modal-dialog ${sizeClass} ${className}`} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
};

FrdModal.Header = ({ children, onHide, className = '' }) => (
  <div className={`frd-modal-header ${className}`}>
    <div className="frd-modal-title">{children}</div>
    {onHide && (
      <button className="frd-modal-close" onClick={onHide} type="button">
        <FaTimes />
      </button>
    )}
  </div>
);

FrdModal.Body = ({ children, className = '' }) => (
  <div className={`frd-modal-body ${className}`}>{children}</div>
);

FrdModal.Footer = ({ children, className = '' }) => (
  <div className={`frd-modal-footer ${className}`}>{children}</div>
);
// ──────────────────────────────────────────────────────────────────────────────

// --- MOCK DATA ---
// Data được load từ API — không dùng mock
const ROOMS = [];
const SERVICES = [];
const INITIAL_PATIENTS = [];
const FrontDeskPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // <--- THÊM DÒNG NÀY
    
  // --- STATE ---
  // [SỬA] Lấy tab từ localStorage để giữ trạng thái khi F5
  const [activeTab, setActiveTab] = useState(localStorage.getItem('currentTab') || 'reception');

  // [SỬA] Lưu tab mỗi khi thay đổi
  useEffect(() => {
      localStorage.setItem('currentTab', activeTab);
  }, [activeTab]);
  
  const [receptionTab, setReceptionTab] = useState('payment');

  // [SỬA] Bộ lọc Tiếp đón: Mặc định là Hôm nay và thêm trạng thái 'status'
  const [receptionFilter, setReceptionFilter] = useState({ 
      date: new Date().toISOString().split('T')[0], // Mặc định hôm nay
      keyword: '',
      status: 'all' // Thêm bộ lọc: all, no_num (chưa số), has_num (đã số)
  });

  // --- THÊM MỚI: State lưu cấu hình ngân hàng động ---
  const [bankConfig, setBankConfig] = useState({
    bank_name: 'MB', 
    account_no: '', 
    account_name: ''
  });

  // [MỚI] State lưu danh sách Dịch vụ thật từ Database
  const [servicesList, setServicesList] = useState([]);

  // Gọi API lấy danh sách dịch vụ khi vào trang
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.get('http://localhost:3001/api/services'); // Giả định route này tồn tại
        if (res.data.success) {
          setServicesList(res.data.data || []); // Lưu vào state
        }
      } catch (error) {
        console.error("Lỗi tải dịch vụ:", error);
      }
    };
    fetchServices();
  }, []);

  // --- THÊM MỚI: Gọi API lấy cấu hình thanh toán khi vào trang ---
  useEffect(() => {
    const fetchPaymentConfig = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:3001/api/payments/config', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success && res.data.data.bank) {
          setBankConfig(res.data.data.bank); // Cập nhật dữ liệu thật từ database
        }
      } catch (error) {
        console.error("Lỗi tải cấu hình ngân hàng:", error);
      }
    };
    fetchPaymentConfig();
  }, []);
  const [shift, setShift] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [modalMode, setModalMode] = useState('start');
  

  // Reception State
  const [patients, setPatients] = useState([]);
  const [editingPatient, setEditingPatient] = useState(null); // Nếu có ID thì là sửa
  // [CẬP NHẬT] Form chuẩn thông tin y tế
  const [regForm, setRegForm] = useState({
    name: '', 
    phone: '', 
    birth: '', 
    gender: 'Nam', 
    cccd: '',        // Thẻ căn cước
    address: '',     // Địa chỉ
    examDate: new Date().toISOString().split('T')[0], // Mặc định hôm nay
    symptoms: '', 
    serviceId: '', 
    doctor_id: ''    // Nếu cần chọn bác sĩ cụ thể
  });

  // Cashier State
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Pharmacy State
  const [pharmacyTab, setPharmacyTab] = useState('prescription'); // 'prescription' | 'retail'
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [retailCart, setRetailCart] = useState([]);
  const [medSearch, setMedSearch] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);
  
  // --- THÊM STATE VÀ HÀM FETCH DATA MỚI ---
  const [medicinesList, setMedicinesList] = useState([]);

  // State thông tin khách lẻ
  const [retailCustomer, setRetailCustomer] = useState({ 
    name: '', 
    phone: '', 
    address: '', 
    note: '' 
  });

  // --- [MỚI] State cho Thanh toán & In ấn ---
  const [discountAmount, setDiscountAmount] = useState(0); // Tiền giảm
  
  
    // --- [SỬA LẦN CUỐI] Tải danh sách đơn thuốc & Xử lý giá tiền CHÍNH XÁC ---
  // --- [SỬA LẦN CUỐI - FIX LỖI GIÁ TIỀN = 0] ---
  useEffect(() => {
    if (activeTab === 'pharmacy' && pharmacyTab === 'prescription') {
      const fetchData = async () => {
        try {
          const token = localStorage.getItem('token');
          
          // 1. Hàm chuẩn hóa chuỗi để tìm tên thuốc dễ hơn
          const cleanStr = (str) => {
             if (!str) return '';
             return str.toString().toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Bỏ dấu
                .replace(/[^a-z0-9]/g, ""); // Bỏ hết ký tự đặc biệt, chỉ giữ chữ số
          };

          // 2. Hàm parse giá tiền (Xử lý mọi loại định dạng: "50.000", "50,000", 50000)
          const parsePrice = (p) => {
              if (p === null || p === undefined) return 0;
              const num = parseInt(p.toString().replace(/\D/g, ''));
              return isNaN(num) ? 0 : num;
          };

          // 3. Lấy kho thuốc
          let medList = [];
          try {
             const medRes = await axios.get('http://localhost:3001/api/articles/medicines?limit=5000', {
                 headers: { Authorization: `Bearer ${token}` }
             });
             
             // [QUAN TRỌNG] Tự động dò tìm mảng thuốc trong các cấu trúc phổ biến
             const rawData = medRes.data;
             if (Array.isArray(rawData.data)) {
                 medList = rawData.data; // Trường hợp 1: data: [...]
             } else if (rawData.data && Array.isArray(rawData.data.rows)) {
                 medList = rawData.data.rows; // Trường hợp 2: data: { rows: [...] } (Phân trang)
             } else if (Array.isArray(rawData.medicines)) {
                 medList = rawData.medicines; // Trường hợp 3: medicines: [...]
             }
             
             // In ra console để kiểm tra (Bạn nhấn F12 -> Console để xem)
             console.log("Kho thuốc tải về:", medList.length, "thuốc. Mẫu thuốc đầu tiên:", medList[0]);

          } catch (err) {
             console.error("Lỗi API thuốc:", err);
          }
          
          // 4. Lấy lịch hẹn
          const res = await appointmentService.getAllAppointments({ 
              status: 'completed,confirmed', 
              limit: 50 
          });
          
          if (res.data.success) {
            const list = res.data.data
              .filter(a => a.MedicalRecord && a.MedicalRecord.prescription_json && a.MedicalRecord.prescription_json.length > 0)
              .map(a => {
                const isPaidAtClinic = a.payment_status === 'paid_at_clinic';

                // Map giá tiền
                const enrichedItems = a.MedicalRecord.prescription_json.map(item => {
                  const docDrugNameClean = cleanStr(item.name);
                  
                  // LOGIC TÌM KIẾM 3 LỚP (Chính xác -> Chứa -> Gần đúng)
                  let stockMed = medList.find(m => cleanStr(m.name) === docDrugNameClean);
                  
                  if (!stockMed) {
                      // Tìm nếu tên bác sĩ kê chứa tên thuốc kho (VD: "Thuốc Panadol" chứa "Panadol")
                      stockMed = medList.find(m => docDrugNameClean.includes(cleanStr(m.name)));
                  }
                  if (!stockMed) {
                      // Tìm ngược lại (VD: "Panadol" nằm trong "Panadol Extra")
                      stockMed = medList.find(m => cleanStr(m.name).includes(docDrugNameClean));
                  }

                  // Lấy giá. Nếu không tìm thấy thuốc -> Thử lấy giá bác sĩ nhập (nếu có) -> Mặc định 0
                  // Lưu ý: Kiểm tra cả trường 'price' và 'export_price' (giá bán)
                  const rawPrice = stockMed ? (stockMed.price || stockMed.export_price) : 0;
                  const unitPrice = parsePrice(rawPrice);
                  // Nếu không có số lượng thì mặc định là 1 để tính tiền ngay
                  const quantity = parseInt(item.quantity) || 1;
                  
                  return {
                    ...item,
                    original_name: item.name,
                    // Nếu tìm thấy thuốc thì lấy tên chuẩn, không thì giữ tên bác sĩ
                    name: stockMed ? stockMed.name : item.name, 
                    unit: stockMed ? stockMed.unit : (item.unit || 'Đvi'),
                    price: unitPrice, 
                    total: unitPrice * quantity,
                    found: !!stockMed // Đánh dấu là đã tìm thấy trong kho hay chưa
                  };
                });

                const totalAmount = enrichedItems.reduce((sum, i) => sum + i.total, 0);

                return {
                  id: a.MedicalRecord.id,
                  appointment_id: a.id,
                  patientName: a.guest_name || a.Patient?.User?.full_name || 'Khách lẻ',
                  patientCode: a.code,
                  gender: a.guest_gender || a.Patient?.User?.gender || '--',
                  diagnosis: a.MedicalRecord.diagnosis,
                  items: enrichedItems,
                  status: isPaidAtClinic ? 'sold' : 'pending',
                  total: totalAmount,
                  customerPaid: isPaidAtClinic ? totalAmount : 0
                };
              });
              
            setPrescriptions(list);
          }
        } catch (error) {
          console.error("Lỗi xử lý dữ liệu:", error);
        }
      };
      fetchData();
    }
  }, [activeTab, pharmacyTab]);
  // --- STATE BÁN LẺ MỚI ---
  const [showRetailForm, setShowRetailForm] = useState(false); // false: Xem danh sách, true: Đang tạo hóa đơn
  const [retailInvoices, setRetailInvoices] = useState([]);
  const [invoicePage, setInvoicePage] = useState(1);
  // --- STATE THANH TOÁN NÂNG CAO ---
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  // THÊM MỚI: Mã giao dịch duy nhất cho phiên thanh toán này
  const [transactionCode, setTransactionCode] = useState('');

  // Tự động sinh mã giao dịch khi mở form bán lẻ
  useEffect(() => {
    if (showRetailForm) {
      // Mã: REL + Timestamp (Ví dụ: REL1703829102)
      setTransactionCode(`REL${Date.now()}`);
    }
  }, [showRetailForm]);
  // --- STATE MỚI CHO QUY TRÌNH TIẾP ĐÓN THỰC TẾ ---
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    guest_name: '',
    guest_phone: '',
    guest_dob: '',
    guest_gender: 'Nam',
    service_id: '',
    doctor_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_start_time: '',
    reason: ''
  });
  const [walkInDoctors, setWalkInDoctors] = useState([]);
  const [walkInSlots, setWalkInSlots] = useState([]);
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);
  const [printData, setPrintData] = useState(null); // Dữ liệu để in phiếu
  // [MỚI] State cho Modal xem chi tiết dịch vụ
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  // [ĐÃ SỬA] Hàm mở chi tiết - Chuyển sang trang AppointmentDetailPage
  const openDetail = (appt) => {
    // Chuyển hướng sang đường dẫn: /lich-hen/AP-XXXXX
    // Đường dẫn này khớp với Route bạn đã khai báo trong App.js
    navigate(`/lich-hen/${appt.code}`);
  };
  const [showPrintModal, setShowPrintModal] = useState(false); // Modal in
  
  // Danh sách phân loại
  const [unpaidAppointments, setUnpaidAppointments] = useState([]); // Đặt online, chưa thanh toán
  const [paidAppointments, setPaidAppointments] = useState([]);     // Đã thanh toán/Miễn phí -> Chờ khám
  
  
  // [ĐÃ SỬA] Mặc định lấy ngày hôm nay
const [cashierFilter, setCashierFilter] = useState({ 
  date: new Date().toISOString().split('T')[0], 
  keyword: '',
  status: 'all' // <--- THÊM DÒNG NÀY: Mặc định lấy tất cả (chờ thu + đã thu)
});

  // Danh sách thực tế cho khu vực thu ngân (có thể khác với patients demo)
  const [cashierList, setCashierList] = useState([]);

  // [MỚI] State lưu người đang được gọi thủ công (để không bị kẹt ở số 1)
  const [manualCalling, setManualCalling] = useState(null);

  // [MỚI] Hàm xử lý gọi người tiếp theo
  // --- TÌM ĐOẠN NÀY (Khoảng dòng 173) ---
  // [ĐÃ SỬA] Logic gọi số tiếp theo thông minh hơn
  const handleCallNext = () => {
      // 1. Lấy danh sách những người CHƯA THANH TOÁN
      const waitingList = cashierList.filter(p => !['paid', 'paid_at_clinic', 'paid_online'].includes(p.payment_status));
      
      if (waitingList.length === 0) {
          toast.info("Không còn ai trong hàng chờ thanh toán!");
          setManualCalling(null);
          return;
      }

      // 2. Xác định ai đang được gọi hiện tại (Manual hoặc Selected hoặc Người đầu tiên)
      const current = manualCalling || selectedBill || waitingList[0];
      
      // 3. Tìm vị trí của người đó trong danh sách chờ
      const currentIndex = waitingList.findIndex(p => p.id === current.id);

      // 4. Nếu tìm thấy và không phải người cuối cùng -> Gọi người kế tiếp
      if (currentIndex !== -1 && currentIndex < waitingList.length - 1) {
          const nextPerson = waitingList[currentIndex + 1];
          setManualCalling(nextPerson); // Cập nhật người được gọi
          setSelectedBill(nextPerson);  // Tự động chọn luôn người đó để thu ngân thao tác ngay
          toast.info(`Đang mời: ${nextPerson.guest_name || nextPerson.Patient?.User?.full_name}`);
      } else {
          // Nếu đang ở cuối danh sách hoặc lỗi, quay về người đầu tiên
          setManualCalling(waitingList[0]);
          setSelectedBill(waitingList[0]);
          toast.info("Đã quay lại đầu danh sách chờ.");
      }
  };

  

  // Load dữ liệu thật khi vào tab Tiếp đón
  useEffect(() => {
    if (activeTab === 'reception') {
      loadReceptionData();
    }
  }, [activeTab]);



  // [MỚI] Hàm xử lý lùi/tiến ngày cho Thu ngân
const handleCashierPrevDay = () => {
  const current = new Date(cashierFilter.date || new Date());
  current.setDate(current.getDate() - 1);
  setCashierFilter({ ...cashierFilter, date: current.toISOString().split('T')[0] });
};

const handleCashierNextDay = () => {
  const current = new Date(cashierFilter.date || new Date());
  current.setDate(current.getDate() + 1);
  setCashierFilter({ ...cashierFilter, date: current.toISOString().split('T')[0] });
};

  const loadReceptionData = async () => {
    try {
      // Chuẩn bị params (Nếu ngày rỗng => Lấy tất cả, ngược lại lấy theo ngày)
      const params = {
        search: receptionFilter.keyword,
        limit: 100
      };
      
      if (receptionFilter.date) {
        params.date_from = receptionFilter.date;
        params.date_to = receptionFilter.date;
      }

      const res = await appointmentService.getAllAppointments(params);
      
      if (res.data.success) {
        let all = res.data.data;

        // [MỚI] Lọc theo trạng thái đã chọn (Chưa cấp / Đã cấp)
        if (receptionFilter.status === 'no_num') {
            all = all.filter(a => !a.payment_queue_number && !a.queue_number);
        } else if (receptionFilter.status === 'has_num') {
            all = all.filter(a => a.payment_queue_number || a.queue_number);
        }

        // 1. Phân loại Chưa thanh toán
        // 1. Phân loại CHỜ THANH TOÁN
        // Chờ thanh toán: chưa trả tiền hoặc trả tiền mặt tại quầy (cần xác nhận)
        const unpaid = all.filter(a =>
          ['pending', 'confirmed', 'upcoming', 'waiting_pay'].includes(a.status) &&
          a.payment_status === 'unpaid'
        ).sort((a,b) => {
            // LUÔN SẮP XẾP THEO GIỜ HẸN TĂNG DẦN (Để cột # hiển thị đúng trình tự thời gian)
            return (a.appointment_start_time || '').localeCompare(b.appointment_start_time || '');
        });
        setUnpaidAppointments(unpaid);
        // 2. Phân loại Chờ khám (Ưu tiên đã có số STT, sau đó đến giờ)
        const paid = all.filter(a => 
          ['confirmed', 'waiting_exam', 'paid'].includes(a.status) && 
          (a.payment_status === 'paid_online' || a.payment_status === 'not_required' || a.status === 'paid' || a.payment_queue_number)
        ).sort((a,b) => {
           // Nếu cả 2 có số -> so sánh số
           if (a.queue_number && b.queue_number) return a.queue_number - b.queue_number;
           // Nếu a có số -> a lên trước
           if (a.queue_number) return -1;
           if (b.queue_number) return 1;
           // Nếu chưa có số -> so sánh giờ
           return (a.appointment_start_time || '').localeCompare(b.appointment_start_time || '');
        });
        setPaidAppointments(paid);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // [SỬA] Tự động tải lại khi đổi ngày hoặc chuyển tab
  useEffect(() => {
    if (activeTab === 'reception') {
      loadReceptionData();
    }
  }, [activeTab, receptionFilter.date]); // Thêm dependency receptionFilter.date

  const loadCashierData = async () => {
    try {
      // [SỬA] Logic xác định status gửi lên server dựa vào bộ lọc
      let statusParam = 'waiting_pay'; 
      
      if (cashierFilter.status === 'all') {
         // Lấy cả: Chờ thanh toán + Đã xác nhận (đã thu) + Hoàn thành + Đang khám
         statusParam = 'waiting_pay,confirmed,completed,in_progress';
      } else if (cashierFilter.status === 'paid') {
         statusParam = 'confirmed,completed,in_progress';
      } else {
         statusParam = 'waiting_pay';
      }

      const res = await appointmentService.getAllAppointments({ 
        status: statusParam, 
        date_from: cashierFilter.date, 
        date_to: cashierFilter.date,
        search: cashierFilter.keyword, 
        limit: 100 
      });
      
      if (res.data.success) {
        // [SỬA] Sắp xếp: Ưu tiên đơn CHƯA THU lên đầu, ĐÃ THU xuống dưới
        const sortedList = res.data.data.sort((a, b) => {
           // Kiểm tra xem đơn đã thanh toán chưa
           const isPaidA = ['paid_at_clinic','paid_online','paid'].includes(a.payment_status) ? 1 : 0;
           const isPaidB = ['paid_at_clinic','paid_online','paid'].includes(b.payment_status) ? 1 : 0;
           
           // Nếu trạng thái thanh toán khác nhau: Chưa thu (0) lên trước Đã thu (1)
           if (isPaidA !== isPaidB) return isPaidA - isPaidB;
           
           // Nếu cùng trạng thái thì sắp xếp theo STT
           const sttA = a.payment_queue_number || 9999;
           const sttB = b.payment_queue_number || 9999;
           return sttA - sttB;
        });
        setCashierList(sortedList);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách thu ngân:", error);
    }
  };

  // Tự động tải lại khi đổi ngày hoặc chuyển tab
  useEffect(() => {
    if (activeTab === 'cashier') {
      loadCashierData();
    }
  }, [activeTab, cashierFilter.date]); // Khi đổi ngày -> tự động load

  useEffect(() => {
    if (activeTab === 'pharmacy' && pharmacyTab === 'retail') {
      const fetchMedicines = async () => {
        try {
          const token = localStorage.getItem('token');
          // Gọi API lấy danh sách thuốc thật từ database
          const res = await axios.get('http://localhost:3001/api/pharmacy/medicines?limit=100', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.success) {
            setMedicinesList(res.data.medicines);
          }
        } catch (error) {
          console.error("Lỗi tải thuốc:", error);
        }
      };
      fetchMedicines();
    }
  }, [activeTab, pharmacyTab]);

  // Fetch danh sách hóa đơn bán lẻ
  useEffect(() => {
    if (activeTab === 'pharmacy' && pharmacyTab === 'retail' && !showRetailForm) {
      fetchRetailInvoices();
    }
  }, [activeTab, pharmacyTab, showRetailForm, invoicePage]);

  const fetchRetailInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:3001/api/payments/pharmacy/retail?page=${invoicePage}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setRetailInvoices(res.data.invoices);
      }
    } catch (error) {
      console.error("Lỗi tải hóa đơn:", error);
    }
  };
  // ----------------------------------------

  // --- HELPERS ---
  const formatMoney = (n) => n ? n.toLocaleString() + ' đ' : '0 đ';
  
  // --- HANDLERS: RECEPTION ---
  const resetRegForm = () => {
    setRegForm({ name: '', phone: '', birth: '', gender: 'Nam', cccd: '', address: '', symptoms: '', serviceId: '', roomId: '' });
    setEditingPatient(null);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!regForm.name || !regForm.serviceId) return toast.warning('Vui lòng nhập tên và chọn dịch vụ!');

    // Logic chọn phòng tự động nếu chưa chọn
    let assignedRoom = regForm.roomId;
    if (!assignedRoom) {
       // Mock logic: map service to room
       const svc = SERVICES.find(s => s.id === regForm.serviceId);
       if(svc.id === 'S01') assignedRoom = 'P.101 - Khám Nội';
       else if(svc.id === 'S02') assignedRoom = 'P.201 - Nhi Khoa';
       else assignedRoom = 'P.202 - Siêu Âm';
    }

    if (editingPatient) {
      // Cập nhật thông tin
      setPatients(patients.map(p => p.id === editingPatient.id ? { ...p, ...regForm, room: assignedRoom } : p));
      toast.success('Cập nhật thông tin thành công!');
    } else {
      // Tạo mới
      const newPatient = {
        id: Date.now(),
        code: `BN${Date.now().toString().slice(-6)}`,
        ...regForm,
        room: assignedRoom,
        status: 'waiting_exam',
        createdAt: new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})
      };
      setPatients([newPatient, ...patients]);
      toast.success('Đăng ký tiếp đón thành công! Đã in phiếu.');
    }
    resetRegForm();
  };

  const handleEditPatient = (p) => {
    setEditingPatient(p);
    setRegForm({
      name: p.name, phone: p.phone, birth: p.birth, gender: p.gender, cccd: p.cccd || '', address: p.address || '',
      symptoms: p.symptoms, serviceId: p.serviceId, roomId: '' // Không sửa room trực tiếp ở đây demo
    });
  };

  // --- HANDLERS: WALK-IN REGISTRATION ---
  const loadWalkInDoctors = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3001/api/users/by-role?role=doctor&limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalkInDoctors(res.data.users || res.data.data || []);
    } catch (e) { console.error('Load doctors error:', e); }
  };

  useEffect(() => {
    if (showNewPatientForm) loadWalkInDoctors();
  }, [showNewPatientForm]);

  const loadWalkInSlots = async (doctorId, serviceId, date) => {
    if (!doctorId || !serviceId || !date) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `http://localhost:3001/api/appointments/available-slots?doctor_id=${doctorId}&service_id=${serviceId}&date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setWalkInSlots(res.data.data?.raw || []);
      }
    } catch (e) { setWalkInSlots([]); }
  };

  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    if (!walkInForm.guest_name || !walkInForm.guest_phone || !walkInForm.service_id || !walkInForm.doctor_id || !walkInForm.appointment_start_time) {
      return toast.warning('Vui lòng điền đầy đủ thông tin bắt buộc!');
    }
    setWalkInSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:3001/api/appointments/walk-in', walkInForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success(`Đăng ký thành công! Số TT: ${res.data.data?.payment_queue_number}`);
        setShowNewPatientForm(false);
        setWalkInForm({
          guest_name: '', guest_phone: '', guest_dob: '', guest_gender: 'Nam',
          service_id: '', doctor_id: '', appointment_date: new Date().toISOString().split('T')[0],
          appointment_start_time: '', reason: ''
        });
        setWalkInSlots([]);
        loadReceptionData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi đăng ký');
    } finally {
      setWalkInSubmitting(false);
    }
  };

  // --- HANDLERS: CASHIER ---
  // --- [SỬA HÀM handlePayment] ---
const handlePayment = async () => {
    if (!selectedBill) return;
    
    const totalAmount = selectedBill.Service?.price || 0;
    const received = parseInt(paymentAmount);
    
    if (isNaN(received) || received < totalAmount) {
      return toast.error('Số tiền khách đưa không đủ!');
    }

    try {
        const token = localStorage.getItem('token');
        
        // [QUAN TRỌNG]: Đổi sang gọi API tạo thanh toán (POST /payments)
        // Thay vì gọi PUT /appointments
        const res = await axios.post(`http://localhost:3001/api/payments`, {
            appointment_id: selectedBill.id, 
            payment_method: paymentMethod, // <--- ĐÃ SỬA: Dùng biến state paymentMethod
            amount: totalAmount,
            // Gửi thông tin chi tiết tiền thừa
            payment_info: {
                amount_received: paymentMethod === 'cash' ? received : totalAmount,             
                change_amount: paymentMethod === 'cash' ? (received - totalAmount) : 0, 
                cashier_name: user?.full_name || 'Thu Ngân',              
                method_detail: paymentMethod === 'cash' ? 'Tiền mặt tại quầy' : 'Chuyển khoản ngân hàng'
            }
        }, { headers: { Authorization: `Bearer ${token}` } });

        if (res.data.success) {
            toast.success(`Thu tiền thành công! Trả lại: ${formatMoney(received - totalAmount)}`);
            setPaymentAmount('');
            
            // Cập nhật lại trạng thái local ngay lập tức để UI đổi màu xanh
            // --- [SỬA] CẤU HÌNH DỮ LIỆU ĐỂ IN NGAY LẬP TỨC ---
            // [SỬA] Thêm printType: 'invoice'
            // --- [SỬA] Cấu trúc dữ liệu để in hóa đơn đầy đủ ---
            const printDataObj = {
                ...selectedBill,
                payment_status: 'paid_at_clinic',
                printType: 'invoice',
                // Thêm thông tin Phòng khám
                clinicInfo: {
                    name: "PHÒNG KHÁM ĐA KHOA CLINIC SYSTEM",
                    address: "123 Đường Sức Khỏe, Quận 1, TP.HCM",
                    phone: "1900 1234"
                },
                PaymentDetails: {
                    method: 'cash',
                    transaction_id: `POS-${Date.now()}`,
                    date: new Date(),
                    info: {
                        amount_received: received,             // Tiền khách đưa
                        change_amount: received - totalAmount, // Tiền thối lại
                        cashier_name: user?.full_name || 'Thu Ngân', // Tên thu ngân
                        method_detail: 'Tiền mặt'
                    }
                }
            };
            setPrintData(printDataObj);
            setShowPrintModal(true);
            
            // Cập nhật trạng thái UI
            const updatedBill = { ...selectedBill, payment_status: 'paid_at_clinic' };
            setSelectedBill(updatedBill);
            setManualCalling(null); 
            loadCashierData();
        }
    } catch (error) {
        console.error(error);
        toast.error(error.response?.data?.message || 'Lỗi khi thanh toán');
    }
};
  // --- HANDLERS: PHARMACY ---
  // 1. Bán theo đơn bác sĩ
  // --- [SỬA] Xử lý thanh toán đơn thuốc Bác sĩ ---
  const handlePrescriptionPayment = async () => {
    if(!selectedPrescription) return;
    
    // Validate tiền nong (nếu cần)
    // const received = parseInt(paymentAmount);
    // if (received < selectedPrescription.total) return toast.error('Tiền thiếu!');

    try {
        const token = localStorage.getItem('token');
        // Gọi API cập nhật trạng thái thanh toán cho Lịch hẹn này
        const res = await axios.put(`http://localhost:3001/api/appointments/${selectedPrescription.appointment_id}/payment`, {
            payment_status: 'paid_at_clinic',
            payment_method: paymentMethod, // 'cash' hoặc 'transfer'
            amount: selectedPrescription.total
        }, { headers: { Authorization: `Bearer ${token}` } });

        if (res.data.success) {
            toast.success('Thanh toán & Xuất thuốc thành công!');
            
            // Cập nhật lại danh sách local để hiện trạng thái "Đã bán"
            setPrescriptions(prescriptions.map(pr => 
                pr.id === selectedPrescription.id ? {...pr, status: 'sold'} : pr
            ));
            
            // Cập nhật đơn đang chọn để UI hiển thị nút "Đã thanh toán"
            setSelectedPrescription(prev => ({...prev, status: 'sold'}));
            
            setPaymentAmount('');
        }
    } catch (error) {
        console.error(error);
        toast.error('Lỗi khi thanh toán đơn thuốc');
    }
  };

  // Xử lý kiểm tra mã giảm giá
  const handleCheckDiscount = async () => {
    if (!discountCode.trim()) return;
    const total = retailCart.reduce((s, i) => s + i.price * i.qty, 0);
    try {
      const token = localStorage.getItem('token');
      // Gọi API checkDiscount vừa viết ở bước 1
      const res = await axios.post('http://localhost:3001/api/payment/pharmacy/discount', {
        code: discountCode,
        totalAmount: total
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setAppliedDiscount(res.data.discount);
        toast.success(`Đã áp dụng mã giảm: -${formatMoney(res.data.discount.discountAmount)}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Mã giảm giá không hợp lệ');
      setAppliedDiscount(null);
    }
  };
  const handleRetailCheckout = async () => {
    const total = retailCart.reduce((s, i) => s + i.price * i.qty, 0);
    const discountAmt = appliedDiscount ? appliedDiscount.discountAmount : 0;
    const finalAmount = total - discountAmt;

    // Validate thanh toán tiền mặt
    if (paymentMethod === 'cash') {
       const received = parseInt(paymentAmount) || 0;
       if (received < finalAmount) return toast.error('Tiền khách đưa chưa đủ!');
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:3001/api/payment/pharmacy/retail', {
        items: retailCart,
        customer: retailCustomer,
        total_amount: total,
        final_amount: finalAmount,
        discount_info: appliedDiscount,
        payment_method: paymentMethod,
        code: transactionCode // <--- GỬI MÃ GIAO DỊCH LÊN SERVER
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success(`Xuất hóa đơn thành công! Mã: ${res.data.invoice.code}`);
        // Reset toàn bộ form
        setRetailCart([]);
        setPaymentAmount('');
        setRetailCustomer({ name: '', phone: '', address: '', note: '' });
        setDiscountCode('');
        setAppliedDiscount(null);
        setPaymentMethod('cash');
        setShowRetailForm(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi thanh toán');
    }
  };

  // --- HANDLER: CHECK-IN & IN PHIẾU ---
  // --- HANDLER: CHECK-IN & IN PHIẾU ---
  const handleCheckIn = async (appt, type) => {
    try {
      const res = await appointmentService.checkIn(appt.code, type);
      if (res.data.success) {
        toast.success(res.data.message);
        // [SỬA] Thêm printType: 'ticket' để Modal biết đây là phiếu số
        setPrintData({ ...res.data.data, printType: 'ticket' }); 
        setShowPrintModal(true);     
        loadReceptionData();         
      }
    } catch (error) {
      toast.error('Lỗi check-in: ' + (error.response?.data?.message || 'Vui lòng thử lại'));
    }
  };

  // --- THÊM ĐOẠN NÀY VÀO TRƯỚC DÒNG: // --- RENDERS --- (Khoảng dòng 485)

  // Hàm hủy tiếp đón
  const handleCancelAppt = async (apptId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lượt tiếp đón này không?')) return;
    try {
      const token = localStorage.getItem('token');
      // Giả định API hủy
      await axios.put(`http://localhost:3001/api/appointments/${apptId}/cancel`, {}, {
         headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Đã hủy thành công');
      loadReceptionData(); // Tải lại danh sách
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi hủy');
    }
  };

  // --- CA LÀM VIỆC ---
  const handleShiftSubmit = async ({ amount, note, difference, shift_config_id }) => {
    try {
      const token = localStorage.getItem('token');
      if (modalMode === 'start') {
        const res = await axios.post('http://localhost:3001/api/work-shifts/cashier/start', {
          opening_cash: amount,
          opening_note: note,
          shift_config_id: shift_config_id || null
        }, { headers: { Authorization: `Bearer ${token}` } });

        if (res.data.success) {
          toast.success(res.data.message);
          setShift(res.data.data);
          setShowShiftModal(false);
        }
      } else {
        const res = await axios.post('http://localhost:3001/api/work-shifts/cashier/end', {
          closing_cash_actual: amount,
          closing_note: note
        }, { headers: { Authorization: `Bearer ${token}` } });

        if (res.data.success) {
          const { summary } = res.data.data;
          toast.success(res.data.message);
          setShift(null);
          setShowShiftModal(false);
          // Hiển thị tóm tắt ca
          toast.info(
            `Tổng doanh thu: ${summary.revenue_cash.toLocaleString('vi-VN')}đ (TM) + ${summary.revenue_transfer.toLocaleString('vi-VN')}đ (CK) · ${summary.total_transactions} giao dịch`,
            { autoClose: 8000 }
          );
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi xử lý ca làm việc');
    }
  };

  // Load ca hiện tại khi vào trang cashier
  useEffect(() => {
    if (activeTab === 'cashier') {
      const loadCurrentShift = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get('http://localhost:3001/api/work-shifts/cashier/current', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.success && res.data.data) {
            setShift(res.data.data);
          }
        } catch (e) { /* Chưa mở ca */ }
      };
      loadCurrentShift();
    }
  }, [activeTab]);

  // --- RENDERS ---
  
  // --- GIAO DIỆN TIẾP ĐÓN: COMPACT & PASTEL THEME ---
  const renderReception = () => {
    return (
    <div className="frdeskpage-content" > {/* Nền xanh rất nhạt */}
      
      {/* 1. HEADER ACTIONS */}
      <div className="frdeskpage-flex-between frdeskpage-mb-8">
          <div className="frdeskpage-flex frdeskpage-gap-4">
            <button 
              className={`frdeskpage-btn frdeskpage-btn-sm ${receptionTab === 'payment' ? 'frdeskpage-btn-primary' : 'frdeskpage-btn-secondary'}`}
              onClick={() => setReceptionTab('payment')}
            >
              <FaMoneyBillWave/> CHỜ LẤY SỐ TT <span className="frdeskpage-badge-num frd-ml6">{unpaidAppointments.length}</span>
            </button>
            <button 
              className={`frdeskpage-btn frdeskpage-btn-sm ${receptionTab === 'exam' ? 'frdeskpage-btn-primary' : 'frdeskpage-btn-secondary'}`}
              onClick={() => setReceptionTab('exam')}
            >
              <FaStethoscope/> DANH SÁCH CHỜ KHÁM <span className="frdeskpage-badge-num frd-ml6">{paidAppointments.length}</span>
            </button>
          </div>

          <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-sm" onClick={() => setShowNewPatientForm(true)}>
            <FaUserPlus/> Đăng ký mới
          </button>
      </div>

      {/* 2. THANH BỘ LỌC (COMPACT) */}
      <div className="frdeskpage-toolbar frdeskpage-mb-8">
             <div className="frdeskpage-date-nav">
                <span className="frdeskpage-date-nav-icon"><FaCalendarAlt/></span>
                <input 
                  type="date" 
                  className="frdeskpage-input"
                  value={receptionFilter.date}
                  onChange={(e) => setReceptionFilter({...receptionFilter, date: e.target.value})}
                />
             </div>

             <select 
                className="frdeskpage-select frd-w150"
                value={receptionFilter.status}
                onChange={(e) => setReceptionFilter({...receptionFilter, status: e.target.value})}
             >
                <option value="all">Tất cả hồ sơ</option>
                <option value="no_num">Chưa cấp số</option>
                <option value="has_num">Đã cấp số</option>
             </select>

             <div className="frdeskpage-search frdeskpage-flex-1">
                <input 
                  type="text" 
                  className="frdeskpage-input frdeskpage-flex-1"
                  placeholder="Tìm kiếm bệnh nhân (Tên, Mã, SĐT)..."
                  value={receptionFilter.keyword}
                  onChange={(e) => setReceptionFilter({...receptionFilter, keyword: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && loadReceptionData()}
                />
                <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-sm" onClick={loadReceptionData}><FaSearch/> Tìm</button>
                <button className="frdeskpage-btn frdeskpage-btn-secondary frdeskpage-btn-sm" onClick={() => { setReceptionFilter({date: new Date().toISOString().split('T')[0], keyword: '', status: 'all'}); loadReceptionData(); }}><FaUndo/> Tải lại</button>
             </div>
      </div>

      {/* 3. BẢNG DỮ LIỆU & VÙNG LẤY SỐ (2 CỘT) */}
      <div className="frd-reception-grid">
        
        {/* CỘT TRÁI: BẢNG DANH SÁCH */}
        <div className="frdeskpage-panel frdeskpage-flex-1">
          <div className="frdeskpage-panel-body">
            <table className="frdeskpage-table frdeskpage-table-compact">
              <thead >
                <tr>
                  <th className="frd-th-idx">#</th>
                  <th className="frd-th-code">Mã HS</th>
                  <th className="frd-th-stt">STT</th>
                  <th className="frd-th-name">Họ tên bệnh nhân</th>
                  <th className="frd-th-dob">Năm sinh</th>
                  <th className="frd-th-phone">SĐT</th>
                  <th>Dịch vụ đăng ký</th>
                  <th className="frd-th-time">Giờ</th>
                  <th className="frd-tc frd-th-status">Trạng thái</th>
                  <th className="frd-tr frd-th-action">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(receptionTab === 'payment' ? unpaidAppointments : paidAppointments).map((appt, index) => {
                   // Logic hiển thị STT (Số phiếu)
                   let sttDisplay = null;
                   if (receptionTab === 'payment' && appt.payment_queue_number) sttDisplay = appt.payment_queue_number;
                   if (receptionTab === 'exam' && appt.queue_number) sttDisplay = appt.queue_number;

                   return (
                   <tr key={appt.id} className="frd-tr-sm">
                     <td className="frd-tc frd-gray-bold">{index + 1}</td>
                     <td><span className="frd-code-green">{appt.code}</span></td>
                     <td className="frd-tc">
                        {sttDisplay ? (
                            <span className="frdeskpage-badge frdeskpage-badge-pill frdeskpage-badge-green">{sttDisplay}</span>
                        ) : (
                            <span className="frdeskpage-badge frdeskpage-badge-gray">Chưa có</span>
                        )}
                     </td>
                     <td className="frd-fw-700 frd-uppercase">
                        {appt.guest_name || appt.Patient?.User?.full_name}
                     </td>
                     <td className="frd-gray-text">
                        {appt.guest_dob ? new Date(appt.guest_dob).getFullYear() : (appt.Patient?.User?.dob ? new Date(appt.Patient.User.dob).getFullYear() : '--')}
                     </td>
                     <td>{appt.guest_phone || appt.Patient?.User?.phone}</td>
                     <td>
                       <div className="frd-service-cell" title={appt.Service?.name}>
                          {appt.Service?.name}
                       </div>
                     </td>
                     <td className="frd-fw-700 frd-mono">{appt.appointment_start_time?.slice(0,5)}</td>
                     <td className="frd-tc">
                       {receptionTab === 'payment' ? (
                          sttDisplay 
                          ? <span className="frdeskpage-badge frdeskpage-badge-pill frdeskpage-badge-amber">Chờ thanh toán</span>
                          : <span className="frdeskpage-badge frdeskpage-badge-pill frdeskpage-badge-gray">Mới tiếp nhận</span>
                       ) : (
                          <span className="frdeskpage-badge frdeskpage-badge-pill frdeskpage-badge-blue">Chờ khám</span>
                       )}
                     </td>
                     <td className="frd-tr">
                       <div className="frdeskpage-flex-end frdeskpage-gap-2">
                           {!sttDisplay ? (
                               <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-xs frd-btn-action"
                                  onClick={() => handleCheckIn(appt, receptionTab === 'payment' ? 'payment' : 'clinical')}>
                                  <FaTicketAlt /> CẤP SỐ
                               </button>
                           ) : (
                               <button className="frdeskpage-btn frdeskpage-btn-ghost frdeskpage-btn-xs frd-btn-action"
                                  onClick={() => {
                                      setPrintData({ 
                                          ...appt, 
                                          printType: 'ticket',
                                          payment_queue_number: receptionTab === 'payment' ? appt.payment_queue_number : null,
                                          queue_number: receptionTab === 'exam' ? appt.queue_number : null
                                      }); 
                                      setShowPrintModal(true);
                                  }}>
                                  <FaPrint /> IN LẠI
                               </button>
                           )}
                           <button className="frdeskpage-btn frdeskpage-btn-danger frdeskpage-btn-xs frd-btn-icon-sm"
                              onClick={(e) => { e.stopPropagation(); handleCancelAppt(appt.id); }} title="Hủy">
                               <FaTrash size={10}/>
                           </button>
                       </div>
                     </td>
                   </tr>
                )})}
                
                {(receptionTab === 'payment' ? unpaidAppointments : paidAppointments).length === 0 && (
                  <tr>
                      <td colSpan="10" className="frd-empty-cell">
                          <span>Không có dữ liệu cho ngày {new Date(receptionFilter.date).toLocaleDateString('vi-VN')}</span>
                      </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="frdeskpage-panel-footer frdeskpage-text-muted frd-tr">
              Tổng số: <strong>{(receptionTab === 'payment' ? unpaidAppointments : paidAppointments).length}</strong> hồ sơ
          </div>
        </div>

        {/* CỘT PHẢI: VÙNG LẤY SỐ (TICKET AREA) */}
        <div className="frdeskpage-panel frd-ticket-panel">
          <div className="frdeskpage-panel-header">
            <FaTicketAlt/>
            <h6 className="frd-panel-h6">Lấy Số</h6>
          </div>
          <div className="frd-ticket-body">
            {(receptionTab === 'payment' ? unpaidAppointments : paidAppointments).length > 0 ? (
              <>
                <div className="frd-next-ticket-box">
                  <div className="frd-next-ticket-label">Khách tiếp theo</div>
                  <div className="frd-next-ticket-num">
                    {((receptionTab === 'payment' ? unpaidAppointments : paidAppointments)[0]?.payment_queue_number || (receptionTab === 'payment' ? unpaidAppointments : paidAppointments)[0]?.queue_number) || '--'}
                  </div>
                </div>
                <div className="frd-next-ticket-customer">
                  <strong>Khách hàng:</strong> {((receptionTab === 'payment' ? unpaidAppointments : paidAppointments)[0]?.guest_name || (receptionTab === 'payment' ? unpaidAppointments : paidAppointments)[0]?.Patient?.User?.full_name) || 'N/A'}
                </div>
                <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-full frd-ticket-call-btn">
                  <FaCheckCircle/> Gọi khách
                </button>
              </>
            ) : (
              <div className="frd-ticket-empty">
                <div className="frd-ticket-empty-num">--</div>
                <div className="frd-ticket-empty-text">Không có khách chờ</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    );
  }

  // 2. CASHIER VIEW (THU NGÂN) - ĐÃ KẾT NỐI API THẬT
  const renderCashier = () => {
    // Lấy khách hàng đang được chọn hoặc người đầu tiên trong hàng đợi để hiển thị "Đang gọi"
    // [SỬA] Logic ưu tiên hiển thị đúng người đang gọi
    const firstUnpaid = cashierList.find(p => !['paid', 'paid_at_clinic', 'paid_online'].includes(p.payment_status));
    const currentCalling = manualCalling || selectedBill || firstUnpaid || cashierList[0];

    return (
    <div className="frdeskpage-content frdeskpage-layout-split">
       {/* CỘT TRÁI: DANH SÁCH CHỜ */}
       <div className="frdeskpage-panel">
          
          {/* [SỬA] Ô GỌI SỐ CÓ NÚT NEXT */}
          {/* CALL BOX MỚI */}
          <div className="frdeskpage-call-box">
            <div>
              <div className="frdeskpage-call-label">
                <FaHospital className="frd-mr5"/> Đang mời thanh toán
              </div>
              <div className="frdeskpage-call-name">
                {currentCalling
                  ? `${currentCalling.payment_queue_number ? 'Số ' + currentCalling.payment_queue_number + ' — ' : ''}${currentCalling.guest_name || currentCalling.Patient?.User?.full_name}`
                  : '— Chưa có khách —'}
              </div>
              <div className="frdeskpage-call-sub">
                {currentCalling ? `Mã hồ sơ: ${currentCalling.code}` : 'Hàng đợi trống'}
              </div>
            </div>
            <div className="frd-call-right">
              <div className="frd-tc">
                <div className="frdeskpage-call-number">{currentCalling?.payment_queue_number || '--'}</div>
                <div className="frdeskpage-call-counter">Quầy 1</div>
              </div>
              <button className="frdeskpage-next-btn" onClick={handleCallNext} title="Mời số tiếp theo">
                <FaArrowRight /> GỌI TIẾP
              </button>
            </div>
          </div>

          <div className="frdeskpage-panel-header">
             <span><FaMoneyBillWave /> DANH SÁCH CHỜ ({cashierList.length})</span>
          </div>

          {/* [MỚI] THANH CÔNG CỤ LỌC (Ngày tháng & Tìm kiếm) */}
          {/* [ĐÃ SỬA] THANH CÔNG CỤ LỌC: Có mũi tên, icon lịch, nút Tất cả */}
          <div className="frdeskpage-toolbar">
          {/* Date navigator */}
          <div className="frdeskpage-date-nav">
            <button onClick={handleCashierPrevDay} title="Ngày trước"><FaChevronLeft size={10}/></button>
            <input
              type="date"
              value={cashierFilter.date}
              onChange={e => setCashierFilter({...cashierFilter, date: e.target.value})}
            />
            <button onClick={handleCashierNextDay} title="Ngày sau"><FaChevronRight size={10}/></button>
          </div>
        
          {/* Status filter */}
          <select
            className="frdeskpage-select frd-select-cashier"
            value={cashierFilter.status}
            onChange={e => setCashierFilter({...cashierFilter, status: e.target.value})}
          >
            <option value="all">Tất cả hồ sơ</option>
            <option value="unpaid">Chờ thu tiền</option>
            <option value="paid">Đã thu tiền</option>
          </select>
        
          {/* Search */}
          <div className="frdeskpage-search">
            <FaSearch size={11} className="frd-search-icon"/>
            <input
              placeholder="Tên BN, Mã hồ sơ, SĐT..."
              value={cashierFilter.keyword}
              onChange={e => setCashierFilter({...cashierFilter, keyword: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && loadCashierData()}
            />
          </div>
          <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-sm" onClick={loadCashierData}>
            Tìm
          </button>
        </div>

          <div className="frdeskpage-panel-body frd-p0">
             <table className="frdeskpage-table">
                <thead>
                    <tr>
                        <th className="frd-w50">STT</th>
                        <th className="frd-w100">Mã HS</th>
                        <th>Họ tên</th>
                        <th className="frd-w80">Giờ</th>
                        <th>Bác sĩ</th>
                        <th>Dịch vụ</th>
                        <th className="frd-tr">Số tiền</th>
                        <th className="frd-tc">Trạng thái</th>
                        <th className="frd-tr">Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                   {cashierList.map((p, index) => {
                    const isPaid = ['paid_at_clinic', 'paid_online', 'paid'].includes(p.payment_status);
                    return (
                    <tr key={p.id} 
                        className={`${selectedBill?.id === p.id ? 'active' : ''} ${isPaid ? 'frd-row-paid' : ''} frd-row-click`}
                        onClick={() => setSelectedBill(p)} 
                    >
                        <td>
                            <span className={`frdeskpage-badge ${isPaid ? 'frdeskpage-badge-gray' : 'frdeskpage-badge-num'}`}>
                              {index + 1}
                            </span>
                        </td>
                        <td><span className="frd-fw-700">{p.code}</span></td>
                        <td>{p.guest_name || p.Patient?.User?.full_name}</td>
                        <td>
                          <div className="frd-fw-700 frd-fs11">{p.appointment_start_time?.slice(0, 5)}</div>
                        </td>
                        <td>
                          <div className="frd-doctor-name">{p.Doctor?.user?.full_name || 'Chưa chỉ định'}</div>
                        </td>
                        <td><span className="frd-fs10">{p.Service?.name}</span></td>
                        <td className={`frd-tr frd-fw-700 frd-mono ${isPaid ? 'frd-green-text' : 'frd-red-text'}`}>
                            {formatMoney(p.Service?.price)}
                        </td>
                        <td className="frd-tc">
                            {isPaid ? (
                                <span className="frdeskpage-badge frdeskpage-badge-pill frdeskpage-badge-green">Đã thu tiền</span>
                            ) : (
                                <span className="frdeskpage-badge frdeskpage-badge-amber">Chờ thu</span>
                            )}
                        </td>
                        <td>
                          <div className="frdeskpage-flex-end frdeskpage-gap-2">
                              <button 
                                className="frdeskpage-btn frdeskpage-btn-ghost frdeskpage-btn-xs"
                                onClick={(e) => { e.stopPropagation(); openDetail(p); }}
                                title="Xem chi tiết"
                              >
                                <FaInfoCircle />
                              </button>
                              
                              {isPaid ? (
                                  <button 
                                    className="frdeskpage-btn frdeskpage-btn-ghost frdeskpage-btn-xs"
                                    onClick={async (e) => { 
                                    e.stopPropagation();
                                    try {
                                        const token = localStorage.getItem('token');
                                        const res = await axios.get(`http://localhost:3001/api/payments/appointment/${p.id}`, {
                                            headers: { Authorization: `Bearer ${token}` }
                                        });
                                        let finalPrintData = { 
                                            ...p,
                                            payment_status: 'paid_at_clinic',
                                            printType: 'invoice'
                                        };
                                        if (res.data.success && res.data.data) {
                                            const rawInfo = res.data.data.payment_info;
                                            const infoObj = (typeof rawInfo === 'string') ? JSON.parse(rawInfo) : rawInfo;
                                            finalPrintData.PaymentDetails = {
                                                ...res.data.data,
                                                info: infoObj || { amount_received: p.Service?.price, change_amount: 0 }
                                            };
                                        } else {
                                            finalPrintData.PaymentDetails = {
                                                method: 'cash',
                                                transaction_id: `OFFLINE-${p.id}`,
                                                info: { amount_received: p.Service?.price, change_amount: 0 }
                                            };
                                        }
                                        setPrintData(finalPrintData);
                                        setShowPrintModal(true);
                                    } catch (err) {
                                        console.error("Lỗi lấy thông tin in:", err);
                                        setPrintData({
                                            ...p, 
                                            payment_status: 'paid_at_clinic',
                                            PaymentDetails: { method: 'cash', info: { amount_received: p.Service?.price, change_amount: 0 } }
                                        }); 
                                        setShowPrintModal(true); 
                                    }
                                }}
                                  >
                                    <FaPrint /> In HĐ
                                  </button>
                                ) : (
                                  <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-sm">
                                    Thu tiền
                                  </button>
                              )}
                          </div>
                        </td>
                    </tr>
                  )})}
                  
                   {cashierList.length === 0 && (
                      <tr><td colSpan="9" className="frd-empty-cell">Không tìm thấy dữ liệu phù hợp</td></tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       {/* CỘT PHẢI: FORM THANH TOÁN */}
       <div className="frdeskpage-panel">
          <div className="frdeskpage-panel-header frd-panel-header-flex">
              <span>THÔNG TIN THANH TOÁN</span>
              {selectedBill && (
                  <button 
                      className="frdeskpage-btn frdeskpage-btn-danger frd-close-btn"
                      onClick={() => setSelectedBill(null)}
                      title="Đóng bảng thanh toán"
                  >×</button>
              )}
          </div>
          <div className="frdeskpage-panel-body">
            {selectedBill ? (
              <div className="frdeskpage-payment-body">
          
                {/* Header bệnh nhân */}
                <div className="frd-bill-patient-header">
                  <div className="frdeskpage-queue-num">{selectedBill.payment_queue_number || '--'}</div>
                  <div className="frdeskpage-patient-name">{selectedBill.guest_name || selectedBill.Patient?.User?.full_name}</div>
                  <div className="frdeskpage-patient-code">{selectedBill.code}</div>
                  {['paid','paid_at_clinic','paid_online'].includes(selectedBill.payment_status) && (
                    <span className="frdeskpage-badge frdeskpage-badge-pill frdeskpage-badge-green frd-mt6">
                      <FaCheckCircle size={9}/> Đã thanh toán
                    </span>
                  )}
                </div>
          
                {/* Thông tin dịch vụ */}
                <div className="frd-service-info-box">
                  <div className="frdeskpage-bill-row">
                    <span className="frd-bill-label">Dịch vụ</span>
                    <span className="frd-bill-val-svc">{selectedBill.Service?.name}</span>
                  </div>
                  <div className="frdeskpage-bill-row">
                    <span className="frd-bill-label">Bác sĩ</span>
                    <span className="frd-bill-val-doc">{selectedBill.Doctor?.user?.full_name || '—'}</span>
                  </div>
                  <div className="frdeskpage-bill-row">
                    <span className="frd-bill-label">Giờ khám</span>
                    <span className="frd-bill-val-time">{selectedBill.appointment_start_time?.slice(0,5)}</span>
                  </div>
                </div>
          
                {/* Tổng tiền */}
                <div className="frdeskpage-bill-total">
                  <span className="frdeskpage-bill-total-label">Tổng cộng</span>
                  <span className="frdeskpage-bill-total-amount">{formatMoney(selectedBill.Service?.price)}</span>
                </div>
          
                {!['paid','paid_at_clinic','paid_online'].includes(selectedBill.payment_status) ? (
                  <>
                    {/* Mã giảm giá */}
                    <div className="frd-section-block">
                      <div className="frd-section-label">Voucher / Mã giảm giá</div>
                      <div className="frd-voucher-row">
                        <input className="frdeskpage-input" placeholder="Nhập mã..." value={discountCode} onChange={e => setDiscountCode(e.target.value)}/>
                        <button className="frdeskpage-btn frdeskpage-btn-outline frdeskpage-btn-sm frd-shrink-0" onClick={() => toast.info('Đang cập nhật')}>
                          <FaTag/>
                        </button>
                      </div>
                    </div>
          
                    <div className="frdeskpage-divider"/>
          
                    {/* Phương thức */}
                    <div className="frd-section-block">
                      <div className="frd-section-label">Phương thức</div>
                      <div className="frdeskpage-method-switcher">
                        <button className={`frdeskpage-method-btn ${paymentMethod==='cash'?'active':''}`} onClick={() => setPaymentMethod('cash')}>
                          <FaMoneyBillWave size={11}/> Tiền mặt
                        </button>
                        <button className={`frdeskpage-method-btn ${paymentMethod==='transfer'?'active':''}`} onClick={() => setPaymentMethod('transfer')}>
                          <FaQrcode size={11}/> Chuyển khoản
                        </button>
                      </div>
                    </div>
          
                    {/* Tiền khách đưa */}
                    {paymentMethod === 'cash' ? (
                      <div className="frd-section-block">
                        <div className="frd-section-label">Tiền khách đưa</div>
                        <input
                          type="number"
                          className="frdeskpage-input frd-cash-input"
                          value={paymentAmount}
                          onChange={e => setPaymentAmount(e.target.value)}
                          placeholder="0"
                          autoFocus
                        />
                        {paymentAmount && (
                          <div className="frdeskpage-change-box frd-mt6">
                            <span className="frd-change-label">Trả lại</span>
                            <span className="frd-change-val">
                              {formatMoney(Math.max(0, parseInt(paymentAmount) - (selectedBill.Service?.price || 0)))}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="frd-transfer-info">
                        <FaInfoCircle className="frd-shrink-0"/>
                        <span>Yêu cầu khách quét QR hoặc chuyển khoản theo thông tin ngân hàng tại quầy.</span>
                      </div>
                    )}
          
                    <button className="frdeskpage-checkout-btn" onClick={handlePayment}>
                      <FaCheckCircle size={13}/> XÁC NHẬN THANH TOÁN
                    </button>
                    <button className="frdeskpage-btn frdeskpage-btn-outline frd-btn-full frd-mt6" onClick={() => setSelectedBill(null)}>
                      Hủy bỏ
                    </button>
                  </>
                ) : (
                  <div className="frdeskpage-success">
                    <div className="frdeskpage-success-icon"><FaCheckCircle/></div>
                    <div className="frd-success-label">Giao dịch hoàn tất</div>
                    <button
                      className="frdeskpage-btn frdeskpage-btn-outline frd-btn-full frd-mt4"
                      onClick={async () => {
                        const token = localStorage.getItem('token');
                        let paymentData = null;
                        try {
                          const res = await axios.get(`http://localhost:3001/api/payments/appointment/${selectedBill.id}`, { headers: { Authorization: `Bearer ${token}` } });
                          if (res.data.success && res.data.data) {
                            const rawInfo = res.data.data.payment_info;
                            paymentData = { ...res.data.data, info: typeof rawInfo === 'string' ? JSON.parse(rawInfo) : rawInfo };
                          }
                        } catch(e) {}
                        if (!paymentData) paymentData = { method: 'cash', transaction_id: `OFFLINE-${selectedBill.id}`, info: { amount_received: selectedBill.Service?.price, change_amount: 0 } };
                        setPrintData({ ...selectedBill, PaymentDetails: paymentData });
                        setShowPrintModal(true);
                      }}
                    >
                      <FaPrint size={11}/> In lại hóa đơn
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="frdeskpage-empty">
                <FaMoneyBillWave size={36}/>
                <p>Chọn bệnh nhân<br/>để thu tiền</p>
              </div>
            )}
          </div>
       </div>
    </div>
  )};

  // 3. PHARMACY VIEW (NHÀ THUỐC) - ĐÃ CẬP NHẬT GIAO DIỆN MỚI
  // --- [MỚI] Hàm cập nhật số lượng/đơn vị thuốc và tính lại tổng tiền ---
  const handleUpdatePrescriptionItem = (index, field, value) => {
    if (!selectedPrescription) return;

    // 1. Sao chép danh sách item hiện tại
    const newItems = [...selectedPrescription.items];
    const currentItem = { ...newItems[index] };

    // 2. Cập nhật giá trị (Số lượng hoặc Đơn vị)
    if (field === 'quantity') {
      const qty = parseInt(value) || 0;
      currentItem.quantity = qty;
      // Tính lại thành tiền của dòng này
      currentItem.total = qty * (currentItem.price || 0);
    } else if (field === 'unit') {
      currentItem.unit = value;
    }

    newItems[index] = currentItem;

    // 3. Tính lại Tổng tiền toàn đơn
    const newTotal = newItems.reduce((sum, item) => sum + (item.total || 0), 0);

    // 4. Cập nhật State
    const updatedPrescription = {
      ...selectedPrescription,
      items: newItems,
      total: newTotal
    };

    setSelectedPrescription(updatedPrescription);

    // Cập nhật cả trong danh sách lớn để đồng bộ
    setPrescriptions(prev => prev.map(p => p.id === updatedPrescription.id ? updatedPrescription : p));
  };

  // 3. PHARMACY VIEW (NHÀ THUỐC) - ĐÃ CẬP NHẬT GIAO DIỆN MỚI
  const renderPharmacy = () => {
    return (
      <div className="frdeskpage-content frdeskpage-layout-split">
         {/* CỘT TRÁI: DANH SÁCH ĐƠN / THUỐC */}
         <div className="frdeskpage-panel">
            <div className="frdeskpage-panel-header">
               <div className="frdeskpage-sub-tabs m-0">
                  <div 
                    className={`frdeskpage-sub-tab ${pharmacyTab==='prescription'?'active':''}`}
                    onClick={()=>setPharmacyTab('prescription')}
                  >
                     <FaFilePrescription /> Đơn thuốc Bác sĩ
                  </div>
                  <div 
                    className={`frdeskpage-sub-tab ${pharmacyTab==='retail'?'active':''}`}
                    onClick={()=>setPharmacyTab('retail')}
                  >
                     <FaPills /> Bán lẻ
                  </div>
               </div>
            </div>

            {/* TAB: ĐƠN THUỐC */}
            {pharmacyTab === 'prescription' && (
               <div className="frdeskpage-panel-body frd-p0">
                  <div className="frdeskpage-toolbar">
                     <div className="frdeskpage-search frdeskpage-flex-1">
                        <FaSearch className="frdeskpage-search-icon"/>
                        <input className="frdeskpage-input ps-4" placeholder="Tìm tên BN hoặc mã đơn..." />
                     </div>
                  </div>
                  <table className="frdeskpage-table">
                     <thead>
                        <tr><th>Mã</th><th>Bệnh nhân</th><th>Bác sĩ</th><th>Trạng thái</th><th>Thao tác</th></tr>
                     </thead>
                     <tbody>
                        {prescriptions.map(pr => (
                           <tr 
                              key={pr.id} 
                              className={`frd-row-click ${selectedPrescription?.id === pr.id ? 'active' : ''}`}
                              onClick={() => setSelectedPrescription(pr)}
                           >
                              <td><span className="frd-fw-700">{pr.id}</span></td>
                              <td>{pr.patientName}<br/><small className="frd-gray-text">{pr.patientCode}</small></td>
                              <td>{pr.doctor}</td>
                              <td>
                                {pr.status === 'sold' 
                                    ? <span className="frdeskpage-badge frdeskpage-badge-green">Đã bán</span>
                                    : <span className="frdeskpage-badge frdeskpage-badge-amber">Chờ bán</span>
                                }
                              </td>
                              <td>
                                 {pr.status !== 'sold' && (
                                   <button 
                                      className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-sm" 
                                      onClick={(e) => { e.stopPropagation(); setSelectedPrescription(pr); }}
                                   >
                                      Bán thuốc
                                   </button>
                                 )}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}

            {/* TAB: BÁN LẺ */}
            {pharmacyTab === 'retail' && (
               <div className="frdeskpage-panel-body frd-p0">
                  {!showRetailForm ? (
                    /* LIST HÓA ĐƠN */
                    <div className="frdeskpage-p-12">
                      <div className="frdeskpage-flex-between frdeskpage-mb-8">
                        <span className="frdeskpage-section-label">Lịch sử Bán lẻ</span>
                        <button className="frdeskpage-btn frdeskpage-btn-primary" onClick={() => setShowRetailForm(true)}>
                          <FaPills /> Tạo đơn mới
                        </button>
                      </div>
                      <table className="frdeskpage-table">
                        <thead>
                          <tr><th>Mã HĐ</th><th>Khách hàng</th><th>SL</th><th>Tổng tiền</th><th>Ngày bán</th></tr>
                        </thead>
                        <tbody>
                          {retailInvoices.map(inv => (
                            <tr key={inv.id}>
                              <td><span className="frd-code-green">{inv.code}</span></td>
                              <td>{inv.customer_name}<br/><small className="frd-gray-text">{inv.customer_phone}</small></td>
                              <td className="frd-tc">{inv.item_count}</td>
                              <td className="frd-fw-700 frd-red-text">{formatMoney(parseFloat(inv.amount))}</td>
                              <td>{new Date(inv.created_at).toLocaleDateString('vi-VN')}</td>
                            </tr>
                          ))}
                          {retailInvoices.length === 0 && <tr><td colSpan="5" className="frd-empty-cell">Chưa có dữ liệu</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* FORM TẠO ĐƠN MỚI */
                    <div className="frd-retail-form-wrap">
                      {/* CỘT TRÁI: DANH SÁCH THUỐC */}
                      <div className="frdeskpage-panel frd-retail-med-col">
                          <div className="frdeskpage-panel-header frd-retail-search-bar">
                             <div className="frd-retail-search-inner">
                                <button className="frdeskpage-btn frdeskpage-btn-outline" onClick={() => setShowRetailForm(false)}>
                                   <FaUndo /> Quay lại
                                </button>
                                <div className="frdeskpage-search frdeskpage-flex-1">
                                   <FaSearch className="frdeskpage-search-icon"/>
                                   <input 
                                     className="frdeskpage-input frd-search-padded" 
                                     placeholder="Tìm thuốc nhanh..." 
                                     value={medSearch} 
                                     onChange={e=>setMedSearch(e.target.value)}
                                     autoFocus
                                   />
                                </div>
                             </div>
                          </div>
                          
                          <div className="frdeskpage-panel-body frd-med-grid-wrap">
                              <div className="frd-med-grid">
                                {medicinesList
                                  .filter(m => (m.name || '').toLowerCase().includes(medSearch.toLowerCase()))
                                  .map(med => {
                                    const stock = med.stock ?? med.quantity ?? 0;
                                    const inCart = retailCart.find(i => i.id === med.id);
                                    return (
                                      <div
                                        key={med.id}
                                        className={`frdeskpage-med-card ${inCart ? 'frd-med-card-active' : ''}`}
                                        onClick={() => {
                                          if (stock <= 0) return toast.warning('Thuốc đã hết hàng!');
                                          const exist = retailCart.find(i => i.id === med.id);
                                          if (exist) setRetailCart(retailCart.map(i => i.id === med.id ? {...i, qty: i.qty + 1} : i));
                                          else setRetailCart([...retailCart, {...med, qty: 1}]);
                                        }}
                                      >
                                        <div className="frdeskpage-med-name" title={med.name}>{med.name}</div>
                                        <div className="frdeskpage-med-meta">
                                          <span>{med.unit || '—'}</span>
                                          <span className={stock <= 0 ? 'frdeskpage-med-stock-out' : stock <= 10 ? 'frdeskpage-med-stock-warn' : ''}>
                                            {stock <= 0 ? 'Hết hàng' : `Kho: ${stock}`}
                                          </span>
                                        </div>
                                        <div className="frdeskpage-med-footer">
                                          <span className="frdeskpage-med-price">{formatMoney(med.price || med.export_price)}</span>
                                          <div className="frd-cart-badge-wrap">
                                            {inCart && (
                                              <span className="frd-cart-badge">×{inCart.qty}</span>
                                            )}
                                            <button
                                              className="frdeskpage-add-btn"
                                              disabled={stock <= 0}
                                              onClick={e => { e.stopPropagation(); }}
                                            >+</button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                }
                                {medicinesList.filter(m => (m.name || '').toLowerCase().includes(medSearch.toLowerCase())).length === 0 && (
                                  <div className="frd-med-empty">Không tìm thấy thuốc phù hợp</div>
                                )}
                              </div>
                          </div>
                      </div>

                      {/* CỘT PHẢI: GIỎ HÀNG & THANH TOÁN */}
                      <div className="frdeskpage-panel frd-retail-cart-col">
                          <div className="frdeskpage-panel-header">
                             <span><FaPills/> ĐƠN HÀNG ({retailCart.length})</span>
                             <span className="frd-transaction-code">{transactionCode}</span>
                          </div>

                          <div className="frdeskpage-panel-body frd-cart-table-wrap">
                            <table className="frdeskpage-table">
                              <thead>
                                <tr>
                                  <th>Tên thuốc</th>
                                  <th className="frd-tc frd-w60">SL</th>
                                  <th className="frd-tr frd-w80">Tiền</th>
                                  <th className="frd-w28"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {retailCart.map((item, idx) => (
                                  <tr key={idx}>
                                    <td>
                                      <div className="frd-cart-item-name" title={item.name}>{item.name}</div>
                                      <div className="frd-cart-item-price">{formatMoney(item.price)}</div>
                                    </td>
                                    <td className="frd-tc">
                                      <input
                                        type="number" min="1"
                                        className="frdeskpage-input-compact frd-w44"
                                        value={item.qty}
                                        onChange={e => {
                                          const val = Math.max(1, parseInt(e.target.value) || 1);
                                          setRetailCart(retailCart.map((it, i) => i === idx ? {...it, qty: val} : it));
                                        }}
                                      />
                                    </td>
                                    <td className="frd-tr frd-cart-amount">{formatMoney(item.price * item.qty)}</td>
                                    <td>
                                      <button className="frd-remove-btn" onClick={() => setRetailCart(retailCart.filter((_, i) => i !== idx))}>
                                        <FaTrash size={10}/>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {retailCart.length === 0 && (
                                  <tr>
                                    <td colSpan="4" className="frd-cart-empty">Giỏ hàng trống</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          
                          {/* CHECKOUT FOOTER */}
                          <div className="frd-checkout-footer">
                            <div className="frd-customer-grid">
                              <div>
                                <div className="frdeskpage-label">Khách hàng</div>
                                <input className="frdeskpage-input" placeholder="Tên khách..." value={retailCustomer.name} onChange={e => setRetailCustomer({...retailCustomer, name: e.target.value})}/>
                              </div>
                              <div>
                                <div className="frdeskpage-label">Số điện thoại</div>
                                <input className="frdeskpage-input" placeholder="0xxx..." value={retailCustomer.phone} onChange={e => setRetailCustomer({...retailCustomer, phone: e.target.value})}/>
                              </div>
                            </div>
                          
                            <div className="frdeskpage-method-switcher frd-mb-8">
                              <button className={`frdeskpage-method-btn ${paymentMethod==='cash'?'active':''}`} onClick={() => setPaymentMethod('cash')}>
                                <FaMoneyBillWave size={11}/> Tiền mặt
                              </button>
                              <button className={`frdeskpage-method-btn ${paymentMethod==='transfer'?'active':''}`} onClick={() => setPaymentMethod('transfer')}>
                                <FaQrcode size={11}/> Chuyển khoản
                              </button>
                            </div>
                          
                            {paymentMethod === 'cash' && (
                              <div className="frd-mb-8">
                                <div className="frdeskpage-label">Tiền khách đưa</div>
                                <input
                                  type="number"
                                  className="frdeskpage-input frd-cash-input"
                                  placeholder="0"
                                  value={paymentAmount}
                                  onChange={e => setPaymentAmount(e.target.value)}
                                />
                                {paymentAmount && (
                                  <div className="frdeskpage-change-box frd-mt-5">
                                    <span className="frd-change-label">Trả lại</span>
                                    <span className="frd-change-val">
                                      {formatMoney(Math.max(0, parseInt(paymentAmount) - retailCart.reduce((s,i) => s + i.price * i.qty, 0)))}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          
                            <div className="frdeskpage-cart-total">
                              <div>
                                <div className="frdeskpage-cart-total-label">Tổng cộng</div>
                                <div className="frd-cart-item-count">{retailCart.length} sản phẩm</div>
                              </div>
                              <div className="frdeskpage-cart-total-amount">{formatMoney(retailCart.reduce((s, i) => s + i.price * i.qty, 0))}</div>
                            </div>
                          
                            <button className="frdeskpage-checkout-btn" onClick={handleRetailCheckout} disabled={retailCart.length === 0}>
                              <FaMoneyBillWave size={13}/> THANH TOÁN & IN HÓA ĐƠN
                            </button>
                          </div>
                      </div>
                    </div>
                  )}
               </div>
            )}
         </div>

         {/* CỘT PHẢI: CHI TIẾT THANH TOÁN - KHÔI PHỤC ĐẦY ĐỦ THÔNG TIN */}
         {(pharmacyTab === 'prescription' && selectedPrescription) && (
         <div className="frdeskpage-panel frd-col-flex-h100">
            {/* 1. HEADER */}
            <div className="frdeskpage-panel-header">
               <span><FaFilePrescription/> CHI TIẾT ĐƠN THUỐC</span>
               {selectedPrescription.status === 'sold' 
                  ? <span className="frdeskpage-badge frdeskpage-badge-green"><FaCheckCircle/> ĐÃ THANH TOÁN</span>
                  : <span className="frdeskpage-badge frdeskpage-badge-amber"><FaClock/> CHỜ THANH TOÁN</span>
               }
            </div>
            
            {/* BODY: Thông tin & Thuốc */}
            <div className="frdeskpage-panel-body frd-presc-body">
               
               {/* 2. THÔNG TIN BỆNH NHÂN (Compact Card) */}
               <div className="frdeskpage-patient-card">
                  <div className="frdeskpage-patient-avatar">
                     <FaUser className="fs-5"/>
                  </div>
                  <div className="frdeskpage-patient-info">
                      <div className="frdeskpage-flex-between">
                          <h6 className="frdeskpage-patient-name-text">{selectedPrescription.patientName}</h6>
                          <span className="frd-gender-text">{selectedPrescription.gender}</span>
                      </div>
                      <div className="frdeskpage-flex-between frdeskpage-text-muted">
                          <span>Mã: {selectedPrescription.patientCode}</span>
                          <span>BS: {selectedPrescription.doctor}</span>
                      </div>
                      <div className="frd-diagnosis-row">
                          <strong>Chẩn đoán:</strong> {selectedPrescription.diagnosis}
                      </div>
                  </div>
               </div>

               <div className="frdeskpage-panel-body frd-presc-table-wrap">
                  <table className="frdeskpage-table">
                    <thead>
                        <tr>
                            <th>Tên thuốc</th>
                            <th className="frd-tc frd-w70">ĐV</th>
                            <th className="frd-tc frd-w60">SL</th>
                            <th className="frd-tr frd-pe2">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedPrescription.items.map((it, i) => (
                            <tr key={i}>
                                <td>
                                    <div className="frd-med-item-name" title={it.name}>{it.name}</div>
                                    <div className="frd-med-item-price">Giá: {formatMoney(it.price)}</div>
                                </td>
                                <td className="frd-tc">
                                    {selectedPrescription.status !== 'sold' ? (
                                      <input type="text" className="frdeskpage-input-compact" value={it.unit || ''} onChange={(e) => handleUpdatePrescriptionItem(i, 'unit', e.target.value)}/>
                                    ) : it.unit}
                                </td>
                                <td className="frd-tc">
                                    {selectedPrescription.status !== 'sold' ? (
                                      <input type="number" min="1" className="frdeskpage-input-compact" value={it.quantity} onChange={(e) => handleUpdatePrescriptionItem(i, 'quantity', e.target.value)}/>
                                    ) : it.quantity}
                                </td>
                                <td className="frd-tr frd-amount-red">{formatMoney(it.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                  </table>
               </div>

               {/* 4. THANH TOÁN */}
               <div className="frdeskpage-panel-footer">
                   {selectedPrescription.status !== 'sold' ? (
                       <div className="frd-presc-pay-col">
                           
                           {/* Mã giảm giá */}
                           <div className="frd-voucher-row">
                               <input className="frdeskpage-input" placeholder="Nhập mã giảm giá..." value={discountCode} onChange={e => setDiscountCode(e.target.value)} />
                               <button className="frdeskpage-btn frdeskpage-btn-outline frdeskpage-btn-sm" onClick={() => toast.info('Tính năng đang phát triển')}>
                                 <FaTag/>
                               </button>
                           </div>

                           <div className="frdeskpage-divider"></div>

                           <div className="frd-sum-row">
                               <span className="frd-sum-label">Tổng tiền:</span>
                               <span className="frd-fw-700">{formatMoney(selectedPrescription.total)}</span>
                           </div>
                           {discountAmount > 0 && (
                               <div className="frd-sum-row frd-discount-row">
                                   <span>Giảm giá:</span>
                                   <span>- {formatMoney(discountAmount)}</span>
                               </div>
                           )}
                           <div className="frd-sum-row frd-payable-row">
                               <span className="frd-fw-700">KHÁCH CẦN TRẢ:</span>
                               <span className="frd-payable-amount">
                                 {formatMoney(selectedPrescription.total - (discountAmount || 0))}
                               </span>
                           </div>

                           {/* Phương thức & Tiền khách đưa */}
                           <div className="frd-presc-method-box">
                               <button type="button"
                                 className={`frd-flex1 frdeskpage-btn frdeskpage-btn-sm ${paymentMethod==='cash' ? 'frdeskpage-btn-primary' : 'frdeskpage-btn-outline'}`}
                                 onClick={() => setPaymentMethod('cash')}
                               >
                                 <FaMoneyBillWave/> Tiền mặt
                               </button>
                               <button type="button"
                                 className={`frd-flex1 frdeskpage-btn frdeskpage-btn-sm ${paymentMethod==='transfer' ? 'frdeskpage-btn-primary' : 'frdeskpage-btn-outline'}`}
                                 onClick={() => setPaymentMethod('transfer')}
                               >
                                 <FaQrcode/> Chuyển khoản
                               </button>

                               {paymentMethod === 'cash' && (
                                 <>
                                   <div className="frd-cash-row">
                                     <span className="frd-cash-label">Khách đưa:</span>
                                     <input
                                       type="number"
                                       className="frdeskpage-input frd-cash-input"
                                       value={paymentAmount}
                                       onChange={(e) => setPaymentAmount(e.target.value)}
                                       placeholder="0"
                                     />
                                   </div>
                                   <div className="frd-cash-row">
                                     <span className="frd-cash-label">Tiền thừa:</span>
                                     <span className="frd-change-green">
                                       {paymentAmount ? formatMoney(parseInt(paymentAmount) - (selectedPrescription.total - discountAmount)) : '0 đ'}
                                     </span>
                                   </div>
                                 </>
                               )}
                           </div>

                           <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-full" onClick={handlePaymentAndPrint}>
                               <FaPrint/> THANH TOÁN
                           </button>
                       </div>
                   ) : (
                       /* ĐÃ THANH TOÁN */
                       <div className="frd-paid-state">
                           <div className="frd-paid-label">
                               <FaCheckCircle className="frd-paid-icon"/> 
                               GIAO DỊCH HOÀN TẤT
                           </div>
                           <div className="frd-paid-sub">
                               Thực thu: {formatMoney(selectedPrescription.customerPaid || selectedPrescription.total)}
                           </div>
                           <button className="frdeskpage-btn frdeskpage-btn-outline frdeskpage-btn-full" onClick={() => handleOpenPrintInvoice(selectedPrescription)}>
                               <FaPrint/> IN LẠI HÓA ĐƠN
                           </button>
                       </div>
                   )}
               </div>
            </div>
         </div>
         )}
      </div>
    );
  };
  // =========================================================
  // [MỚI] CÁC HÀM XỬ LÝ THANH TOÁN & IN HÓA ĐƠN
  // =========================================================

  // 1. Hàm mở Modal In (Chuẩn bị dữ liệu)
  const handleOpenPrintInvoice = (prescription) => {
    const finalTotal = prescription.total - (prescription.discount || 0);
    const customerPaid = prescription.customerPaid || finalTotal;
    
    setPrintData({
      ...prescription,
      finalTotal: finalTotal,
      customerPaid: customerPaid,
      changeAmount: customerPaid - finalTotal,
      printDate: new Date().toLocaleString('vi-VN')
    });
    setShowPrintModal(true);
  };

  // 2. Hàm nhập tiền khách đưa
  const handlePaymentInputChange = (e) => {
    const val = parseInt(e.target.value) || 0;
    setPaymentAmount(val);
  };

  // 3. Hàm Thanh toán & Mở In
  const handlePaymentAndPrint = async () => {
    if (!selectedPrescription) return;
    
    const finalTotal = selectedPrescription.total - discountAmount;
    const received = parseInt(paymentAmount) || 0;

    // Validate tiền mặt
    if (paymentMethod === 'cash' && received < finalTotal) {
       return toast.error('Số tiền khách đưa chưa đủ!');
    }

    try {
        const token = localStorage.getItem('token');
        // Gọi API cập nhật thanh toán
        await axios.put(`http://localhost:3001/api/appointments/${selectedPrescription.appointment_id}/payment`, {
            payment_status: 'paid_at_clinic',
            payment_method: paymentMethod,
            amount: finalTotal
        }, { headers: { Authorization: `Bearer ${token}` } });

        toast.success('Thanh toán thành công!');

        // Cập nhật trạng thái ngay lập tức
        const updatedPrescription = {
            ...selectedPrescription,
            status: 'sold', // Chuyển sang đã bán
            discount: discountAmount,
            customerPaid: received
        };

        // Cập nhật danh sách & item đang chọn
        setPrescriptions(prev => prev.map(p => p.id === selectedPrescription.id ? updatedPrescription : p));
        setSelectedPrescription(updatedPrescription);
        
        // Mở modal in
        handleOpenPrintInvoice(updatedPrescription);
        
        // Reset form
        setPaymentAmount('');
        setDiscountCode('');
        setDiscountAmount(0);

    } catch (error) {
        console.error(error);
        toast.error('Lỗi thanh toán');
    }
  };
  return (
    <div className="frdeskpage-container">
      {/* 1. Header & Shift Bar */}
      <div className="frdeskpage-header">
        <div className="frdeskpage-title">
           <FaStethoscope/> HỆ THỐNG QUẢN LÝ TIẾP ĐÓN
        </div>
        <div>
          {shift ? (
            <span className="frdeskpage-badge frdeskpage-badge-blue cursor-pointer" onClick={() => {setModalMode('end'); setShowShiftModal(true);}}>
              <FaCheckCircle /> Ca: {shift.staff}
            </span>
          ) : (
             <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-sm" onClick={() => {setModalMode('start'); setShowShiftModal(true);}}>
               <FaClock /> Mở ca
             </button>
          )}
        </div>
      </div>
      
      {/* 2. Navigation */}
      <div className="frdeskpage-nav">
        <div className={`frdeskpage-nav-item ${activeTab==='reception'?'active':''}`} onClick={()=>setActiveTab('reception')}>
            <FaUserPlus /> Tiếp Đón
        </div>
        <div className={`frdeskpage-nav-item ${activeTab==='cashier'?'active':''}`} onClick={()=>setActiveTab('cashier')}>
            <FaMoneyBillWave /> Thu Ngân
        </div>
        <div className={`frdeskpage-nav-item ${activeTab==='pharmacy'?'active':''}`} onClick={()=>setActiveTab('pharmacy')}>
            <FaPills /> Nhà Thuốc
        </div>
      </div>

      {/* 3. Main Content */}
      {activeTab === 'reception' && renderReception()}
      
      {/* Các tab khác giữ nguyên logic cũ nhưng được bọc trong container mới nếu cần hiển thị đẹp */}
      {activeTab === 'cashier' && renderCashier()} 
      {activeTab === 'pharmacy' && renderPharmacy()}

      {/* MODAL ĐĂNG KÝ MỚI (WALK-IN) */}
      <FrdModal
        show={showNewPatientForm}
        onHide={() => setShowNewPatientForm(false)}
        size="lg"
      >
        <FrdModal.Header onHide={() => setShowNewPatientForm(false)} className="frd-modal-header-green">
          <FaUserPlus/> Đăng ký tiếp đón mới
        </FrdModal.Header>

        <FrdModal.Body>
          <form onSubmit={handleWalkInSubmit} id="walkInForm">
            <div className="frd-form-grid-2">
              
              {/* Họ tên */}
              <div className="frd-col-full">
                <label className="frdeskpage-label">Họ và tên <span className="frd-required">*</span></label>
                <input
                  className="frdeskpage-input frd-input-upper"
                  placeholder="Nhập họ tên bệnh nhân..."
                  value={walkInForm.guest_name}
                  onChange={e => setWalkInForm({...walkInForm, guest_name: e.target.value})}
                  required
                />
              </div>

              {/* SĐT */}
              <div>
                <label className="frdeskpage-label">Số điện thoại <span className="frd-required">*</span></label>
                <input
                  className="frdeskpage-input"
                  placeholder="0xxx xxx xxx"
                  value={walkInForm.guest_phone}
                  onChange={e => setWalkInForm({...walkInForm, guest_phone: e.target.value})}
                  required
                />
              </div>

              {/* Ngày sinh */}
              <div>
                <label className="frdeskpage-label">Ngày sinh</label>
                <input
                  type="date"
                  className="frdeskpage-input"
                  value={walkInForm.guest_dob}
                  onChange={e => setWalkInForm({...walkInForm, guest_dob: e.target.value})}
                />
              </div>

              {/* Giới tính */}
              <div>
                <label className="frdeskpage-label">Giới tính</label>
                <select className="frdeskpage-select" value={walkInForm.guest_gender} onChange={e => setWalkInForm({...walkInForm, guest_gender: e.target.value})}>
                  <option>Nam</option>
                  <option>Nữ</option>
                  <option>Khác</option>
                </select>
              </div>

              {/* Dịch vụ */}
              <div>
                <label className="frdeskpage-label">Dịch vụ <span className="frd-required">*</span></label>
                <select
                  className="frdeskpage-select"
                  value={walkInForm.service_id}
                  onChange={e => {
                    setWalkInForm({...walkInForm, service_id: e.target.value, appointment_start_time: ''});
                    loadWalkInSlots(walkInForm.doctor_id, e.target.value, walkInForm.appointment_date);
                  }}
                  required
                >
                  <option value="">-- Chọn dịch vụ --</option>
                  {servicesList.map(s => <option key={s.id} value={s.id}>{s.name} — {formatMoney(s.price)}</option>)}
                </select>
              </div>

              {/* Bác sĩ */}
              <div>
                <label className="frdeskpage-label">Bác sĩ <span className="frd-required">*</span></label>
                <select
                  className="frdeskpage-select"
                  value={walkInForm.doctor_id}
                  onChange={e => {
                    setWalkInForm({...walkInForm, doctor_id: e.target.value, appointment_start_time: ''});
                    loadWalkInSlots(e.target.value, walkInForm.service_id, walkInForm.appointment_date);
                  }}
                  required
                >
                  <option value="">-- Chọn bác sĩ --</option>
                  {walkInDoctors.map(d => <option key={d.id} value={d.doctor_id || d.id}>{d.full_name}</option>)}
                </select>
              </div>

              {/* Ngày khám */}
              <div>
                <label className="frdeskpage-label">Ngày khám <span className="frd-required">*</span></label>
                <input
                  type="date"
                  className="frdeskpage-input"
                  value={walkInForm.appointment_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => {
                    setWalkInForm({...walkInForm, appointment_date: e.target.value, appointment_start_time: ''});
                    loadWalkInSlots(walkInForm.doctor_id, walkInForm.service_id, e.target.value);
                  }}
                  required
                />
              </div>

              {/* Giờ khám */}
              <div>
                <label className="frdeskpage-label">Giờ khám <span className="frd-required">*</span></label>
                {walkInSlots.length > 0 ? (
                  <div className="frd-slot-grid">
                    {walkInSlots.filter(s => s.status === 'available').map(s => (
                      <button
                        key={s.time} type="button"
                        className={`frd-slot-btn ${walkInForm.appointment_start_time === s.time ? 'frd-slot-btn-active' : ''}`}
                        onClick={() => setWalkInForm({...walkInForm, appointment_start_time: s.time})}
                      >{s.time}</button>
                    ))}
                  </div>
                ) : (
                  <div className="frd-slot-empty">
                    {walkInForm.doctor_id && walkInForm.service_id ? 'Không còn khung giờ trống' : 'Chọn bác sĩ và dịch vụ trước'}
                  </div>
                )}
              </div>

              {/* Lý do khám */}
              <div className="frd-col-full">
                <label className="frdeskpage-label">Lý do / Triệu chứng</label>
                <textarea
                  className="frdeskpage-input"
                  rows={2}
                  placeholder="Mô tả triệu chứng..."
                  value={walkInForm.reason}
                  onChange={e => setWalkInForm({...walkInForm, reason: e.target.value})}
                />
              </div>
            </div>
          </form>
        </FrdModal.Body>

        <FrdModal.Footer>
          <button type="button" className="frdeskpage-btn frdeskpage-btn-ghost" onClick={() => setShowNewPatientForm(false)}>
            Hủy bỏ
          </button>
          <button type="submit" form="walkInForm" className="frdeskpage-btn frdeskpage-btn-primary" disabled={walkInSubmitting}>
            {walkInSubmitting ? 'Đang xử lý...' : <><FaUserPlus className="frd-btn-icon"/> Xác nhận đăng ký & Cấp số</>}
          </button>
        </FrdModal.Footer>
      </FrdModal>

      {/* [MODAL CHI TIẾT LỊCH HẸN] */}
      <FrdModal 
        show={showDetailModal} 
        onHide={() => setShowDetailModal(false)} 
        size="xl"
        className="frd-modal-detail"
      >
        {/* Header */}
        <div className="frd-modal-header frd-detail-header">
           <div className="frd-detail-header-left">
               <div className="frdeskpage-patient-avatar frd-detail-avatar">
                  <FaNotesMedical />
               </div>
               <div>
                  <h5 className="frd-detail-title">HỒ SƠ LỊCH HẸN</h5>
                  <small className="frd-detail-code">Mã hồ sơ: <span className="frd-detail-code-val">#{selectedDetail?.code}</span></small>
               </div>
           </div>
           <button type="button" className="frd-modal-close" onClick={() => setShowDetailModal(false)}><FaTimes/></button>
        </div>
        
        {/* Body */}
        <FrdModal.Body className="frd-detail-body">
           {selectedDetail && (
               <div className="frdeskpage-adp-grid">
                   
                   {/* CỘT TRÁI */}
                   <div className="frd-col-flex-col">
                       
                       {/* CARD 1: LỊCH HẸN */}
                       <div className="frdeskpage-panel">
                           <div className="frdeskpage-panel-header">
                               <FaCalendarAlt />
                               <h6 className="frd-panel-h6">Thông tin lịch hẹn</h6>
                               <div className="frd-ml-auto">
                                  {selectedDetail.status === 'pending' && <span className="frdeskpage-adp-status frdeskpage-adp-status-pending"><FaClock/> Chờ xác nhận</span>}
                                  {selectedDetail.status === 'confirmed' && <span className="frdeskpage-adp-status frdeskpage-adp-status-confirmed"><FaCheckCircle/> Đã xác nhận</span>}
                                  {selectedDetail.status === 'completed' && <span className="frdeskpage-adp-status frdeskpage-adp-status-completed"><FaCheckCircle/> Hoàn thành</span>}
                                  {selectedDetail.status === 'cancelled' && <span className="frdeskpage-adp-status frdeskpage-adp-status-cancelled"><FaBan/> Đã hủy</span>}
                                  {selectedDetail.status === 'waiting_exam' && <span className="frdeskpage-adp-status frdeskpage-adp-status-confirmed"><FaStethoscope/> Chờ khám</span>}
                               </div>
                           </div>
                           <div className="frdeskpage-p-12">
                               <div className="frd-info-grid-2">
                                   <div className="frdeskpage-adp-info-group">
                                        <span className="frdeskpage-adp-label"><FaTag/> Dịch vụ</span>
                                        <span className="frdeskpage-adp-value frdeskpage-adp-value-lg">{selectedDetail.Service?.name || '---'}</span>
                                   </div>
                                   <div className="frdeskpage-adp-info-group">
                                        <span className="frdeskpage-adp-label"><FaHeart/> Chuyên khoa</span>
                                        <span className="frdeskpage-adp-value">{selectedDetail.Specialty?.name || 'Đa khoa'}</span>
                                   </div>
                                   <div className="frdeskpage-adp-info-group">
                                        <span className="frdeskpage-adp-label"><FaUserMd/> Bác sĩ phụ trách</span>
                                        <span className="frdeskpage-adp-value">{selectedDetail.Doctor?.user?.full_name || 'Chưa chỉ định'}</span>
                                   </div>
                                   <div className="frdeskpage-adp-info-group">
                                        <span className="frdeskpage-adp-label"><FaVideo/> Hình thức</span>
                                        <span className="frdeskpage-adp-value">
                                            {selectedDetail.appointment_type === 'online' ? 'Tư vấn trực tuyến' : 'Khám tại viện'}
                                        </span>
                                   </div>
                                   <div className="frdeskpage-adp-info-group">
                                        <span className="frdeskpage-adp-label"><FaCalendarDay/> Ngày khám</span>
                                        <span className="frdeskpage-adp-value">
                                            {selectedDetail.appointment_date ? new Date(selectedDetail.appointment_date).toLocaleDateString('vi-VN') : '---'}
                                        </span>
                                   </div>
                                   <div className="frdeskpage-adp-info-group">
                                        <span className="frdeskpage-adp-label"><FaClock/> Giờ khám</span>
                                        <span className="frdeskpage-adp-value">
                                            {selectedDetail.appointment_start_time?.slice(0,5)} - {selectedDetail.appointment_end_time?.slice(0,5)}
                                        </span>
                                   </div>
                                   <div className="frd-col-full frdeskpage-adp-info-group">
                                        <span className="frdeskpage-adp-label"><FaMapMarkerAlt/> Địa chỉ</span>
                                        <span className="frdeskpage-adp-value">{selectedDetail.appointment_address || 'Tầng 1, Tòa nhà Clinic, 123 Đường Sức Khỏe, Quận 1, TP. HCM'}</span>
                                   </div>
                               </div>
                           </div>
                       </div>

                       {/* CARD 2: BỆNH NHÂN */}
                       <div className="frdeskpage-panel">
                           <div className="frdeskpage-panel-header">
                               <FaUser />
                               <h6 className="frd-panel-h6">Thông tin bệnh nhân</h6>
                           </div>
                           <div className="frdeskpage-p-12">
                               <div className="frd-info-grid-2">
                                   <div className="frdeskpage-adp-info-group">
                                       <span className="frdeskpage-adp-label">Họ và tên</span>
                                       <span className="frdeskpage-adp-value frd-uppercase">{selectedDetail.guest_name || selectedDetail.Patient?.User?.full_name}</span>
                                   </div>
                                   <div className="frdeskpage-adp-info-group">
                                       <span className="frdeskpage-adp-label">Số điện thoại</span>
                                       <span className="frdeskpage-adp-value">{selectedDetail.guest_phone || selectedDetail.Patient?.User?.phone || '---'}</span>
                                   </div>
                                   <div className="frdeskpage-adp-info-group">
                                       <span className="frdeskpage-adp-label">Email</span>
                                       <span className="frdeskpage-adp-value">{selectedDetail.guest_email || selectedDetail.Patient?.User?.email || '---'}</span>
                                   </div>
                                   <div className="frdeskpage-adp-info-group">
                                       <span className="frdeskpage-adp-label">Giới tính / Năm sinh</span>
                                       <span className="frdeskpage-adp-value">
                                          {selectedDetail.Patient?.User?.gender || '---'} - {selectedDetail.Patient?.User?.dob ? new Date(selectedDetail.Patient.User.dob).getFullYear() : '---'}
                                       </span>
                                   </div>
                                   <div className="frd-col-full frd-symptom-box">
                                       <strong className="frd-symptom-label"><FaStethoscope/> Lý do khám / Triệu chứng:</strong>
                                       <span className="frd-symptom-text">{selectedDetail.reason || 'Bệnh nhân không ghi chú thêm.'}</span>
                                   </div>
                               </div>
                           </div>
                       </div>
                   </div>

                   {/* CỘT PHẢI: THANH TOÁN & ACTION */}
                   <div className="frd-col-flex-col">
                       
                       {/* CARD THANH TOÁN */}
                       <div className="frdeskpage-panel">
                           <div className="frdeskpage-panel-header frd-header-green">
                               <FaMoneyBillWave />
                               <h6 className="frd-panel-h6 frd-white">Thanh toán</h6>
                           </div>
                           <div className="frd-payment-detail-body">
                               <div className="frd-price-center">
                                   <span className="frdeskpage-adp-label frd-block">Tổng chi phí dịch vụ</span>
                                   <div className="frd-price-big">
                                      {selectedDetail.Service?.price ? selectedDetail.Service.price.toLocaleString('vi-VN') : '0'} <span className="frd-price-unit">VNĐ</span>
                                   </div>
                               </div>

                               <div className="frd-payment-status-block">
                                   <span className="frdeskpage-adp-label frd-block">Trạng thái thanh toán</span>
                                   {(selectedDetail.payment_status === 'paid' || selectedDetail.payment_status === 'paid_online' || selectedDetail.payment_status === 'paid_at_clinic') ? (
                                       <span className="frdeskpage-badge frdeskpage-badge-pill frdeskpage-badge-green">
                                           <FaCheckCircle /> ĐÃ THANH TOÁN
                                       </span>
                                   ) : (
                                       <span className="frdeskpage-badge frdeskpage-badge-pill frdeskpage-badge-amber">
                                           <FaClock /> CHƯA THANH TOÁN
                                       </span>
                                   )}
                               </div>

                               {['pending', 'confirmed', 'waiting_exam'].includes(selectedDetail.status) && selectedDetail.payment_status === 'unpaid' && (
                                   <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-full frdeskpage-btn-lg frd-mt-8" onClick={() => { setShowDetailModal(false); setSelectedBill(selectedDetail); setActiveTab('cashier'); }}>
                                       <FaMoneyBillWave/> Thu tiền ngay
                                   </button>
                               )}
                           </div>
                       </div>
                       
                       {/* CARD KẾT QUẢ */}
                       {selectedDetail.status === 'completed' && (
                         <div className="frdeskpage-panel">
                            <div className="frdeskpage-panel-header">
                               <FaShieldAlt/>
                               <h6 className="frd-panel-h6">Kết quả khám</h6>
                            </div>
                            <div className="frdeskpage-p-12">
                               {selectedDetail.MedicalRecord ? (
                                  <div className="frd-record-ok">
                                     <FaCheckCircle/> Đã có hồ sơ bệnh án
                                  </div>
                               ) : (
                                  <div className="frd-record-empty">Bác sĩ chưa cập nhật kết quả.</div>
                               )}
                            </div>
                         </div>
                       )}

                       <button className="frdeskpage-btn frdeskpage-btn-ghost frdeskpage-btn-full" onClick={() => setShowDetailModal(false)}>
                           Đóng cửa sổ
                       </button>
                   </div>
               </div>
           )}
        </FrdModal.Body>
      </FrdModal>
      <WorkShiftModal
        show={showShiftModal}
        onHide={() => setShowShiftModal(false)}
        mode={modalMode}
        onSubmit={handleShiftSubmit}
        currentUser={user?.full_name || user?.username || 'Nhân viên'}
        shiftStats={{
          startCash: shift?.opening_cash || 0,
          revenueCash: shift?.live_revenue_cash || 0,
          revenueTransfer: shift?.live_revenue_transfer || 0,
          transactions: shift?.live_transactions || 0
        }}
        currentShiftData={shift}
      />
      {/* ═══════════════════════════════════════════
          MODAL IN ẤN (CUSTOM - KHÔNG BOOTSTRAP)
      ═══════════════════════════════════════════ */}
      <FrdModal
        show={showPrintModal && !!printData}
        onHide={() => setShowPrintModal(false)}
        size="sm"
      >
        <FrdModal.Header onHide={() => setShowPrintModal(false)} className="frdeskpage-no-print frd-print-header">
          {printData?.printType === 'ticket' ? <><FaTicketAlt/> XEM TRƯỚC PHIẾU</> : <><FaPrint/> XEM TRƯỚC HÓA ĐƠN</>}
        </FrdModal.Header>

        <div className="frd-print-scroll printable-area">
          {printData && (
            <>
              {/* MẪU 1: PHIẾU SỐ THỨ TỰ */}
              {printData.printType === 'ticket' ? (
                <div className="frd-ticket-wrap">
                  <h6 className="frd-ticket-clinic-name">PK ĐA KHOA CLINIC SYSTEM</h6>
                  <div className="frd-ticket-clinic-addr">123 Đường Sức Khỏe, Quận 1, TP.HCM</div>
                  <div className="frdeskpage-ticket-divider"/>
                  <h5 className="frd-ticket-title">PHIẾU SỐ THỨ TỰ</h5>
                  <div className="frd-ticket-subtitle">(Vui lòng chờ tại sảnh)</div>
                  <div className="frd-ticket-number-box">
                    <div className="frd-ticket-number-label">Số của bạn</div>
                    <div className="frd-ticket-number-val">
                      {printData.payment_queue_number || printData.queue_number || '--'}
                    </div>
                  </div>
                  <div className="frd-ticket-details">
                    <div className="frd-ticket-details-grid">
                      <span className="frdeskpage-ticket-label">Khách hàng:</span>
                      <span className="frdeskpage-ticket-value">{printData.guest_name || printData.Patient?.User?.full_name}</span>
                      <span className="frdeskpage-ticket-label">Mã hồ sơ:</span>
                      <span className="frdeskpage-ticket-value">{printData.code}</span>
                      <span className="frdeskpage-ticket-label">Dịch vụ:</span>
                      <span className="frdeskpage-ticket-value">{printData.Service?.name}</span>
                    </div>
                  </div>
                  <div className="frdeskpage-ticket-divider"/>
                  <div className="frd-ticket-footer">
                    <span>Giờ lấy số: {new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                    <span className="frd-fw-700"><FaSmile /> Xin cảm ơn!</span>
                  </div>
                </div>
              ) : (
                /* MẪU 2: HÓA ĐƠN ĐẦY ĐỦ */
                <div className="frd-invoice-wrap">
                  <div className="frd-invoice-header">
                    <h6 className="frd-invoice-clinic-name">{printData.clinicInfo?.name || "PHÒNG KHÁM CLINIC SYSTEM"}</h6>
                    <div className="frd-invoice-sub">{printData.clinicInfo?.address || "Hà Nội, Việt Nam"}</div>
                    <div className="frd-invoice-sub">SĐT: {printData.clinicInfo?.phone || "1900 1234"}</div>
                    <div className="frdeskpage-ticket-divider"/>
                    <h5 className="frd-invoice-title">HÓA ĐƠN THANH TOÁN</h5>
                    <div className="frd-invoice-date">Ngày: {new Date().toLocaleString('vi-VN')}</div>
                    <div className="frd-invoice-sub">Mã HĐ: {printData.PaymentDetails?.transaction_id || printData.code}</div>
                  </div>

                  <div className="frd-invoice-customer">
                    <div className="frdeskpage-flex-between">
                      <span>Khách hàng:</span>
                      <span className="frd-fw-700 frd-uppercase">{printData.guest_name || printData.Patient?.User?.full_name}</span>
                    </div>
                    <div className="frdeskpage-flex-between">
                      <span>Mã hồ sơ:</span>
                      <span className="frd-fw-700">{printData.code}</span>
                    </div>
                    {printData.Doctor && (
                      <div className="frdeskpage-flex-between">
                        <span>Bác sĩ:</span>
                        <span>{printData.Doctor?.user?.full_name}</span>
                      </div>
                    )}
                  </div>

                  <table className="frd-invoice-table">
                    <thead>
                      <tr>
                        <th>Tên dịch vụ / Thuốc</th>
                        <th className="frd-tc">SL</th>
                        <th className="frd-tr">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printData.Service && (
                        <tr>
                          <td>{printData.Service?.name}</td>
                          <td className="frd-tc">1</td>
                          <td className="frd-tr">{formatMoney(printData.Service?.price)}</td>
                        </tr>
                      )}
                      {printData.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            {item.name}<br/>
                            <span className="frd-invoice-unit">({item.unit || 'Đvi'})</span>
                          </td>
                          <td className="frd-tc">{item.qty}</td>
                          <td className="frd-tr">{formatMoney(item.price * item.qty)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="frdeskpage-ticket-divider"/>

                  <div className="frd-invoice-totals">
                    <div className="frd-invoice-total-row">
                      <span className="frd-fw-700">TỔNG TIỀN:</span>
                      <span className="frd-fw-700">{formatMoney(printData.Service?.price || printData.total_amount)}</span>
                    </div>
                    {printData.PaymentDetails?.method === 'cash' && printData.PaymentDetails?.info && (
                      <>
                        <div className="frd-invoice-sub-row">
                          <span>Khách đưa:</span>
                          <span>{formatMoney(printData.PaymentDetails.info.amount_received)}</span>
                        </div>
                        <div className="frd-invoice-total-row">
                          <span className="frd-fw-700">TIỀN THỐI LẠI:</span>
                          <span className="frd-fw-700">{formatMoney(printData.PaymentDetails.info.change_amount)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="frd-invoice-thanks">
                    <div className="frd-fw-700">XIN CẢM ƠN QUÝ KHÁCH!</div>
                    <div className="frd-italic">Hẹn gặp lại</div>
                    <div className="frd-invoice-printed-by">In bởi: {printData.PaymentDetails?.info?.cashier_name || 'Hệ thống'}</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <FrdModal.Footer className="frdeskpage-no-print frd-print-footer">
          <button className="frdeskpage-btn frdeskpage-btn-ghost frdeskpage-btn-lg frdeskpage-flex-1" onClick={() => setShowPrintModal(false)}>
            ĐÓNG
          </button>
          <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-lg frdeskpage-flex-1" onClick={() => window.print()}>
            <FaPrint /> IN NGAY
          </button>
        </FrdModal.Footer>
      </FrdModal>
    </div>
  );
};

export default FrontDeskPage;