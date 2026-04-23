// client/src/pages/FrontDeskPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // <--- THÊM DÒNG NÀY
import axios from 'axios'; 
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext'; // <--- THÊM DÒNG NÀY
import WorkShiftModal from '../components/finance/WorkShiftModal'; // Giữ nguyên file này
// Đảm bảo có dòng này
import { Modal, Button } from 'react-bootstrap'; 
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

// --- MOCK DATA (Cấu trúc dữ liệu chuẩn hơn) ---
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
    <div className="front-desk-page-content h-100 d-flex flex-column" style={{backgroundColor: '#f1f8e9'}}> {/* Nền xanh rất nhạt */}
      
      {/* 1. HEADER ACTIONS */}
      <div className="d-flex justify-content-between align-items-center mb-2 px-1">
          <div className="d-flex gap-2">
            <button 
              className={`btn btn-sm fw-bold rounded-pill px-3 shadow-sm ${receptionTab === 'payment' ? 'btn-success text-white' : 'btn-white text-success border'}`}
              onClick={() => setReceptionTab('payment')}
            >
              <FaMoneyBillWave className="me-2"/> CHỜ LẤY SỐ TT <span className="badge bg-white text-success ms-2 rounded-circle">{unpaidAppointments.length}</span>
            </button>
            <button 
              className={`btn btn-sm fw-bold rounded-pill px-3 shadow-sm ${receptionTab === 'exam' ? 'btn-primary text-white' : 'btn-white text-primary border'}`}
              onClick={() => setReceptionTab('exam')}
            >
              <FaStethoscope className="me-2"/> DANH SÁCH CHỜ KHÁM <span className="badge bg-white text-primary ms-2 rounded-circle">{paidAppointments.length}</span>
            </button>
          </div>

          <button className="btn btn-success btn-sm shadow-sm fw-bold text-uppercase" onClick={() => setShowNewPatientForm(true)}>
            <FaUserPlus className="me-1"/> Đăng ký mới
          </button>
      </div>

      {/* 2. THANH BỘ LỌC (COMPACT) */}
      <div className="bg-white p-2 rounded border border-success border-opacity-25 mb-2 d-flex gap-2 align-items-center shadow-sm">
             <div className="input-group input-group-sm" style={{width: '140px'}}>
                <span className="input-group-text bg-success bg-opacity-10 text-success border-success border-opacity-25"><FaCalendarAlt/></span>
                <input 
                  type="date" 
                  className="form-control fw-bold border-success border-opacity-25 text-success"
                  value={receptionFilter.date}
                  onChange={(e) => setReceptionFilter({...receptionFilter, date: e.target.value})}
                />
             </div>

             <select 
                className="form-select form-select-sm border-success border-opacity-25 text-success fw-bold" 
                style={{width: '150px'}}
                value={receptionFilter.status}
                onChange={(e) => setReceptionFilter({...receptionFilter, status: e.target.value})}
             >
                <option value="all">Tất cả hồ sơ</option>
                <option value="no_num">Chưa cấp số</option>
                <option value="has_num">Đã cấp số</option>
             </select>

             <div className="input-group input-group-sm flex-grow-1">
                <input 
                  type="text" 
                  className="form-control border-success border-opacity-25" 
                  placeholder="Tìm kiếm bệnh nhân (Tên, Mã, SĐT)..."
                  value={receptionFilter.keyword}
                  onChange={(e) => setReceptionFilter({...receptionFilter, keyword: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && loadReceptionData()}
                />
                <button className="btn btn-success text-white" onClick={loadReceptionData}>Tìm</button>
             </div>
      </div>

      {/* 3. BẢNG DỮ LIỆU (COMPACT TABLE) */}
      <div className="bg-white rounded border border-success border-opacity-10 shadow-sm flex-grow-1 overflow-hidden d-flex flex-column">
        <div className="table-responsive flex-grow-1">
          <table className="table table-hover table-sm mb-0 align-middle compact-table">
            <thead className="bg-success bg-opacity-10 text-success sticky-top">
              <tr>
                <th style={{width: '40px'}} className="text-center">#</th>
                <th style={{width: '90px'}}>Mã HS</th>
                <th style={{width: '80px'}} className="text-center">STT</th> {/* ĐÂY LÀ SỐ PHIẾU IN RA */}
                <th style={{width: '200px'}}>Họ tên bệnh nhân</th>
                <th style={{width: '80px'}}>Năm sinh</th>
                <th style={{width: '100px'}}>SĐT</th>
                <th>Dịch vụ đăng ký</th>
                <th style={{width: '70px'}}>Giờ</th>
                <th className="text-center" style={{width: '110px'}}>Trạng thái</th>
                <th className="text-end" style={{width: '130px'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {(receptionTab === 'payment' ? unpaidAppointments : paidAppointments).map((appt, index) => {
                 // Logic hiển thị STT (Số phiếu)
                 let sttDisplay = null;
                 if (receptionTab === 'payment' && appt.payment_queue_number) sttDisplay = appt.payment_queue_number;
                 if (receptionTab === 'exam' && appt.queue_number) sttDisplay = appt.queue_number;

                 return (
                 <tr key={appt.id} style={{fontSize: '12px'}}>
                   {/* Cột #: Số thứ tự danh sách (Index + 1) */}
                   <td className="text-center text-muted fw-bold">{index + 1}</td>
                   
                   <td><span className="fw-bold text-success">{appt.code}</span></td>
                   
                   {/* Cột STT: Số phiếu cấp ra (Nếu chưa cấp hiện 'Chưa có') */}
                   <td className="text-center">
                      {sttDisplay ? (
                          <span className="badge bg-success rounded-pill px-2" style={{fontSize: '12px'}}>{sttDisplay}</span>
                      ) : (
                          <span className="badge bg-light text-muted border border-light text-uppercase" style={{fontSize: '9px'}}>Chưa có</span>
                      )}
                   </td>

                   <td className="fw-bold text-uppercase text-dark">
                      {appt.guest_name || appt.Patient?.User?.full_name}
                   </td>

                   <td className="text-muted">
                      {appt.guest_dob ? new Date(appt.guest_dob).getFullYear() : (appt.Patient?.User?.dob ? new Date(appt.Patient.User.dob).getFullYear() : '--')}
                   </td>

                   <td>{appt.guest_phone || appt.Patient?.User?.phone}</td>

                   <td>
                     <div className="text-truncate text-primary" style={{maxWidth: '180px'}} title={appt.Service?.name}>
                        {appt.Service?.name}
                     </div>
                   </td>

                   <td className="fw-bold text-dark font-monospace">{appt.appointment_start_time?.slice(0,5)}</td>

                   <td className="text-center">
                     {receptionTab === 'payment' ? (
                        sttDisplay 
                        ? <span className="badge bg-warning text-dark bg-opacity-25 border border-warning" style={{fontSize:'10px'}}>Chờ thanh toán</span>
                        : <span className="badge bg-light text-secondary border" style={{fontSize:'10px'}}>Mới tiếp nhận</span>
                     ) : (
                        <span className="badge bg-primary bg-opacity-10 text-primary border border-primary">Chờ khám</span>
                     )}
                   </td>

                   <td className="text-end">
                     <div className="d-flex justify-content-end gap-1">
                         {/* Nút Cấp số / In lại */}
                         {!sttDisplay ? (
                             <button className="btn btn-sm btn-success px-2 py-0 fw-bold d-flex align-items-center gap-1 shadow-sm" 
                                style={{height: '24px', fontSize: '11px'}}
                                onClick={() => handleCheckIn(appt, receptionTab === 'payment' ? 'payment' : 'clinical')}>
                                <FaTicketAlt /> CẤP SỐ
                             </button>
                         ) : (
                             <button className="btn btn-sm btn-outline-dark px-2 py-0 d-flex align-items-center gap-1"
                                style={{height: '24px', fontSize: '11px'}}
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
                         
                         <button className="btn btn-sm btn-light text-danger border px-2 py-0" 
                            style={{height: '24px'}}
                            onClick={(e) => { e.stopPropagation(); handleCancelAppt(appt.id); }} title="Hủy">
                             <FaTrash size={10}/>
                         </button>
                     </div>
                   </td>
                 </tr>
              )})}
              
              {(receptionTab === 'payment' ? unpaidAppointments : paidAppointments).length === 0 && (
                <tr>
                    <td colSpan="10" className="text-center py-5 text-muted small">
                        <span>Không có dữ liệu cho ngày {new Date(receptionFilter.date).toLocaleDateString('vi-VN')}</span>
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-light border-top p-1 text-end small text-muted fst-italic px-3">
            Tổng số: <strong>{(receptionTab === 'payment' ? unpaidAppointments : paidAppointments).length}</strong> hồ sơ
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
    <div className="front-desk-page-content front-desk-page-layout-split">
       {/* CỘT TRÁI: DANH SÁCH CHỜ */}
       <div className="front-desk-page-panel">
          
          {/* [SỬA] Ô GỌI SỐ CÓ NÚT NEXT */}
          {/* CALL BOX MỚI */}
          <div className="fd-call-box">
            <div>
              <div className="call-label">
                <FaHospital style={{marginRight: 5}}/> Đang mời thanh toán
              </div>
              <div className="call-name">
                {currentCalling
                  ? `${currentCalling.payment_queue_number ? 'Số ' + currentCalling.payment_queue_number + ' — ' : ''}${currentCalling.guest_name || currentCalling.Patient?.User?.full_name}`
                  : '— Chưa có khách —'}
              </div>
              <div className="call-sub">
                {currentCalling ? `Mã hồ sơ: ${currentCalling.code}` : 'Hàng đợi trống'}
              </div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
              <div style={{textAlign: 'center'}}>
                <div className="call-number">{currentCalling?.payment_queue_number || '--'}</div>
                <div className="call-counter">Quầy 1</div>
              </div>
              <button className="fd-next-btn" onClick={handleCallNext} title="Mời số tiếp theo">
                <FaArrowRight /> GỌI TIẾP
              </button>
            </div>
          </div>

          <div className="front-desk-page-panel-header">
             <span><FaMoneyBillWave /> DANH SÁCH CHỜ ({cashierList.length})</span>
          </div>

          {/* [MỚI] THANH CÔNG CỤ LỌC (Ngày tháng & Tìm kiếm) */}
          {/* [ĐÃ SỬA] THANH CÔNG CỤ LỌC: Có mũi tên, icon lịch, nút Tất cả */}
          <div className="fd-toolbar">
          {/* Date navigator */}
          <div className="fd-date-nav">
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
            className="front-desk-page-select"
            style={{width: 148, height: 30}}
            value={cashierFilter.status}
            onChange={e => setCashierFilter({...cashierFilter, status: e.target.value})}
          >
            <option value="all">Tất cả hồ sơ</option>
            <option value="unpaid">Chờ thu tiền</option>
            <option value="paid">Đã thu tiền</option>
          </select>
        
          {/* Search */}
          <div className="fd-search-box">
            <FaSearch size={11} style={{color: 'var(--fd-gray-500)', flexShrink: 0}}/>
            <input
              placeholder="Tên BN, Mã hồ sơ, SĐT..."
              value={cashierFilter.keyword}
              onChange={e => setCashierFilter({...cashierFilter, keyword: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && loadCashierData()}
            />
          </div>
          <button className="front-desk-page-btn front-desk-page-btn-primary front-desk-page-btn-sm" onClick={loadCashierData}>
            Tìm
          </button>
        </div>

          <div className="front-desk-page-panel-body p-0">
             <table className="front-desk-page-table">
                <thead>
                    <tr>
                        <th style={{width: '50px'}}>STT</th>
                        <th style={{width: '100px'}}>Mã HS</th>
                        <th>Họ tên</th>
                        <th style={{width: '80px'}}>Giờ</th>
                        <th>Bác sĩ</th>
                        <th>Dịch vụ</th>
                        <th className="text-end">Số tiền</th>
                        <th className="text-center">Trạng thái</th>
                        <th className="text-end">Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                   {cashierList.map((p, index) => {
                    // Kiểm tra xem đơn này đã thanh toán chưa
                    const isPaid = ['paid_at_clinic', 'paid_online', 'paid'].includes(p.payment_status);

                    return (
                    <tr key={p.id} 
                        className={selectedBill?.id === p.id ? 'active' : ''}
                        // SỬA: Bỏ điều kiện !isPaid để luôn cho phép click xem chi tiết
                        onClick={() => setSelectedBill(p)} 
                        style={{cursor: 'pointer', backgroundColor: isPaid ? '#f0fdf4' : 'white'}} // Đổi màu xanh nhẹ nếu đã thu
                    >
                        <td>
                            <span className={`front-desk-page-badge ${isPaid ? 'badge-grey' : 'badge-num'}`}>
                              {index + 1}
                            </span>
                        </td>

                        <td><span className="fw-bold">{p.code}</span></td>
                        <td>{p.guest_name || p.Patient?.User?.full_name}</td>

                        <td>
                          <div className="fw-bold small">{p.appointment_start_time?.slice(0, 5)}</div>
                        </td>

                        <td>
                          <div className="small text-primary fw-bold">
                              {p.Doctor?.user?.full_name || 'Chưa chỉ định'}
                          </div>
                        </td>

                        <td><small>{p.Service?.name}</small></td>
                        
                        {/* Cột số tiền: Nếu đã thu hiện màu xanh, chưa thu hiện màu đỏ */}
                        <td className={`text-end fw-bold ${isPaid ? 'text-success' : 'text-danger'}`}>
                            {formatMoney(p.Service?.price)}
                        </td>
                        
                        {/* Cột trạng thái */}
                        <td>
                            {isPaid ? (
                                <span className="badge bg-success text-white">Đã thu tiền</span>
                            ) : (
                                <span className="front-desk-page-badge badge-wait">Chờ thu</span>
                            )}
                        </td>

                        {/* Cột thao tác: Hiện nút In hóa đơn nếu đã thu */}
                        <td>
                          <div className="d-flex justify-content-end gap-1">
                              <button 
                                className="btn btn-sm btn-light text-primary border"
                                onClick={(e) => { e.stopPropagation(); openDetail(p); }}
                                title="Xem chi tiết"
                              >
                                <FaInfoCircle />
                              </button>
                              
                              {isPaid ? (
                                  <button 
                                    className="btn btn-sm btn-outline-dark d-flex align-items-center gap-1"
                                    onClick={async (e) => { 
                                    e.stopPropagation(); // Ngăn click nhầm vào dòng
                                    try {
                                        const token = localStorage.getItem('token');
                                        // Gọi API lấy thông tin thanh toán chi tiết từ Database (đã sửa ở Bước 1)
                                        const res = await axios.get(`http://localhost:3001/api/payments/appointment/${p.id}`, {
                                            headers: { Authorization: `Bearer ${token}` }
                                        });
                                        
                                        // Chuẩn bị dữ liệu in mặc định (Dự phòng)
                                        let finalPrintData = { 
                                            ...p,
                                            payment_status: 'paid_at_clinic', // Đảm bảo trạng thái đúng để in ra Hóa Đơn
                                            printType: 'invoice'
                                        };

                                        // Nếu API trả về dữ liệu thanh toán, gộp vào
                                        if (res.data.success && res.data.data) {
                                            const rawInfo = res.data.data.payment_info;
                                            // Parse JSON chuỗi payment_info từ DB
                                            const infoObj = (typeof rawInfo === 'string') ? JSON.parse(rawInfo) : rawInfo;
                                            
                                            finalPrintData.PaymentDetails = {
                                                ...res.data.data,
                                                info: infoObj || { amount_received: p.Service?.price, change_amount: 0 }
                                            };
                                        } else {
                                            // Nếu không tìm thấy record thanh toán (lỗi DB), tự tạo dữ liệu giả để vẫn in được
                                            finalPrintData.PaymentDetails = {
                                                method: 'cash',
                                                transaction_id: `OFFLINE-${p.id}`,
                                                info: { amount_received: p.Service?.price, change_amount: 0 }
                                            };
                                        }
                                        
                                        setPrintData(finalPrintData);
                                        setShowPrintModal(true); // Mở modal
                                    } catch (err) {
                                        console.error("Lỗi lấy thông tin in:", err);
                                        // Trường hợp lỗi mạng, vẫn mở modal in với thông tin cơ bản
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
                                  <button className="front-desk-page-btn front-desk-page-btn-primary front-desk-page-btn-sm">
                                    Thu tiền
                                  </button>
                              )}
                          </div>
                        </td>
                    </tr>
                  )})}
                  
                   {cashierList.length === 0 && (
                      <tr><td colSpan="9" className="text-center text-muted py-4">Không tìm thấy dữ liệu phù hợp</td></tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       {/* CỘT PHẢI: FORM THANH TOÁN */}
       <div className="front-desk-page-panel">
          <div className="front-desk-page-panel-header d-flex justify-content-between align-items-center">
              <span>THÔNG TIN THANH TOÁN</span>
              {/* [THÊM] Nút đóng panel khi không dùng */}
              {selectedBill && (
                  <button 
                      className="btn btn-sm btn-danger d-flex align-items-center justify-content-center p-0" 
                      style={{width: '24px', height: '24px', borderRadius: '50%'}}
                      onClick={() => setSelectedBill(null)}
                      title="Đóng bảng thanh toán"
                  >
                      <span style={{marginTop: '-2px'}}>×</span>
                  </button>
              )}
          </div>
          <div className="front-desk-page-panel-body">
            {selectedBill ? (
              <div className="fd-payment-info">
          
                {/* Header bệnh nhân */}
                <div style={{textAlign: 'center', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--fd-gray-300)'}}>
                  <div className="fd-queue-number">{selectedBill.payment_queue_number || '--'}</div>
                  <div className="fd-patient-name">{selectedBill.guest_name || selectedBill.Patient?.User?.full_name}</div>
                  <div className="fd-patient-code">{selectedBill.code}</div>
                  {['paid','paid_at_clinic','paid_online'].includes(selectedBill.payment_status) && (
                    <span className="fd-status-chip paid" style={{marginTop: 6}}>
                      <FaCheckCircle size={9}/> Đã thanh toán
                    </span>
                  )}
                </div>
          
                {/* Thông tin dịch vụ */}
                <div style={{background: 'var(--fd-green-20)', borderRadius: 8, padding: '10px 12px', marginBottom: 10}}>
                  <div className="fd-bill-row">
                    <span style={{color: 'var(--fd-gray-500)', fontSize: 11}}>Dịch vụ</span>
                    <span style={{fontWeight: 600, fontSize: 12, maxWidth: 160, textAlign: 'right'}}>{selectedBill.Service?.name}</span>
                  </div>
                  <div className="fd-bill-row">
                    <span style={{color: 'var(--fd-gray-500)', fontSize: 11}}>Bác sĩ</span>
                    <span style={{fontWeight: 600, fontSize: 12, color: 'var(--fd-blue-600)'}}>{selectedBill.Doctor?.user?.full_name || '—'}</span>
                  </div>
                  <div className="fd-bill-row">
                    <span style={{color: 'var(--fd-gray-500)', fontSize: 11}}>Giờ khám</span>
                    <span style={{fontWeight: 700, fontFamily: 'var(--fd-mono)', fontSize: 12}}>{selectedBill.appointment_start_time?.slice(0,5)}</span>
                  </div>
                </div>
          
                {/* Tổng tiền */}
                <div className="fd-bill-total">
                  <span className="label">Tổng cộng</span>
                  <span className="amount">{formatMoney(selectedBill.Service?.price)}</span>
                </div>
          
                {!['paid','paid_at_clinic','paid_online'].includes(selectedBill.payment_status) ? (
                  <>
                    {/* Mã giảm giá */}
                    <div style={{marginBottom: 8}}>
                      <div style={{fontSize: 11, fontWeight: 700, color: 'var(--fd-gray-500)', marginBottom: 3, textTransform: 'uppercase'}}>Voucher / Mã giảm giá</div>
                      <div style={{display: 'flex', gap: 6}}>
                        <input className="front-desk-page-input" placeholder="Nhập mã..." value={discountCode} onChange={e => setDiscountCode(e.target.value)}/>
                        <button className="front-desk-page-btn front-desk-page-btn-outline front-desk-page-btn-sm" style={{flexShrink: 0}} onClick={() => toast.info('Đang cập nhật')}>
                          <FaTag/>
                        </button>
                      </div>
                    </div>
          
                    <div className="front-desk-page-divider"/>
          
                    {/* Phương thức */}
                    <div style={{marginBottom: 10}}>
                      <div style={{fontSize: 11, fontWeight: 700, color: 'var(--fd-gray-500)', marginBottom: 5, textTransform: 'uppercase'}}>Phương thức</div>
                      <div className="fd-method-switcher">
                        <button className={`fd-method-btn ${paymentMethod==='cash'?'active':''}`} onClick={() => setPaymentMethod('cash')}>
                          <FaMoneyBillWave size={11}/> Tiền mặt
                        </button>
                        <button className={`fd-method-btn ${paymentMethod==='transfer'?'active':''}`} onClick={() => setPaymentMethod('transfer')}>
                          <FaQrcode size={11}/> Chuyển khoản
                        </button>
                      </div>
                    </div>
          
                    {/* Tiền khách đưa */}
                    {paymentMethod === 'cash' ? (
                      <div style={{marginBottom: 10}}>
                        <div style={{fontSize: 11, fontWeight: 700, color: 'var(--fd-gray-500)', marginBottom: 4, textTransform: 'uppercase'}}>Tiền khách đưa</div>
                        <input
                          type="number"
                          className="front-desk-page-input"
                          style={{fontSize: 15, fontWeight: 700, color: 'var(--fd-green-700)', fontFamily: 'var(--fd-mono)'}}
                          value={paymentAmount}
                          onChange={e => setPaymentAmount(e.target.value)}
                          placeholder="0"
                          autoFocus
                        />
                        {paymentAmount && (
                          <div className="fd-change-box" style={{marginTop: 6}}>
                            <span style={{fontSize: 11, color: 'var(--fd-gray-500)'}}>Trả lại</span>
                            <span style={{fontWeight: 700, color: 'var(--fd-green-700)', fontFamily: 'var(--fd-mono)'}}>
                              {formatMoney(Math.max(0, parseInt(paymentAmount) - (selectedBill.Service?.price || 0)))}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{background: 'var(--fd-blue-50)', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: 'var(--fd-blue-600)', display: 'flex', gap: 8, alignItems: 'flex-start'}}>
                        <FaInfoCircle style={{marginTop: 1, flexShrink: 0}}/>
                        <span>Yêu cầu khách quét QR hoặc chuyển khoản theo thông tin ngân hàng tại quầy.</span>
                      </div>
                    )}
          
                    {/* Nút thu tiền */}
                    <button className="fd-checkout-btn" onClick={handlePayment}>
                      <FaCheckCircle size={13}/> XÁC NHẬN THANH TOÁN
                    </button>
                    <button
                      className="front-desk-page-btn front-desk-page-btn-outline"
                      style={{width: '100%', justifyContent: 'center', marginTop: 6}}
                      onClick={() => setSelectedBill(null)}
                    >
                      Hủy bỏ
                    </button>
                  </>
                ) : (
                  <div className="fd-success-state">
                    <div className="fd-success-icon"><FaCheckCircle/></div>
                    <div style={{fontWeight: 700, color: 'var(--fd-green-700)', fontSize: 13}}>Giao dịch hoàn tất</div>
                    <button
                      className="front-desk-page-btn front-desk-page-btn-outline"
                      style={{width: '100%', justifyContent: 'center', marginTop: 4}}
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
              <div className="fd-empty-state">
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
      <div className="front-desk-page-content front-desk-page-layout-split">
         {/* CỘT TRÁI: DANH SÁCH ĐƠN / THUỐC */}
         <div className="front-desk-page-panel">
            <div className="front-desk-page-panel-header">
               <div className="front-desk-page-sub-tabs m-0">
                  <div 
                    className={`front-desk-page-sub-tab-btn ${pharmacyTab==='prescription'?'active':''}`}
                    onClick={()=>setPharmacyTab('prescription')}
                  >
                     <FaFilePrescription /> Đơn thuốc Bác sĩ
                  </div>
                  <div 
                    className={`front-desk-page-sub-tab-btn ${pharmacyTab==='retail'?'active':''}`}
                    onClick={()=>setPharmacyTab('retail')}
                  >
                     <FaPills /> Bán lẻ
                  </div>
               </div>
            </div>

            {/* TAB: ĐƠN THUỐC */}
            {pharmacyTab === 'prescription' && (
               <div className="front-desk-page-panel-body p-0">
                  <div className="p-2 border-bottom bg-light">
                     <div className="position-relative">
                        <FaSearch className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted"/>
                        <input className="front-desk-page-input ps-4" placeholder="Tìm tên BN hoặc mã đơn..." />
                     </div>
                  </div>
                  <table className="front-desk-page-table">
                     <thead>
                        <tr><th>Mã</th><th>Bệnh nhân</th><th>Bác sĩ</th><th>Trạng thái</th><th>Thao tác</th></tr>
                     </thead>
                     <tbody>
                        {prescriptions.map(pr => (
                           <tr 
                              key={pr.id} 
                              className={selectedPrescription?.id === pr.id ? 'active' : ''}
                              onClick={() => setSelectedPrescription(pr)} // [FIX] Luôn cho phép click
                              style={{ cursor: 'pointer' }}
                           >
                              <td><span className="fw-bold">{pr.id}</span></td>
                              <td>{pr.patientName}<br/><small className="text-muted">{pr.patientCode}</small></td>
                              <td>{pr.doctor}</td>
                              <td>
                                {/* [FIX] Hiển thị trạng thái dựa trên biến status mới */}
                                {pr.status === 'sold' 
                                    ? <span className="front-desk-page-badge badge-done">Đã bán</span>
                                    : <span className="front-desk-page-badge badge-wait">Chờ bán</span>
                                }
                              </td>
                              <td>
                                 {/* Nút thao tác nhanh */}
                                 {pr.status !== 'sold' && (
                                   <button 
                                      className="front-desk-page-btn front-desk-page-btn-primary front-desk-page-btn-sm" 
                                      onClick={(e) => {
                                          e.stopPropagation(); 
                                          setSelectedPrescription(pr);
                                      }}
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
               <div className="front-desk-page-panel-body p-0">
                  {!showRetailForm ? (
                    /* LIST HÓA ĐƠN */
                    <div className="p-3">
                      <div className="d-flex justify-content-between mb-3 align-items-center">
                        <span className="fw-bold text-primary text-uppercase small">Lịch sử Bán lẻ</span>
                        <button className="front-desk-page-btn front-desk-page-btn-primary" onClick={() => setShowRetailForm(true)}>
                          <FaPills /> Tạo đơn mới
                        </button>
                      </div>
                      <table className="front-desk-page-table border rounded">
                        <thead>
                          <tr><th>Mã HĐ</th><th>Khách hàng</th><th>SL</th><th>Tổng tiền</th><th>Ngày bán</th></tr>
                        </thead>
                        <tbody>
                          {retailInvoices.map(inv => (
                            <tr key={inv.id}>
                              <td><span className="fw-bold text-primary">{inv.code}</span></td>
                              <td>{inv.customer_name}<br/><small className="text-muted">{inv.customer_phone}</small></td>
                              <td className="text-center">{inv.item_count}</td>
                              <td className="fw-bold text-danger">{formatMoney(parseFloat(inv.amount))}</td>
                              <td>{new Date(inv.created_at).toLocaleDateString('vi-VN')}</td>
                            </tr>
                          ))}
                          {retailInvoices.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">Chưa có dữ liệu</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* FORM TẠO ĐƠN MỚI - GIAO DIỆN CHUẨN PASTEL COMPACT */
                    <div className="d-flex h-100 gap-2 p-2">
                      {/* CỘT TRÁI: DANH SÁCH THUỐC (GRID) */}
                      <div className="front-desk-page-panel flex-grow-1" style={{flex: 6}}>
                          <div className="front-desk-page-panel-header bg-white border-bottom p-2">
                             <div className="d-flex gap-2 w-100">
                                <button className="front-desk-page-btn front-desk-page-btn-outline" onClick={() => setShowRetailForm(false)}>
                                   <FaUndo /> Quay lại
                                </button>
                                <div className="position-relative flex-grow-1">
                                   <FaSearch className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted"/>
                                   <input 
                                     className="front-desk-page-input ps-4" 
                                     placeholder="Tìm thuốc nhanh..." 
                                     value={medSearch} 
                                     onChange={e=>setMedSearch(e.target.value)}
                                     autoFocus
                                   />
                                </div>
                             </div>
                          </div>
                          
                          <div className="front-desk-page-panel-body p-2 bg-light">
                              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', padding: '8px'}}>
                                {medicinesList
                                  .filter(m => (m.name || '').toLowerCase().includes(medSearch.toLowerCase()))
                                  .map(med => {
                                    const stock = med.stock ?? med.quantity ?? 0;
                                    const inCart = retailCart.find(i => i.id === med.id);
                                    return (
                                      <div
                                        key={med.id}
                                        className="fd-med-card"
                                        style={inCart ? {borderColor: 'var(--fd-green-500)', background: 'var(--fd-green-20)'} : {}}
                                        onClick={() => {
                                          if (stock <= 0) return toast.warning('Thuốc đã hết hàng!');
                                          const exist = retailCart.find(i => i.id === med.id);
                                          if (exist) setRetailCart(retailCart.map(i => i.id === med.id ? {...i, qty: i.qty + 1} : i));
                                          else setRetailCart([...retailCart, {...med, qty: 1}]);
                                        }}
                                      >
                                        <div className="fd-med-name" title={med.name}>{med.name}</div>
                                        <div className="fd-med-meta">
                                          <span>{med.unit || '—'}</span>
                                          <span className={stock <= 0 ? 'fd-med-stock-out' : stock <= 10 ? 'fd-med-stock-warn' : ''}>
                                            {stock <= 0 ? 'Hết hàng' : `Kho: ${stock}`}
                                          </span>
                                        </div>
                                        <div className="fd-med-footer">
                                          <span className="fd-med-price">{formatMoney(med.price || med.export_price)}</span>
                                          <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                                            {inCart && (
                                              <span style={{fontSize: 10, fontWeight: 700, color: 'var(--fd-green-700)', background: 'var(--fd-green-100)', borderRadius: 10, padding: '1px 6px'}}>
                                                ×{inCart.qty}
                                              </span>
                                            )}
                                            <button
                                              className="fd-add-btn"
                                              disabled={stock <= 0}
                                              style={stock <= 0 ? {opacity: 0.35, cursor: 'not-allowed'} : {}}
                                              onClick={e => { e.stopPropagation(); }}
                                            >+</button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                }
                                {medicinesList.filter(m => (m.name || '').toLowerCase().includes(medSearch.toLowerCase())).length === 0 && (
                                  <div style={{gridColumn: '1/-1', textAlign: 'center', color: 'var(--fd-gray-500)', padding: '40px 0', fontSize: 12}}>
                                    Không tìm thấy thuốc phù hợp
                                  </div>
                                )}
                              </div>
                          </div>
                      </div>

                      {/* CỘT PHẢI: GIỎ HÀNG & THANH TOÁN */}
                      <div className="front-desk-page-panel" style={{flex: 4, minWidth: '320px'}}>
                          <div className="front-desk-page-panel-header">
                             <span><FaPills className="me-2"/> ĐƠN HÀNG ({retailCart.length})</span>
                             <span className="text-danger">{transactionCode}</span>
                          </div>

                          {/* LIST GIỎ HÀNG */}
                          <div className="front-desk-page-panel-body p-0" style={{background: 'var(--fd-white)'}}>
                            <table className="front-desk-page-table">
                              <thead>
                                <tr>
                                  <th>Tên thuốc</th>
                                  <th className="text-center" style={{width: 60}}>SL</th>
                                  <th className="text-end" style={{width: 80}}>Tiền</th>
                                  <th style={{width: 28}}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {retailCart.map((item, idx) => (
                                  <tr key={idx}>
                                    <td>
                                      <div style={{fontWeight: 600, fontSize: 12, maxWidth: 130, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={item.name}>
                                        {item.name}
                                      </div>
                                      <div style={{fontSize: 10, color: 'var(--fd-gray-500)', fontFamily: 'var(--fd-mono)'}}>
                                        {formatMoney(item.price)}
                                      </div>
                                    </td>
                                    <td className="text-center">
                                      <input
                                        type="number" min="1"
                                        className="input-compact"
                                        style={{width: 44}}
                                        value={item.qty}
                                        onChange={e => {
                                          const val = Math.max(1, parseInt(e.target.value) || 1);
                                          setRetailCart(retailCart.map((it, i) => i === idx ? {...it, qty: val} : it));
                                        }}
                                      />
                                    </td>
                                    <td className="text-end" style={{fontWeight: 700, fontFamily: 'var(--fd-mono)', color: 'var(--fd-red-600)'}}>
                                      {formatMoney(item.price * item.qty)}
                                    </td>
                                    <td>
                                      <button
                                        style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fd-red-600)', padding: 2}}
                                        onClick={() => setRetailCart(retailCart.filter((_, i) => i !== idx))}
                                      >
                                        <FaTrash size={10}/>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {retailCart.length === 0 && (
                                  <tr>
                                    <td colSpan="4" style={{textAlign: 'center', padding: '36px 0', color: 'var(--fd-gray-500)', fontSize: 12, fontStyle: 'italic'}}>
                                      Giỏ hàng trống
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          
                          {/* CHECKOUT FOOTER */}
                          <div style={{padding: '12px', borderTop: '1px solid var(--fd-gray-300)', background: 'var(--fd-white)', flexShrink: 0}}>
                            {/* Khách hàng */}
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8}}>
                              <div>
                                <div className="front-desk-page-label">Khách hàng</div>
                                <input className="front-desk-page-input" placeholder="Tên khách..." value={retailCustomer.name} onChange={e => setRetailCustomer({...retailCustomer, name: e.target.value})}/>
                              </div>
                              <div>
                                <div className="front-desk-page-label">Số điện thoại</div>
                                <input className="front-desk-page-input" placeholder="0xxx..." value={retailCustomer.phone} onChange={e => setRetailCustomer({...retailCustomer, phone: e.target.value})}/>
                              </div>
                            </div>
                          
                            {/* Phương thức */}
                            <div className="fd-method-switcher" style={{marginBottom: 8}}>
                              <button className={`fd-method-btn ${paymentMethod==='cash'?'active':''}`} onClick={() => setPaymentMethod('cash')}>
                                <FaMoneyBillWave size={11}/> Tiền mặt
                              </button>
                              <button className={`fd-method-btn ${paymentMethod==='transfer'?'active':''}`} onClick={() => setPaymentMethod('transfer')}>
                                <FaQrcode size={11}/> Chuyển khoản
                              </button>
                            </div>
                          
                            {paymentMethod === 'cash' && (
                              <div style={{marginBottom: 8}}>
                                <div className="front-desk-page-label">Tiền khách đưa</div>
                                <input
                                  type="number"
                                  className="front-desk-page-input"
                                  style={{fontFamily: 'var(--fd-mono)', fontWeight: 700, fontSize: 14}}
                                  placeholder="0"
                                  value={paymentAmount}
                                  onChange={e => setPaymentAmount(e.target.value)}
                                />
                                {paymentAmount && (
                                  <div className="fd-change-box" style={{marginTop: 5}}>
                                    <span style={{fontSize: 11}}>Trả lại</span>
                                    <span style={{fontWeight: 700, fontFamily: 'var(--fd-mono)', color: 'var(--fd-green-700)'}}>
                                      {formatMoney(Math.max(0, parseInt(paymentAmount) - retailCart.reduce((s,i) => s + i.price * i.qty, 0)))}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          
                            {/* Tổng tiền */}
                            <div className="fd-cart-total">
                              <div>
                                <div className="total-label">Tổng cộng</div>
                                <div style={{fontSize: 10, color: 'rgba(255,255,255,0.6)'}}>{retailCart.length} sản phẩm</div>
                              </div>
                              <div className="total-amount">{formatMoney(retailCart.reduce((s, i) => s + i.price * i.qty, 0))}</div>
                            </div>
                          
                            <button className="fd-checkout-btn" onClick={handleRetailCheckout} disabled={retailCart.length === 0}>
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
         <div className="front-desk-page-panel d-flex flex-column h-100">
            {/* 1. HEADER */}
            <div className="front-desk-page-panel-header">
               <span><FaFilePrescription className="me-2"/> CHI TIẾT ĐƠN THUỐC</span>
               {selectedPrescription.status === 'sold' 
                  ? <span className="front-desk-page-badge badge-done"><FaCheckCircle/> ĐÃ THANH TOÁN</span>
                  : <span className="front-desk-page-badge badge-wait"><FaClock/> CHỜ THANH TOÁN</span>
               }
            </div>
            
            {/* BODY: Thông tin & Thuốc */}
            <div className="front-desk-page-panel-body d-flex flex-column bg-light p-2">
               
               {/* 2. THÔNG TIN BỆNH NHÂN (Compact Card) */}
               <div className="bg-white p-2 rounded border shadow-sm mb-2 d-flex gap-2 align-items-start">
                  <div className="bg-success bg-opacity-10 text-success rounded p-2 d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                     <FaUser className="fs-5"/>
                  </div>
                  <div className="flex-grow-1">
                      <div className="d-flex justify-content-between">
                          <h6 className="fw-bold text-success mb-0 text-uppercase" style={{fontSize: '12px'}}>{selectedPrescription.patientName}</h6>
                          <span className="small text-muted">{selectedPrescription.gender}</span>
                      </div>
                      <div className="d-flex justify-content-between small text-muted" style={{fontSize: '11px'}}>
                          <span>Mã: {selectedPrescription.patientCode}</span>
                          <span>BS: {selectedPrescription.doctor}</span>
                      </div>
                      <div className="small text-dark mt-1 fst-italic border-top pt-1" style={{fontSize: '11px'}}>
                          <strong>Chẩn đoán:</strong> {selectedPrescription.diagnosis}
                      </div>
                  </div>
               </div>

               {/* 3. DANH SÁCH THUỐC (Table Compact - ĐÃ SỬA WIDTH) */ }
               <div className="flex-grow-1 bg-white rounded border shadow-sm p-0 mb-2 overflow-auto" style={{minHeight: '150px'}}>
                  <table className="front-desk-page-table">
                    <thead>
                        <tr>
                            {/* Giảm cột tên thuốc xuống một chút để nhường chỗ */}
                            <th className="ps-2">Tên thuốc</th>
                            {/* Tăng độ rộng cột ĐV và SL lên 70px và 60px */}
                            <th className="text-center" style={{width: '70px'}}>ĐV</th>
                            <th className="text-center" style={{width: '60px'}}>SL</th>
                            <th className="text-end pe-2">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedPrescription.items.map((it, i) => (
                            <tr key={i}>
                                <td className="ps-2">
                                    <div className="fw-bold text-dark text-truncate" style={{maxWidth: '140px'}} title={it.name}>{it.name}</div>
                                    <div className="text-muted" style={{fontSize: '10px'}}>Giá: {formatMoney(it.price)}</div>
                                </td>
                                <td className="text-center">
                                    {selectedPrescription.status !== 'sold' ? (
                                      <input 
                                        type="text" 
                                        className="input-compact" // Class mới thêm ở CSS
                                        value={it.unit || ''} onChange={(e) => handleUpdatePrescriptionItem(i, 'unit', e.target.value)}
                                      />
                                    ) : it.unit}
                                </td>
                                <td className="text-center">
                                    {selectedPrescription.status !== 'sold' ? (
                                      <input 
                                        type="number" min="1" 
                                        className="input-compact text-primary" // Class mới thêm ở CSS
                                        value={it.quantity} onChange={(e) => handleUpdatePrescriptionItem(i, 'quantity', e.target.value)}
                                      />
                                    ) : it.quantity}
                                </td>
                                <td className="text-end pe-2 fw-bold text-danger">
                                  {formatMoney(it.total)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                  </table>
               </div>

               {/* 4. THANH TOÁN (Khôi phục đầy đủ) */}
               <div className="bg-white p-2 rounded border shadow-sm flex-shrink-0">
                   {selectedPrescription.status !== 'sold' ? (
                       <div className="d-flex flex-column gap-2">
                           
                           {/* Mã giảm giá */}
                           <div className="d-flex gap-1">
                               <input 
                                  className="front-desk-page-input" 
                                  placeholder="Nhập mã giảm giá..." 
                                  value={discountCode} onChange={e => setDiscountCode(e.target.value)} 
                               />
                               <button className="front-desk-page-btn front-desk-page-btn-outline front-desk-page-btn-sm" onClick={() => toast.info('Tính năng đang phát triển')}>
                                 <FaTag/>
                               </button>
                           </div>

                           <div className="front-desk-page-divider"></div>

                           {/* Tính toán tiền */}
                           <div className="d-flex justify-content-between small">
                               <span className="text-muted">Tổng tiền:</span>
                               <span className="fw-bold">{formatMoney(selectedPrescription.total)}</span>
                           </div>
                           {discountAmount > 0 && (
                               <div className="d-flex justify-content-between small text-success">
                                   <span>Giảm giá:</span>
                                   <span>- {formatMoney(discountAmount)}</span>
                               </div>
                           )}
                           <div className="d-flex justify-content-between align-items-end">
                               <span className="fw-bold text-dark small">KHÁCH CẦN TRẢ:</span>
                               <span className="text-danger fw-bold fs-5">
                                 {formatMoney(selectedPrescription.total - (discountAmount || 0))}
                               </span>
                           </div>

                           {/* Phương thức & Tiền khách đưa */}
                           <div className="bg-light p-2 rounded border">
                               <div className="d-flex gap-1 mb-2">
                                  <button type="button" 
                                    className={`flex-grow-1 front-desk-page-btn front-desk-page-btn-sm ${paymentMethod==='cash' ? 'front-desk-page-btn-primary' : 'front-desk-page-btn-outline'}`}
                                    onClick={() => setPaymentMethod('cash')}
                                  >
                                    <FaMoneyBillWave/> Tiền mặt
                                  </button>
                                  <button type="button" 
                                    className={`flex-grow-1 front-desk-page-btn front-desk-page-btn-sm ${paymentMethod==='transfer' ? 'front-desk-page-btn-primary' : 'front-desk-page-btn-outline'}`}
                                    onClick={() => setPaymentMethod('transfer')}
                                  >
                                    <FaQrcode/> Chuyển khoản
                                  </button>
                               </div>

                               {paymentMethod === 'cash' && (
                                   <>
                                   <div className="d-flex align-items-center mb-1">
                                       <span className="small fw-bold text-muted me-2" style={{minWidth:'70px'}}>Khách đưa:</span>
                                       <input 
                                          type="number" 
                                          className="front-desk-page-input fw-bold text-primary" 
                                          value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} 
                                          placeholder="0" 
                                       />
                                   </div>
                                   <div className="d-flex align-items-center">
                                       <span className="small fw-bold text-muted me-2" style={{minWidth:'70px'}}>Tiền thừa:</span>
                                       <span className="fw-bold text-success">
                                           {paymentAmount ? formatMoney(parseInt(paymentAmount) - (selectedPrescription.total - discountAmount)) : '0 đ'}
                                       </span>
                                   </div>
                                   </>
                               )}
                           </div>

                           <button 
                              className="front-desk-page-btn front-desk-page-btn-primary w-100 justify-content-center py-2 text-uppercase shadow-sm" 
                              onClick={handlePaymentAndPrint}
                           >
                               <FaPrint className="me-2"/> THANH TOÁN
                           </button>
                       </div>
                   ) : (
                       /* ĐÃ THANH TOÁN */
                       <div className="text-center py-3">
                           <div className="text-success fw-bold mb-2">
                               <FaCheckCircle className="fs-4 mb-1 d-block mx-auto"/> 
                               GIAO DỊCH HOÀN TẤT
                           </div>
                           <div className="small text-muted mb-3">
                               Thực thu: {formatMoney(selectedPrescription.customerPaid || selectedPrescription.total)}
                           </div>
                           <button 
                              className="front-desk-page-btn front-desk-page-btn-outline w-100 justify-content-center" 
                              onClick={() => handleOpenPrintInvoice(selectedPrescription)}
                           >
                               <FaPrint className="me-2"/> IN LẠI HÓA ĐƠN
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
    <div className="front-desk-page-container">
      {/* 1. Header & Shift Bar */}
      <div className="front-desk-page-header">
        <div className="front-desk-page-title">
           <FaStethoscope className="me-2"/> HỆ THỐNG QUẢN LÝ TIẾP ĐÓN
        </div>
        <div>
          {shift ? (
            <span className="front-desk-page-badge badge-blue cursor-pointer" onClick={() => {setModalMode('end'); setShowShiftModal(true);}}>
              <FaCheckCircle /> Ca: {shift.staff}
            </span>
          ) : (
             <button className="front-desk-page-btn front-desk-page-btn-primary front-desk-page-btn-sm" onClick={() => {setModalMode('start'); setShowShiftModal(true);}}>
               <FaClock /> Mở ca
             </button>
          )}
        </div>
      </div>
      
      {/* 2. Navigation */}
      <div className="front-desk-page-nav">
        <div className={`front-desk-page-nav-item ${activeTab==='reception'?'active':''}`} onClick={()=>setActiveTab('reception')}>
            <FaUserPlus /> Tiếp Đón
        </div>
        <div className={`front-desk-page-nav-item ${activeTab==='cashier'?'active':''}`} onClick={()=>setActiveTab('cashier')}>
            <FaMoneyBillWave /> Thu Ngân
        </div>
        <div className={`front-desk-page-nav-item ${activeTab==='pharmacy'?'active':''}`} onClick={()=>setActiveTab('pharmacy')}>
            <FaPills /> Nhà Thuốc
        </div>
      </div>

      {/* 3. Main Content */}
      {activeTab === 'reception' && renderReception()}
      
      {/* Các tab khác giữ nguyên logic cũ nhưng được bọc trong container mới nếu cần hiển thị đẹp */}
      {activeTab === 'cashier' && renderCashier()} 
      {activeTab === 'pharmacy' && renderPharmacy()}

      {/* MODAL ĐĂNG KÝ MỚI (WALK-IN) */}
      <Modal
        show={showNewPatientForm}
        onHide={() => setShowNewPatientForm(false)}
        centered
        size="lg"
        onShow={loadWalkInDoctors}
      >
        <div style={{background: 'white', borderRadius: '12px', overflow: 'hidden'}}>
          {/* Header */}
          <div style={{background: 'linear-gradient(135deg, #2e7d32, #43a047)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{color: 'white'}}>
              <div style={{fontWeight: 700, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                <FaUserPlus style={{marginRight: 8}}/> Đăng ký tiếp đón mới
              </div>
              <div style={{fontSize: '12px', opacity: 0.8, marginTop: 2}}>Khách đến trực tiếp tại quầy</div>
            </div>
            <button onClick={() => setShowNewPatientForm(false)} style={{background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 30, height: 30, color: 'white', cursor: 'pointer', fontSize: 16}}>×</button>
          </div>

          <form onSubmit={handleWalkInSubmit} style={{padding: '20px'}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
              
              {/* Họ tên */}
              <div style={{gridColumn: '1 / -1'}}>
                <label style={{fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4, textTransform: 'uppercase'}}>Họ và tên <span style={{color: 'red'}}>*</span></label>
                <input
                  className="form-control"
                  placeholder="Nhập họ tên bệnh nhân..."
                  value={walkInForm.guest_name}
                  onChange={e => setWalkInForm({...walkInForm, guest_name: e.target.value})}
                  style={{textTransform: 'uppercase', fontWeight: 600}}
                  required
                />
              </div>

              {/* SĐT */}
              <div>
                <label style={{fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4, textTransform: 'uppercase'}}>Số điện thoại <span style={{color: 'red'}}>*</span></label>
                <input
                  className="form-control"
                  placeholder="0xxx xxx xxx"
                  value={walkInForm.guest_phone}
                  onChange={e => setWalkInForm({...walkInForm, guest_phone: e.target.value})}
                  required
                />
              </div>

              {/* Ngày sinh */}
              <div>
                <label style={{fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4, textTransform: 'uppercase'}}>Ngày sinh</label>
                <input
                  type="date"
                  className="form-control"
                  value={walkInForm.guest_dob}
                  onChange={e => setWalkInForm({...walkInForm, guest_dob: e.target.value})}
                />
              </div>

              {/* Giới tính */}
              <div>
                <label style={{fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4, textTransform: 'uppercase'}}>Giới tính</label>
                <select className="form-select" value={walkInForm.guest_gender} onChange={e => setWalkInForm({...walkInForm, guest_gender: e.target.value})}>
                  <option>Nam</option>
                  <option>Nữ</option>
                  <option>Khác</option>
                </select>
              </div>

              {/* Dịch vụ */}
              <div>
                <label style={{fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4, textTransform: 'uppercase'}}>Dịch vụ <span style={{color: 'red'}}>*</span></label>
                <select
                  className="form-select"
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
                <label style={{fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4, textTransform: 'uppercase'}}>Bác sĩ <span style={{color: 'red'}}>*</span></label>
                <select
                  className="form-select"
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
                <label style={{fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4, textTransform: 'uppercase'}}>Ngày khám <span style={{color: 'red'}}>*</span></label>
                <input
                  type="date"
                  className="form-control"
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
                <label style={{fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4, textTransform: 'uppercase'}}>Giờ khám <span style={{color: 'red'}}>*</span></label>
                {walkInSlots.length > 0 ? (
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 80, overflowY: 'auto'}}>
                    {walkInSlots.filter(s => s.status === 'available').map(s => (
                      <button
                        key={s.time} type="button"
                        onClick={() => setWalkInForm({...walkInForm, appointment_start_time: s.time})}
                        style={{
                          padding: '4px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                          background: walkInForm.appointment_start_time === s.time ? '#2e7d32' : '#e8f5e9',
                          color: walkInForm.appointment_start_time === s.time ? 'white' : '#2e7d32',
                          border: `1px solid ${walkInForm.appointment_start_time === s.time ? '#2e7d32' : '#c8e6c9'}`
                        }}
                      >{s.time}</button>
                    ))}
                  </div>
                ) : (
                  <div style={{fontSize: 12, color: '#999', padding: '8px', background: '#f9f9f9', borderRadius: 6, border: '1px solid #eee'}}>
                    {walkInForm.doctor_id && walkInForm.service_id ? 'Không còn khung giờ trống' : 'Chọn bác sĩ và dịch vụ trước'}
                  </div>
                )}
              </div>

              {/* Lý do khám */}
              <div style={{gridColumn: '1 / -1'}}>
                <label style={{fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4, textTransform: 'uppercase'}}>Lý do / Triệu chứng</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Mô tả triệu chứng..."
                  value={walkInForm.reason}
                  onChange={e => setWalkInForm({...walkInForm, reason: e.target.value})}
                />
              </div>
            </div>

            {/* Footer buttons */}
            <div style={{display: 'flex', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid #eee'}}>
              <button type="button" className="btn btn-outline-secondary" style={{flex: 1}} onClick={() => setShowNewPatientForm(false)}>
                Hủy bỏ
              </button>
              <button type="submit" className="btn btn-success" style={{flex: 2, fontWeight: 700}} disabled={walkInSubmitting}>
                {walkInSubmitting ? 'Đang xử lý...' : <><FaUserPlus style={{marginRight: 6}}/> Xác nhận đăng ký & Cấp số</>}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* [MODAL CHI TIẾT DỊCH VỤ - GIAO DIỆN CHUẨN ĐẸP] */}
      <Modal 
        show={showDetailModal} 
        onHide={() => setShowDetailModal(false)} 
        centered 
        size="xl" 
        contentClassName="adp-modal-content"
      >
        {/* Header Modal */}
        <div className="adp-modal-header bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center">
           <div className="d-flex align-items-center gap-3">
               <div className="bg-light rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{width: 48, height: 48}}>
                  <FaNotesMedical className="text-success fs-4" />
               </div>
               <div>
                  <h5 className="fw-bold m-0 text-dark text-uppercase">HỒ SƠ LỊCH HẸN</h5>
                  <small className="text-muted">Mã hồ sơ: <span className="fw-bold text-primary">#{selectedDetail?.code}</span></small>
               </div>
           </div>
           <button type="button" className="btn-close" onClick={() => setShowDetailModal(false)}></button>
        </div>
        
        {/* Body Modal */}
        <Modal.Body className="adp-modal-body p-4 bg-light">
           {selectedDetail && (
               <div className="adp-grid-layout">
                   
                   {/* --- CỘT TRÁI: THÔNG TIN CHI TIẾT --- */}
                   <div className="d-flex flex-column gap-3">
                       
                       {/* CARD 1: THÔNG TIN LỊCH HẸN */}
                       <div className="adp-card bg-white rounded-3 shadow-sm border">
                           <div className="adp-card-header px-3 py-2 border-bottom d-flex align-items-center bg-white rounded-top-3">
                               <FaCalendarAlt className="text-success me-2" />
                               <h6 className="adp-section-title m-0 fw-bold text-uppercase text-dark" style={{fontSize: '0.9rem'}}>Thông tin lịch hẹn</h6>
                               <div className="ms-auto">
                                  {selectedDetail.status === 'pending' && <span className="adp-status-badge adp-status-pending"><FaClock/> Chờ xác nhận</span>}
                                  {selectedDetail.status === 'confirmed' && <span className="adp-status-badge adp-status-confirmed"><FaCheckCircle/> Đã xác nhận</span>}
                                  {selectedDetail.status === 'completed' && <span className="adp-status-badge adp-status-completed"><FaCheckCircle/> Hoàn thành</span>}
                                  {selectedDetail.status === 'cancelled' && <span className="adp-status-badge adp-status-cancelled"><FaBan/> Đã hủy</span>}
                                  {selectedDetail.status === 'waiting_exam' && <span className="adp-status-badge adp-status-confirmed"><FaStethoscope/> Chờ khám</span>}
                               </div>
                           </div>
                           <div className="adp-card-body p-3">
                               <div className="row g-3">
                                   <div className="col-md-6">
                                       <div className="adp-info-group">
                                            <span className="adp-label text-muted small fw-bold text-uppercase"><FaTag className="me-1"/> Dịch vụ</span>
                                            <span className="adp-value highlight text-success fw-bold">{selectedDetail.Service?.name || '---'}</span>
                                       </div>
                                   </div>
                                   <div className="col-md-6">
                                       <div className="adp-info-group">
                                            <span className="adp-label text-muted small fw-bold text-uppercase"><FaHeart className="me-1"/> Chuyên khoa</span>
                                            <span className="adp-value fw-bold">{selectedDetail.Specialty?.name || 'Đa khoa'}</span>
                                       </div>
                                   </div>
                                   <div className="col-md-6">
                                       <div className="adp-info-group">
                                            <span className="adp-label text-muted small fw-bold text-uppercase"><FaUserMd className="me-1"/> Bác sĩ phụ trách</span>
                                            <span className="adp-value fw-bold">{selectedDetail.Doctor?.user?.full_name || 'Chưa chỉ định'}</span>
                                       </div>
                                   </div>
                                   <div className="col-md-6">
                                       <div className="adp-info-group">
                                            <span className="adp-label text-muted small fw-bold text-uppercase"><FaVideo className="me-1"/> Hình thức</span>
                                            <span className="adp-value fw-bold">
                                                {selectedDetail.appointment_type === 'online' ? 'Tư vấn trực tuyến' : 'Khám tại viện'}
                                            </span>
                                       </div>
                                   </div>
                                   <div className="col-md-6">
                                       <div className="adp-info-group">
                                            <span className="adp-label text-muted small fw-bold text-uppercase"><FaCalendarDay className="me-1"/> Ngày khám</span>
                                            <span className="adp-value fw-bold">
                                                {selectedDetail.appointment_date ? new Date(selectedDetail.appointment_date).toLocaleDateString('vi-VN') : '---'}
                                            </span>
                                       </div>
                                   </div>
                                   <div className="col-md-6">
                                       <div className="adp-info-group">
                                            <span className="adp-label text-muted small fw-bold text-uppercase"><FaClock className="me-1"/> Giờ khám</span>
                                            <span className="adp-value fw-bold">
                                                {selectedDetail.appointment_start_time?.slice(0,5)} - {selectedDetail.appointment_end_time?.slice(0,5)}
                                            </span>
                                       </div>
                                   </div>
                                   <div className="col-12">
                                       <div className="adp-info-group">
                                            <span className="adp-label text-muted small fw-bold text-uppercase"><FaMapMarkerAlt className="me-1"/> Địa chỉ</span>
                                            <span className="adp-value fw-bold">{selectedDetail.appointment_address || 'Tầng 1, Tòa nhà Clinic, 123 Đường Sức Khỏe, Quận 1, TP. HCM'}</span>
                                       </div>
                                   </div>
                               </div>
                           </div>
                       </div>

                       {/* CARD 2: THÔNG TIN BỆNH NHÂN */}
                       <div className="adp-card bg-white rounded-3 shadow-sm border">
                           <div className="adp-card-header px-3 py-2 border-bottom d-flex align-items-center bg-white rounded-top-3">
                               <FaUser className="text-primary me-2" />
                               <h6 className="adp-section-title m-0 fw-bold text-uppercase text-dark" style={{fontSize: '0.9rem'}}>Thông tin bệnh nhân</h6>
                           </div>
                           <div className="adp-card-body p-3">
                               <div className="row g-3">
                                   <div className="col-md-6">
                                       <div className="adp-info-group">
                                           <span className="adp-label text-muted small fw-bold text-uppercase">Họ và tên</span>
                                           <span className="adp-value text-uppercase fw-bold text-dark">{selectedDetail.guest_name || selectedDetail.Patient?.User?.full_name}</span>
                                       </div>
                                   </div>
                                   <div className="col-md-6">
                                       <div className="adp-info-group">
                                           <span className="adp-label text-muted small fw-bold text-uppercase">Số điện thoại</span>
                                           <span className="adp-value fw-bold">{selectedDetail.guest_phone || selectedDetail.Patient?.User?.phone || '---'}</span>
                                       </div>
                                   </div>
                                   <div className="col-md-6">
                                       <div className="adp-info-group">
                                           <span className="adp-label text-muted small fw-bold text-uppercase">Email</span>
                                           <span className="adp-value fw-bold">{selectedDetail.guest_email || selectedDetail.Patient?.User?.email || '---'}</span>
                                       </div>
                                   </div>
                                   <div className="col-md-6">
                                       <div className="adp-info-group">
                                           <span className="adp-label text-muted small fw-bold text-uppercase">Giới tính / Năm sinh</span>
                                           <span className="adp-value fw-bold">
                                              {selectedDetail.Patient?.User?.gender || '---'} - {selectedDetail.Patient?.User?.dob ? new Date(selectedDetail.Patient.User.dob).getFullYear() : '---'}
                                           </span>
                                       </div>
                                   </div>
                                   <div className="col-12">
                                       <div className="p-3 bg-warning bg-opacity-10 rounded border border-warning text-dark mt-2">
                                           <strong className="d-block mb-1 text-warning-emphasis small text-uppercase"><FaStethoscope className="me-1"/> Lý do khám / Triệu chứng:</strong>
                                           <span className="fst-italic">{selectedDetail.reason || 'Bệnh nhân không ghi chú thêm.'}</span>
                                       </div>
                                   </div>
                               </div>
                           </div>
                       </div>
                   </div>

                   {/* --- CỘT PHẢI: THANH TOÁN & ACTION --- */}
                   <div className="d-flex flex-column gap-3">
                       
                       {/* CARD THANH TOÁN */}
                       <div className="adp-card bg-white rounded-3 shadow-sm border border-success">
                           <div className="adp-card-header px-3 py-2 border-bottom bg-success text-white rounded-top-3">
                               <FaMoneyBillWave className="me-2" />
                               <h6 className="adp-section-title text-white m-0 fw-bold text-uppercase" style={{fontSize: '0.9rem'}}>Thanh toán</h6>
                           </div>
                           <div className="adp-card-body p-3 d-flex flex-column gap-3">
                               <div className="text-center py-2">
                                   <span className="adp-label d-block text-muted small fw-bold text-uppercase mb-1">Tổng chi phí dịch vụ</span>
                                   <div className="adp-value price d-block text-danger fw-bolder fs-3">
                                      {selectedDetail.Service?.price ? selectedDetail.Service.price.toLocaleString('vi-VN') : '0'} <small>VNĐ</small>
                                   </div>
                               </div>

                               <div className="border-top pt-3 text-center">
                                   <span className="adp-label d-block text-muted small fw-bold text-uppercase mb-2">Trạng thái thanh toán</span>
                                   {(selectedDetail.payment_status === 'paid' || selectedDetail.payment_status === 'paid_online' || selectedDetail.payment_status === 'paid_at_clinic') ? (
                                       <span className="badge bg-success bg-opacity-25 text-success border border-success px-3 py-2 rounded-pill fw-bold">
                                           <FaCheckCircle className="me-1" /> ĐÃ THANH TOÁN
                                       </span>
                                   ) : (
                                       <span className="badge bg-warning bg-opacity-25 text-warning-emphasis border border-warning px-3 py-2 rounded-pill fw-bold">
                                           <FaClock className="me-1" /> CHƯA THANH TOÁN
                                       </span>
                                   )}
                               </div>

                               {/* Nút Thu Tiền - Chỉ hiện nếu chưa thanh toán và không bị hủy */}
                               {['pending', 'confirmed', 'waiting_exam'].includes(selectedDetail.status) && selectedDetail.payment_status === 'unpaid' && (
                                   <Button 
                                      variant="success" 
                                      size="lg" 
                                      className="w-100 fw-bold shadow-sm mt-2 text-uppercase"
                                      onClick={() => { setShowDetailModal(false); setSelectedBill(selectedDetail); setActiveTab('cashier'); }}
                                   >
                                       <FaMoneyBillWave className="me-2"/> Thu tiền ngay
                                   </Button>
                               )}
                           </div>
                       </div>
                       
                       {/* CARD KẾT QUẢ (Nếu đã hoàn thành) */}
                       {selectedDetail.status === 'completed' && (
                         <div className="adp-card bg-white rounded-3 shadow-sm border">
                            <div className="adp-card-header px-3 py-2 border-bottom bg-info bg-opacity-10">
                               <FaShieldAlt className="text-info me-2"/>
                               <h6 className="adp-section-title m-0 fw-bold text-uppercase text-dark" style={{fontSize: '0.9rem'}}>Kết quả khám</h6>
                            </div>
                            <div className="adp-card-body p-3">
                               {selectedDetail.MedicalRecord ? (
                                  <div className="text-success fw-bold d-flex align-items-center gap-2">
                                     <FaCheckCircle/> Đã có hồ sơ bệnh án
                                  </div>
                               ) : (
                                  <div className="text-muted fst-italic text-center">Bác sĩ chưa cập nhật kết quả.</div>
                               )}
                            </div>
                         </div>
                       )}

                       <Button variant="outline-secondary" className="w-100 mt-auto" onClick={() => setShowDetailModal(false)}>
                           Đóng cửa sổ
                       </Button>
                   </div>
               </div>
           )}
        </Modal.Body>
      </Modal>
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
      {/* ==================================================================================== */}
      {/* MODAL IN ẤN - FINAL DESIGN (COMPACT & PROFESSIONAL) */}
      {/* ==================================================================================== */}
      {showPrintModal && printData && (
        <div className="front-desk-page-modal-backdrop">
          <div className="print-modal-content">
             
             {/* HEADER (Ẩn khi in) */}
             <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light no-print">
                 <div className="fw-bold text-success text-uppercase small d-flex align-items-center gap-2">
                    {printData.printType === 'ticket' ? <FaTicketAlt/> : <FaPrint/>} 
                    {printData.printType === 'ticket' ? 'XEM TRƯỚC PHIẾU' : 'XEM TRƯỚC HÓA ĐƠN'}
                 </div>
                 <button className="btn-close btn-sm" onClick={() => setShowPrintModal(false)}></button>
             </div>

             {/* BODY (Vùng cuộn chứa nội dung in) */}
             <div className="print-scroll-container printable-area">
                  
                  {/* --- MẪU 1: PHIẾU SỐ THỨ TỰ (Gọn gàng) --- */}
                  {printData.printType === 'ticket' ? (
                      <div className="text-center" style={{fontFamily: 'Inter, sans-serif'}}>
                          {/* Logo & Tên */}
                          <div className="mb-1">
                              <h6 className="fw-bold text-uppercase text-success m-0" style={{fontSize: '14px'}}>PK ĐA KHOA CLINIC SYSTEM</h6>
                              <div style={{fontSize: '10px'}} className="text-muted">123 Đường Sức Khỏe, Quận 1, TP.HCM</div>
                          </div>
                          
                          <div className="ticket-divider"></div>

                          <h5 className="fw-bold text-uppercase m-0" style={{fontSize: '16px', letterSpacing: '1px'}}>PHIẾU SỐ THỨ TỰ</h5>
                          <div className="fst-italic text-muted" style={{fontSize: '11px'}}>(Vui lòng chờ tại sảnh)</div>

                          {/* SỐ THỨ TỰ (Nổi bật nhất) */}
                          <div className="my-3 py-2 border rounded-3 bg-light" style={{border: '2px dashed #4caf50'}}>
                              <div style={{fontSize: '12px'}} className="text-uppercase fw-bold text-muted">Số của bạn</div>
                              <div style={{fontSize: '64px', lineHeight: '1', fontWeight: '800', color: '#2e7d32'}}>
                                  {printData.payment_queue_number || printData.queue_number || '--'}
                              </div>
                          </div>

                          {/* Thông tin chi tiết (Căn trái) */}
                          <div className="text-start px-2">
                              <div className="row g-1">
                                  <div className="col-4"><span className="ticket-label">Khách hàng:</span></div>
                                  <div className="col-8"><span className="ticket-value text-uppercase">{printData.guest_name || printData.Patient?.User?.full_name}</span></div>
                                  
                                  <div className="col-4"><span className="ticket-label">Mã hồ sơ:</span></div>
                                  <div className="col-8"><span className="ticket-value">{printData.code}</span></div>

                                  <div className="col-4"><span className="ticket-label">Dịch vụ:</span></div>
                                  <div className="col-8"><span className="ticket-value text-primary">{printData.Service?.name}</span></div>
                              </div>
                          </div>

                          <div className="ticket-divider"></div>
                          
                          <div className="d-flex justify-content-between align-items-center" style={{fontSize: '10px'}}>
                              <span>Giờ lấy số: {new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                              <span className="fw-bold"><FaSmile className="text-warning"/> Xin cảm ơn!</span>
                          </div>
                      </div>
                  ) : (
                      /* --- MẪU 2: HÓA ĐƠN ĐẦY ĐỦ (Đã sửa) --- */
                      <div style={{fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#000'}}>
                          {/* 1. Header Phòng Khám */}
                          <div className="text-center mb-3">
                              <h6 className="fw-bold text-uppercase m-0" style={{fontSize: '16px'}}>
                                  {printData.clinicInfo?.name || "PHÒNG KHÁM CLINIC SYSTEM"}
                              </h6>
                              <div style={{fontSize: '11px'}}>{printData.clinicInfo?.address || "Hà Nội, Việt Nam"}</div>
                              <div style={{fontSize: '11px'}}>SĐT: {printData.clinicInfo?.phone || "1900 1234"}</div>
                              
                              <div className="ticket-divider"></div>
                              <h5 className="fw-bold m-0 mt-2">HÓA ĐƠN THANH TOÁN</h5>
                              <div className="fst-italic" style={{fontSize: '11px'}}>
                                  Ngày: {new Date().toLocaleString('vi-VN')}
                              </div>
                              <div style={{fontSize: '11px'}}>Mã HĐ: {printData.PaymentDetails?.transaction_id || printData.code}</div>
                          </div>

                          {/* 2. Thông tin khách */}
                          <div className="mb-3 border-bottom pb-2" style={{borderBottomStyle: 'dashed'}}>
                              <div className="d-flex justify-content-between">
                                  <span>Khách hàng:</span>
                                  <span className="fw-bold text-uppercase">{printData.guest_name || printData.Patient?.User?.full_name}</span>
                              </div>
                              <div className="d-flex justify-content-between">
                                  <span>Mã hồ sơ:</span>
                                  <span className="fw-bold">{printData.code}</span>
                              </div>
                              {printData.Doctor && (
                              <div className="d-flex justify-content-between">
                                  <span>Bác sĩ:</span>
                                  <span>{printData.Doctor?.user?.full_name}</span>
                              </div>
                              )}
                          </div>

                          {/* 3. Chi tiết dịch vụ/thuốc */}
                          <table className="w-100 mb-3" style={{borderCollapse: 'collapse'}}>
                              <thead>
                                  <tr style={{borderBottom: '1px solid #000'}}>
                                      <th className="py-1 text-start">Tên dịch vụ / Thuốc</th>
                                      <th className="py-1 text-center" style={{width: '30px'}}>SL</th>
                                      <th className="py-1 text-end">Thành tiền</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {/* Nếu là Hóa đơn Dịch vụ Khám */}
                                  {printData.Service && (
                                      <tr>
                                          <td className="py-2">{printData.Service?.name}</td>
                                          <td className="py-2 text-center">1</td>
                                          <td className="py-2 text-end">{formatMoney(printData.Service?.price)}</td>
                                      </tr>
                                  )}

                                  {/* Nếu là Hóa đơn Thuốc (Mở rộng logic này nếu in đơn thuốc) */}
                                  {printData.items && printData.items.map((item, idx) => (
                                      <tr key={idx}>
                                          <td className="py-1">
                                              {item.name} <br/>
                                              <small className="text-muted fst-italic">({item.unit || 'Đvi'})</small>
                                          </td>
                                          <td className="py-1 text-center">{item.qty}</td>
                                          <td className="py-1 text-end">{formatMoney(item.price * item.qty)}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>

                          <div className="ticket-divider"></div>

                          {/* 4. Tổng kết tiền (Quan trọng) */}
                          <div className="d-flex flex-column align-items-end mb-4">
                              <div className="d-flex justify-content-between w-100 mb-1" style={{fontSize: '14px'}}>
                                  <span className="fw-bold">TỔNG TIỀN:</span>
                                  <span className="fw-bold">{formatMoney(printData.Service?.price || printData.total_amount)}</span>
                              </div>
                              
                              {/* Chỉ hiện tiền khách đưa/thối lại nếu là tiền mặt */}
                              {printData.PaymentDetails?.method === 'cash' && printData.PaymentDetails?.info && (
                                  <>
                                      <div className="d-flex justify-content-between w-100 text-muted" style={{fontSize: '12px'}}>
                                          <span>Khách đưa:</span>
                                          <span>{formatMoney(printData.PaymentDetails.info.amount_received)}</span>
                                      </div>
                                      <div className="d-flex justify-content-between w-100" style={{fontSize: '14px'}}>
                                          <span className="fw-bold">TIỀN THỐI LẠI:</span>
                                          <span className="fw-bold text-dark">{formatMoney(printData.PaymentDetails.info.change_amount)}</span>
                                      </div>
                                  </>
                              )}
                          </div>

                          {/* 5. Lời cảm ơn */}
                          <div className="text-center" style={{fontSize: '12px'}}>
                              <div className="fw-bold mb-1">XIN CẢM ƠN QUÝ KHÁCH!</div>
                              <div className="fst-italic">Hẹn gặp lại</div>
                              <div className="mt-2 text-muted" style={{fontSize: '10px'}}>In bởi: {printData.PaymentDetails?.info?.cashier_name || 'Hệ thống'}</div>
                          </div>
                      </div>
                  )}
             </div>

             {/* FOOTER (Nút bấm luôn nổi) */}
             <div className="p-3 border-top bg-light d-flex gap-2 no-print">
                 <button 
                    className="btn btn-secondary flex-grow-1 fw-bold small" 
                    onClick={() => setShowPrintModal(false)}
                 >
                     ĐÓNG
                 </button>
                 <button 
                    className="btn btn-success flex-grow-1 fw-bold small shadow-sm d-flex align-items-center justify-content-center gap-2" 
                    onClick={() => window.print()}
                 >
                     <FaPrint /> IN NGAY
                 </button>
             </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default FrontDeskPage;