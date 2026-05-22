// client/src/pages/PharmacyStockPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  FaWarehouse, FaBoxes, FaPlus, FaSearch, FaExclamationTriangle,
  FaCheckCircle, FaTimesCircle, FaClock, FaHistory, FaTruck,
  FaEdit, FaTrash, FaEye, FaSyncAlt, FaFileImport, FaChevronDown,
  FaChevronUp, FaFilter, FaTimes, FaBuilding, FaPhone, FaEnvelope,
  FaCalendarAlt, FaSortAmountDown, FaArrowUp, FaArrowDown
} from 'react-icons/fa';
import api from '../services/api';
import './PharmacyStockPage.css';

// ================================================================
// HELPERS
// ================================================================
const fmt = (n) => (n ?? 0).toLocaleString('vi-VN') + ' đ';
const fmtNum = (n) => (n ?? 0).toLocaleString('vi-VN');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtDateInput = (d) => d ? new Date(d).toISOString().split('T')[0] : '';

const daysUntil = (d) => {
  if (!d) return null;
  const diff = new Date(d) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const ALERT_COLOR = {
  out_of_stock:  { bg: '#fff0f0', border: '#ffcccc', text: '#c0392b', badge: '#e74c3c', label: 'Hết hàng' },
  low_stock:     { bg: '#fff8e1', border: '#ffe082', text: '#e65100', badge: '#f39c12', label: 'Tồn thấp' },
  expiring_soon: { bg: '#fff3e0', border: '#ffcc80', text: '#bf360c', badge: '#ff9800', label: 'Sắp hết hạn' },
  ok:            { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', badge: '#22c55e', label: 'Bình thường' },
};

const TABS = [
  { id: 'stock',        icon: FaBoxes,       label: 'Tồn kho' },
  { id: 'import',       icon: FaFileImport,  label: 'Nhập kho' },
  { id: 'transactions', icon: FaHistory,     label: 'Lịch sử GD' },
  { id: 'alerts',       icon: FaExclamationTriangle, label: 'Cảnh báo' },
  { id: 'suppliers',    icon: FaTruck,       label: 'Nhà cung cấp' },
];

const TRANSACTION_TYPES = {
  import:               { label: 'Nhập kho',        color: '#22c55e', icon: FaArrowUp },
  export_retail:        { label: 'Bán lẻ',           color: '#ef4444', icon: FaArrowDown },
  export_prescription:  { label: 'Theo đơn BS',      color: '#f97316', icon: FaArrowDown },
  adjust:               { label: 'Điều chỉnh',       color: '#8b5cf6', icon: FaEdit },
  destroy:              { label: 'Hủy thuốc',        color: '#6b7280', icon: FaTrash },
};

// ================================================================
// MODAL: NHẬP KHO
// ================================================================
const ImportModal = ({ onClose, onSuccess, suppliers }) => {
  const [medicines, setMedicines] = useState([]);
  const [medSearch, setMedSearch] = useState('');
  const [form, setForm] = useState({
    medicine_id: '', medicine_name: '',
    batch_code: '', expiry_date: '', quantity_import: '',
    import_price: '', supplier_id: '', import_date: fmtDateInput(new Date()), note: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/pharmacy/medicines', { params: { search: medSearch, limit: 50 } })
      .then(r => setMedicines(r.data.medicines || []))
      .catch(() => {});
  }, [medSearch]);

  const selectMed = (m) => setForm(f => ({ ...f, medicine_id: m.id, medicine_name: m.name }));

  const handleSubmit = async () => {
    if (!form.medicine_id || !form.expiry_date || !form.quantity_import) {
      return toast.warning('Vui lòng điền đủ: Thuốc, Hạn dùng, Số lượng');
    }
    setLoading(true);
    try {
      const res = await api.post('/pharmacy/stock/import', {
        ...form,
        quantity_import: parseInt(form.quantity_import),
        import_price: parseFloat(form.import_price) || 0,
        supplier_id: form.supplier_id || null
      });
      toast.success(res.data.message || 'Nhập kho thành công');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi nhập kho');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="psp-modal-overlay" onClick={onClose}>
      <div className="psp-modal" onClick={e => e.stopPropagation()}>
        <div className="psp-modal-header">
          <div className="psp-modal-title"><FaFileImport /> Nhập kho thuốc</div>
          <button className="psp-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="psp-modal-body">
          {/* Chọn thuốc */}
          <div className="psp-form-group">
            <label className="psp-label">Thuốc <span className="psp-required">*</span></label>
            {form.medicine_id ? (
              <div className="psp-selected-med">
                <span className="psp-selected-med-name">{form.medicine_name}</span>
                <button className="psp-btn-link" onClick={() => setForm(f => ({ ...f, medicine_id: '', medicine_name: '' }))}>
                  Đổi thuốc
                </button>
              </div>
            ) : (
              <div className="psp-med-picker">
                <div className="psp-search-wrap">
                  <FaSearch className="psp-search-icon" />
                  <input className="psp-input" placeholder="Tìm tên thuốc..."
                    value={medSearch} onChange={e => setMedSearch(e.target.value)} autoFocus />
                </div>
                <div className="psp-med-list">
                  {medicines.map(m => (
                    <div key={m.id} className="psp-med-item" onClick={() => selectMed(m)}>
                      <span className="psp-med-item-name">{m.name}</span>
                      <span className="psp-med-item-meta">{m.unit} · Tồn: {fmtNum(m.stock_total)}</span>
                    </div>
                  ))}
                  {medicines.length === 0 && <div className="psp-empty-small">Không tìm thấy thuốc</div>}
                </div>
              </div>
            )}
          </div>

          <div className="psp-form-row">
            <div className="psp-form-group">
              <label className="psp-label">Số lô</label>
              <input className="psp-input" placeholder="LOT-20260301-001 (tự tạo nếu trống)"
                value={form.batch_code} onChange={e => setForm(f => ({ ...f, batch_code: e.target.value }))} />
            </div>
            <div className="psp-form-group">
              <label className="psp-label">Hạn dùng <span className="psp-required">*</span></label>
              <input className="psp-input" type="date"
                value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
            </div>
          </div>

          <div className="psp-form-row">
            <div className="psp-form-group">
              <label className="psp-label">Số lượng nhập <span className="psp-required">*</span></label>
              <input className="psp-input" type="number" min="1" placeholder="0"
                value={form.quantity_import} onChange={e => setForm(f => ({ ...f, quantity_import: e.target.value }))} />
            </div>
            <div className="psp-form-group">
              <label className="psp-label">Giá nhập (đ/đơn vị)</label>
              <input className="psp-input" type="number" min="0" placeholder="0"
                value={form.import_price} onChange={e => setForm(f => ({ ...f, import_price: e.target.value }))} />
            </div>
          </div>

          <div className="psp-form-row">
            <div className="psp-form-group">
              <label className="psp-label">Nhà cung cấp</label>
              <select className="psp-input" value={form.supplier_id}
                onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                <option value="">-- Chọn NCC --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="psp-form-group">
              <label className="psp-label">Ngày nhập</label>
              <input className="psp-input" type="date"
                value={form.import_date} onChange={e => setForm(f => ({ ...f, import_date: e.target.value }))} />
            </div>
          </div>

          <div className="psp-form-group">
            <label className="psp-label">Ghi chú</label>
            <textarea className="psp-input psp-textarea" rows={2} placeholder="Ghi chú thêm..."
              value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>
        </div>
        <div className="psp-modal-footer">
          <button className="psp-btn psp-btn-ghost" onClick={onClose} disabled={loading}>Hủy</button>
          <button className="psp-btn psp-btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Đang nhập...' : <><FaFileImport /> Nhập kho</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ================================================================
// MODAL: XEM LÔ CỦA 1 THUỐC
// ================================================================
const BatchModal = ({ medicine, onClose }) => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/pharmacy/stock/${medicine.id}/batches`)
      .then(r => setBatches(r.data.batches || []))
      .catch(() => toast.error('Lỗi tải lô thuốc'))
      .finally(() => setLoading(false));
  }, [medicine.id]);

  const statusLabel = { active: 'Còn hàng', expired: 'Hết hạn', used_up: 'Hết hàng' };
  const statusColor = { active: '#22c55e', expired: '#ef4444', used_up: '#9ca3af' };

  return (
    <div className="psp-modal-overlay" onClick={onClose}>
      <div className="psp-modal psp-modal-wide" onClick={e => e.stopPropagation()}>
        <div className="psp-modal-header">
          <div className="psp-modal-title">
            <FaBoxes /> Chi tiết lô — <span className="psp-modal-subtitle">{medicine.name}</span>
          </div>
          <button className="psp-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="psp-modal-body">
          {loading ? <div className="psp-loading">Đang tải...</div> : (
            <table className="psp-table">
              <thead>
                <tr>
                  <th>Số lô</th><th>Hạn dùng</th><th>SL nhập</th>
                  <th>Còn lại</th><th>Giá nhập</th><th>Nhà CC</th><th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => {
                  const days = daysUntil(b.expiry_date);
                  return (
                    <tr key={b.id}>
                      <td><span className="psp-batch-code">{b.batch_code}</span></td>
                      <td>
                        <span style={{ color: days !== null && days <= 30 ? '#ef4444' : days !== null && days <= 60 ? '#f97316' : 'inherit' }}>
                          {fmtDate(b.expiry_date)}
                          {days !== null && days <= 60 && <small className="psp-days-badge"> ({days}N)</small>}
                        </span>
                      </td>
                      <td className="text-right">{fmtNum(b.quantity_import)}</td>
                      <td className="text-right"><strong>{fmtNum(b.quantity_remaining)}</strong></td>
                      <td className="text-right">{fmt(b.import_price)}</td>
                      <td>{b.Supplier?.name || '—'}</td>
                      <td>
                        <span className="psp-status-dot" style={{ background: statusColor[b.status] }}>
                          {statusLabel[b.status] || b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {batches.length === 0 && (
                  <tr><td colSpan="7" className="psp-empty-row">Chưa có lô nào</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ================================================================
// MODAL: SUPPLIER FORM
// ================================================================
const SupplierModal = ({ supplier, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: supplier?.name || '', phone: supplier?.phone || '',
    email: supplier?.email || '', address: supplier?.address || '',
    tax_code: supplier?.tax_code || '', contact_person: supplier?.contact_person || '',
    status: supplier?.status || 'active'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.warning('Tên nhà cung cấp là bắt buộc');
    setLoading(true);
    try {
      if (supplier?.id) {
        await api.put(`/pharmacy/suppliers/${supplier.id}`, form);
        toast.success('Cập nhật nhà cung cấp thành công');
      } else {
        await api.post('/pharmacy/suppliers', form);
        toast.success('Thêm nhà cung cấp thành công');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="psp-modal-overlay" onClick={onClose}>
      <div className="psp-modal" onClick={e => e.stopPropagation()}>
        <div className="psp-modal-header">
          <div className="psp-modal-title">
            <FaTruck /> {supplier ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
          </div>
          <button className="psp-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="psp-modal-body">
          <div className="psp-form-group">
            <label className="psp-label">Tên nhà cung cấp <span className="psp-required">*</span></label>
            <input className="psp-input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="psp-form-row">
            <div className="psp-form-group">
              <label className="psp-label">Số điện thoại</label>
              <input className="psp-input" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="psp-form-group">
              <label className="psp-label">Email</label>
              <input className="psp-input" type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="psp-form-row">
            <div className="psp-form-group">
              <label className="psp-label">Mã số thuế</label>
              <input className="psp-input" value={form.tax_code}
                onChange={e => setForm(f => ({ ...f, tax_code: e.target.value }))} />
            </div>
            <div className="psp-form-group">
              <label className="psp-label">Người liên hệ</label>
              <input className="psp-input" value={form.contact_person}
                onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} />
            </div>
          </div>
          <div className="psp-form-group">
            <label className="psp-label">Địa chỉ</label>
            <input className="psp-input" value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          {supplier && (
            <div className="psp-form-group">
              <label className="psp-label">Trạng thái</label>
              <select className="psp-input" value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
              </select>
            </div>
          )}
        </div>
        <div className="psp-modal-footer">
          <button className="psp-btn psp-btn-ghost" onClick={onClose} disabled={loading}>Hủy</button>
          <button className="psp-btn psp-btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ================================================================
// MAIN PAGE
// ================================================================
const PharmacyStockPage = () => {
  const [activeTab, setActiveTab] = useState('stock');

  // --- Stock tab state ---
  const [stock, setStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [stockStatus, setStockStatus] = useState('all');
  const [stockPage, setStockPage] = useState(1);
  const [stockTotal, setStockTotal] = useState(0);
  const [batchModalMed, setBatchModalMed] = useState(null);

  // --- Import modal ---
  const [showImportModal, setShowImportModal] = useState(false);

  // --- Transactions tab state ---
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txFilter, setTxFilter] = useState({ type: '', from_date: '', to_date: '', medicine_id: '' });
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);

  // --- Alerts tab state ---
  const [alerts, setAlerts] = useState(null);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // --- Suppliers tab state ---
  const [suppliers, setSuppliers] = useState([]);
  const [supplierModal, setSupplierModal] = useState(null); // null | {} (new) | supplier (edit)
  const [suppLoading, setSuppLoading] = useState(false);

  // ---- LOAD FUNCTIONS ----
  const loadStock = useCallback(async () => {
    setStockLoading(true);
    try {
      const res = await api.get('/pharmacy/stock', {
        params: { search: stockSearch, status: stockStatus, page: stockPage, limit: 20 }
      });
      setStock(res.data.stock || []);
      setStockTotal(res.data.pagination?.totalItems || 0);
    } catch { toast.error('Lỗi tải tồn kho'); }
    finally { setStockLoading(false); }
  }, [stockSearch, stockStatus, stockPage]);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await api.get('/pharmacy/stock/transactions', {
        params: { ...txFilter, page: txPage, limit: 30 }
      });
      setTransactions(res.data.transactions || []);
      setTxTotal(res.data.pagination?.totalItems || 0);
    } catch { toast.error('Lỗi tải lịch sử'); }
    finally { setTxLoading(false); }
  }, [txFilter, txPage]);

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await api.get('/pharmacy/stock/alerts');
      setAlerts(res.data.alerts);
    } catch { toast.error('Lỗi tải cảnh báo'); }
    finally { setAlertsLoading(false); }
  }, []);

  const loadSuppliers = useCallback(async () => {
    setSuppLoading(true);
    try {
      const res = await api.get('/pharmacy/suppliers', { params: { status: 'all' } });
      setSuppliers(res.data.suppliers || []);
    } catch { toast.error('Lỗi tải nhà cung cấp'); }
    finally { setSuppLoading(false); }
  }, []);

  useEffect(() => { if (activeTab === 'stock' || activeTab === 'import') loadStock(); }, [activeTab, loadStock]);
  useEffect(() => { if (activeTab === 'transactions') loadTransactions(); }, [activeTab, loadTransactions]);
  useEffect(() => { if (activeTab === 'alerts') loadAlerts(); }, [activeTab, loadAlerts]);
  useEffect(() => { if (activeTab === 'suppliers') loadSuppliers(); }, [activeTab, loadSuppliers]);

  const handleDeleteSupplier = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa nhà cung cấp này?')) return;
    try {
      await api.delete(`/pharmacy/suppliers/${id}`);
      toast.success('Đã xóa nhà cung cấp');
      loadSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa');
    }
  };

  // ================================================================
  // RENDER: TAB TỒN KHO
  // ================================================================
  const renderStock = () => (
    <div className="psp-tab-content">
      {/* Toolbar */}
      <div className="psp-toolbar">
        <div className="psp-search-wrap psp-search-md">
          <FaSearch className="psp-search-icon" />
          <input className="psp-input" placeholder="Tìm tên thuốc, nhà sản xuất..."
            value={stockSearch}
            onChange={e => { setStockSearch(e.target.value); setStockPage(1); }} />
        </div>
        <div className="psp-filter-group">
          {['all', 'out', 'low', 'expiring'].map(s => (
            <button key={s}
              className={`psp-filter-btn ${stockStatus === s ? 'active' : ''}`}
              onClick={() => { setStockStatus(s); setStockPage(1); }}>
              {s === 'all' ? 'Tất cả' : s === 'out' ? '🔴 Hết hàng' : s === 'low' ? '🟡 Tồn thấp' : '🟠 Sắp hạn'}
            </button>
          ))}
        </div>
        <div className="psp-toolbar-right">
          <span className="psp-total-label">{fmtNum(stockTotal)} thuốc</span>
          <button className="psp-btn psp-btn-ghost psp-btn-sm" onClick={loadStock}><FaSyncAlt /></button>
          <button className="psp-btn psp-btn-primary" onClick={() => setShowImportModal(true)}>
            <FaFileImport /> Nhập kho
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="psp-table-wrap">
        <table className="psp-table">
          <thead>
            <tr>
              <th style={{width: 40}}>#</th>
              <th>Tên thuốc</th>
              <th style={{width: 80}}>Đơn vị</th>
              <th style={{width: 100}} className="text-right">Tồn kho</th>
              <th style={{width: 110}} className="text-right">Giá bán</th>
              <th style={{width: 110}}>Hạn gần nhất</th>
              <th style={{width: 120}}>Nhà SX</th>
              <th style={{width: 120}}>Trạng thái</th>
              <th style={{width: 100}}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {stockLoading
              ? <tr><td colSpan="9" className="psp-loading-row">Đang tải...</td></tr>
              : stock.length === 0
                ? <tr><td colSpan="9" className="psp-empty-row">Không có dữ liệu</td></tr>
                : stock.map((m, idx) => {
                    const a = ALERT_COLOR[m.alert] || ALERT_COLOR.ok;
                    const days = daysUntil(m.nearest_expiry);
                    return (
                      <tr key={m.id} style={{ background: m.alert !== 'ok' ? a.bg : undefined }}>
                        <td className="psp-cell-muted">{(stockPage - 1) * 20 + idx + 1}</td>
                        <td>
                          <div className="psp-med-name">{m.name}</div>
                          {m.is_prescription_drug && <span className="psp-tag psp-tag-blue">Kê đơn</span>}
                        </td>
                        <td className="psp-cell-muted">{m.unit}</td>
                        <td className="text-right">
                          <span className="psp-stock-num" style={{ color: m.stock_total === 0 ? '#ef4444' : m.stock_total < m.min_stock_threshold ? '#f97316' : '#166534' }}>
                            {fmtNum(m.stock_total)}
                          </span>
                        </td>
                        <td className="text-right psp-cell-price">{fmt(m.price)}</td>
                        <td>
                          {m.nearest_expiry ? (
                            <span style={{ color: days !== null && days <= 30 ? '#ef4444' : days !== null && days <= 60 ? '#f97316' : '#4b5563', fontSize: 13 }}>
                              {fmtDate(m.nearest_expiry)}
                              {days !== null && days <= 60 && <small style={{ display: 'block', fontSize: 11 }}>{days} ngày</small>}
                            </span>
                          ) : <span className="psp-cell-muted">—</span>}
                        </td>
                        <td className="psp-cell-muted" style={{ fontSize: 12 }}>{m.manufacturer || '—'}</td>
                        <td>
                          <span className="psp-badge" style={{ background: a.badge }}>
                            {a.label}
                          </span>
                        </td>
                        <td>
                          <div className="psp-action-group">
                            <button className="psp-icon-btn psp-icon-btn-green" title="Xem lô"
                              onClick={() => setBatchModalMed(m)}><FaEye /></button>
                            <button className="psp-icon-btn psp-icon-btn-blue" title="Nhập thêm"
                              onClick={() => setShowImportModal(true)}><FaPlus /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {stockTotal > 20 && (
        <div className="psp-pagination">
          <button className="psp-btn psp-btn-ghost psp-btn-sm" disabled={stockPage === 1}
            onClick={() => setStockPage(p => p - 1)}>‹ Trước</button>
          <span className="psp-page-info">Trang {stockPage} / {Math.ceil(stockTotal / 20)}</span>
          <button className="psp-btn psp-btn-ghost psp-btn-sm" disabled={stockPage >= Math.ceil(stockTotal / 20)}
            onClick={() => setStockPage(p => p + 1)}>Sau ›</button>
        </div>
      )}
    </div>
  );

  // ================================================================
  // RENDER: TAB LỊCH SỬ GIAO DỊCH
  // ================================================================
  const renderTransactions = () => (
    <div className="psp-tab-content">
      {/* Filter bar */}
      <div className="psp-toolbar psp-toolbar-wrap">
        <div className="psp-filter-row">
          <select className="psp-input psp-input-sm" value={txFilter.type}
            onChange={e => setTxFilter(f => ({ ...f, type: e.target.value }))}>
            <option value="">Tất cả loại</option>
            {Object.entries(TRANSACTION_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <div className="psp-date-range">
            <span className="psp-label-inline">Từ</span>
            <input className="psp-input psp-input-sm" type="date" value={txFilter.from_date}
              onChange={e => setTxFilter(f => ({ ...f, from_date: e.target.value }))} />
            <span className="psp-label-inline">đến</span>
            <input className="psp-input psp-input-sm" type="date" value={txFilter.to_date}
              onChange={e => setTxFilter(f => ({ ...f, to_date: e.target.value }))} />
          </div>
          <button className="psp-btn psp-btn-primary psp-btn-sm" onClick={() => { setTxPage(1); loadTransactions(); }}>
            <FaFilter /> Lọc
          </button>
          <button className="psp-btn psp-btn-ghost psp-btn-sm" onClick={() => {
            setTxFilter({ type: '', from_date: '', to_date: '', medicine_id: '' });
            setTxPage(1);
          }}><FaTimes /> Xóa lọc</button>
        </div>
        <span className="psp-total-label">{fmtNum(txTotal)} giao dịch</span>
      </div>

      <div className="psp-table-wrap">
        <table className="psp-table">
          <thead>
            <tr>
              <th style={{width: 150}}>Thời gian</th>
              <th>Tên thuốc</th>
              <th style={{width: 110}}>Số lô</th>
              <th style={{width: 120}}>Loại GD</th>
              <th style={{width: 90}} className="text-right">Số lượng</th>
              <th style={{width: 110}} className="text-right">Đơn giá</th>
              <th style={{width: 130}}>Mã tham chiếu</th>
              <th style={{width: 130}}>Người thực hiện</th>
            </tr>
          </thead>
          <tbody>
            {txLoading
              ? <tr><td colSpan="8" className="psp-loading-row">Đang tải...</td></tr>
              : transactions.length === 0
                ? <tr><td colSpan="8" className="psp-empty-row">Không có giao dịch nào</td></tr>
                : transactions.map(tx => {
                    const typeInfo = TRANSACTION_TYPES[tx.type] || { label: tx.type, color: '#6b7280', icon: FaHistory };
                    const TypeIcon = typeInfo.icon;
                    const isIn = tx.quantity > 0;
                    return (
                      <tr key={tx.id}>
                        <td className="psp-cell-muted" style={{ fontSize: 12 }}>
                          {new Date(tx.created_at).toLocaleString('vi-VN')}
                        </td>
                        <td><span className="psp-med-name">{tx.Medicine?.name || '—'}</span></td>
                        <td className="psp-batch-code">{tx.Batch?.batch_code || '—'}</td>
                        <td>
                          <span className="psp-tx-type" style={{ color: typeInfo.color }}>
                            <TypeIcon style={{ marginRight: 4 }} />{typeInfo.label}
                          </span>
                        </td>
                        <td className="text-right">
                          <span style={{ color: isIn ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                            {isIn ? '+' : ''}{fmtNum(tx.quantity)} {tx.Medicine?.unit || ''}
                          </span>
                        </td>
                        <td className="text-right psp-cell-price">{tx.unit_price ? fmt(tx.unit_price) : '—'}</td>
                        <td className="psp-cell-muted" style={{ fontSize: 12 }}>{tx.reference_id || '—'}</td>
                        <td className="psp-cell-muted" style={{ fontSize: 12 }}>
                          {tx.CreatedBy?.full_name || tx.CreatedBy?.username || '—'}
                        </td>
                      </tr>
                    );
                  })
            }
          </tbody>
        </table>
      </div>

      {txTotal > 30 && (
        <div className="psp-pagination">
          <button className="psp-btn psp-btn-ghost psp-btn-sm" disabled={txPage === 1}
            onClick={() => setTxPage(p => p - 1)}>‹ Trước</button>
          <span className="psp-page-info">Trang {txPage} / {Math.ceil(txTotal / 30)}</span>
          <button className="psp-btn psp-btn-ghost psp-btn-sm" disabled={txPage >= Math.ceil(txTotal / 30)}
            onClick={() => setTxPage(p => p + 1)}>Sau ›</button>
        </div>
      )}
    </div>
  );

  // ================================================================
  // RENDER: TAB CẢNH BÁO
  // ================================================================
  const renderAlerts = () => {
    if (alertsLoading) return <div className="psp-loading-center">Đang tải cảnh báo...</div>;
    if (!alerts) return null;

    const sections = [
      { key: 'out_of_stock',      icon: FaTimesCircle,        color: '#ef4444', title: 'Thuốc hết hàng',            desc: 'Cần nhập kho ngay' },
      { key: 'expired_with_stock',icon: FaExclamationTriangle, color: '#dc2626', title: 'Lô đã hết hạn còn tồn',    desc: 'Cần xử lý hủy hoặc trả hàng' },
      { key: 'expiring_30_days',  icon: FaClock,               color: '#f97316', title: 'Sắp hết hạn trong 30 ngày', desc: 'Ưu tiên bán trước' },
      { key: 'expiring_60_days',  icon: FaClock,               color: '#f59e0b', title: 'Sắp hết hạn trong 60 ngày', desc: 'Theo dõi chặt' },
      { key: 'low_stock',         icon: FaExclamationTriangle, color: '#eab308', title: 'Tồn kho thấp',              desc: 'Dưới ngưỡng tối thiểu' },
    ];

    return (
      <div className="psp-tab-content">
        <div className="psp-alerts-header">
          <div className="psp-alert-summary">
            <span className="psp-alert-total">{alerts ? Object.values(alerts).reduce((s, a) => s + a.count, 0) : 0}</span>
            <span className="psp-alert-total-label">tổng cảnh báo</span>
          </div>
          <button className="psp-btn psp-btn-ghost psp-btn-sm" onClick={loadAlerts}><FaSyncAlt /> Làm mới</button>
        </div>

        <div className="psp-alerts-grid">
          {sections.map(s => {
            const data = alerts[s.key];
            if (!data) return null;
            const Icon = s.icon;
            return (
              <div key={s.key} className={`psp-alert-card ${data.count > 0 ? 'psp-alert-card-active' : ''}`}>
                <div className="psp-alert-card-header" style={{ borderLeftColor: s.color }}>
                  <Icon style={{ color: s.color, fontSize: 20 }} />
                  <div>
                    <div className="psp-alert-card-title">{s.title}</div>
                    <div className="psp-alert-card-desc">{s.desc}</div>
                  </div>
                  <span className="psp-alert-count" style={{ background: data.count > 0 ? s.color : '#9ca3af' }}>
                    {data.count}
                  </span>
                </div>
                {data.count > 0 && (
                  <div className="psp-alert-card-body">
                    {data.items.slice(0, 5).map((item, i) => (
                      <div key={i} className="psp-alert-item">
                        <span className="psp-alert-item-name">
                          {item.name || item.Medicine?.name || '—'}
                        </span>
                        <span className="psp-alert-item-meta">
                          {item.stock_total !== undefined
                            ? `Tồn: ${fmtNum(item.stock_total)} ${item.unit || ''}`
                            : item.expiry_date
                              ? `Hạn: ${fmtDate(item.expiry_date)} · Còn: ${fmtNum(item.quantity_remaining)}`
                              : ''}
                        </span>
                      </div>
                    ))}
                    {data.count > 5 && (
                      <div className="psp-alert-more">+{data.count - 5} thuốc khác</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ================================================================
  // RENDER: TAB NHÀ CUNG CẤP
  // ================================================================
  const renderSuppliers = () => (
    <div className="psp-tab-content">
      <div className="psp-toolbar">
        <span className="psp-total-label">{suppliers.length} nhà cung cấp</span>
        <div className="psp-toolbar-right">
          <button className="psp-btn psp-btn-ghost psp-btn-sm" onClick={loadSuppliers}><FaSyncAlt /></button>
          <button className="psp-btn psp-btn-primary" onClick={() => setSupplierModal({})}>
            <FaPlus /> Thêm NCC
          </button>
        </div>
      </div>

      <div className="psp-table-wrap">
        <table className="psp-table">
          <thead>
            <tr>
              <th style={{width: 40}}>#</th>
              <th>Tên nhà cung cấp</th>
              <th style={{width: 130}}>Số điện thoại</th>
              <th style={{width: 180}}>Email</th>
              <th style={{width: 130}}>Người liên hệ</th>
              <th style={{width: 120}}>Mã số thuế</th>
              <th style={{width: 110}}>Trạng thái</th>
              <th style={{width: 100}}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {suppLoading
              ? <tr><td colSpan="8" className="psp-loading-row">Đang tải...</td></tr>
              : suppliers.length === 0
                ? <tr><td colSpan="8" className="psp-empty-row">Chưa có nhà cung cấp nào</td></tr>
                : suppliers.map((s, i) => (
                    <tr key={s.id}>
                      <td className="psp-cell-muted">{i + 1}</td>
                      <td>
                        <div className="psp-supp-name">{s.name}</div>
                        {s.address && <small className="psp-cell-muted">{s.address}</small>}
                      </td>
                      <td className="psp-cell-muted">{s.phone || '—'}</td>
                      <td className="psp-cell-muted" style={{ fontSize: 12 }}>{s.email || '—'}</td>
                      <td className="psp-cell-muted">{s.contact_person || '—'}</td>
                      <td className="psp-cell-muted">{s.tax_code || '—'}</td>
                      <td>
                        <span className={`psp-badge ${s.status === 'active' ? 'psp-badge-green' : 'psp-badge-gray'}`}>
                          {s.status === 'active' ? 'Hoạt động' : 'Ngừng'}
                        </span>
                      </td>
                      <td>
                        <div className="psp-action-group">
                          <button className="psp-icon-btn psp-icon-btn-blue" title="Sửa"
                            onClick={() => setSupplierModal(s)}><FaEdit /></button>
                          <button className="psp-icon-btn psp-icon-btn-red" title="Xóa"
                            onClick={() => handleDeleteSupplier(s.id)}><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );

  // ================================================================
  // MAIN RENDER
  // ================================================================
  return (
    <div className="psp-page">
      {/* Header */}
      <div className="psp-page-header">
        <div className="psp-page-title">
          <FaWarehouse className="psp-page-icon" />
          <div>
            <h1 className="psp-h1">Quản lý Kho Thuốc</h1>
            <p className="psp-subtitle">Tồn kho · Nhập xuất · Lô hàng · Cảnh báo</p>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="psp-tabs">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const hasAlert = tab.id === 'alerts' && alerts?.total_alerts > 0;
          return (
            <button key={tab.id}
              className={`psp-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}>
              <Icon />
              <span>{tab.label}</span>
              {hasAlert && <span className="psp-tab-badge">{alerts.total_alerts}</span>}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="psp-content">
        {activeTab === 'stock'        && renderStock()}
        {activeTab === 'import'       && renderStock()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'alerts'       && renderAlerts()}
        {activeTab === 'suppliers'    && renderSuppliers()}
      </div>

      {/* Modals */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={loadStock}
          suppliers={suppliers.filter(s => s.status === 'active')}
        />
      )}
      {batchModalMed && (
        <BatchModal medicine={batchModalMed} onClose={() => setBatchModalMed(null)} />
      )}
      {supplierModal !== null && (
        <SupplierModal
          supplier={Object.keys(supplierModal).length > 0 ? supplierModal : null}
          onClose={() => setSupplierModal(null)}
          onSuccess={loadSuppliers}
        />
      )}
    </div>
  );
};

export default PharmacyStockPage;