// server/routes/pharmacyRoutes.js

const express = require('express');
const router = express.Router();
const pharmacyController = require('../controllers/pharmacyController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// ============================================================
// NHÓM 1: PUBLIC — Quầy thuốc POS lấy danh sách thuốc
// Không yêu cầu auth vì FrontDeskPage đã được bảo vệ bởi ProtectedRoute
// ============================================================

// GET /api/pharmacy/medicines
// Lấy danh sách thuốc kèm stock_total (dùng cho POS bán lẻ + đơn thuốc)
router.get('/medicines', pharmacyController.getMedicinesForPOS);

// GET /api/pharmacy/medicines/:id
// Lấy chi tiết 1 thuốc + các lô còn hàng (dùng khi cần xem lô trước khi bán)
router.get('/medicines/:id', pharmacyController.getMedicineDetail);


// ============================================================
// NHÓM 2: BÁN THUỐC — Staff / Admin thực hiện tại quầy
// ============================================================

// POST /api/pharmacy/retail
// Tạo đơn bán lẻ (không theo đơn bác sĩ) → tự động trừ kho FEFO
router.post(
  '/retail',
  authenticateToken,
  authorize('admin', 'staff'),
  pharmacyController.createRetailOrder
);

// POST /api/pharmacy/sell-prescription
// Bán theo đơn thuốc bác sĩ (prescription_json từ MedicalRecord) → trừ kho
router.post(
  '/sell-prescription',
  authenticateToken,
  authorize('admin', 'staff'),
  pharmacyController.sellPrescription
);


// ============================================================
// NHÓM 3: QUẢN LÝ KHO — Admin / Staff quản lý kho
// ============================================================

// --- Tổng quan tồn kho ---

// GET /api/pharmacy/stock
// Danh sách tất cả thuốc với tổng tồn kho, trạng thái
router.get(
  '/stock',
  authenticateToken,
  authorize('admin', 'staff'),
  pharmacyController.getStock
);

// GET /api/pharmacy/stock/alerts
// Cảnh báo: hết hàng, sắp hết hạn (30/60 ngày), tồn thấp
router.get(
  '/stock/alerts',
  authenticateToken,
  authorize('admin', 'staff'),
  pharmacyController.getStockAlerts
);

// GET /api/pharmacy/stock/:medicineId/batches
// Lấy tất cả lô của 1 thuốc (kể cả đã hết, đã hạn)
router.get(
  '/stock/:medicineId/batches',
  authenticateToken,
  authorize('admin', 'staff'),
  pharmacyController.getBatchesByMedicine
);

// --- Nhập kho ---

// POST /api/pharmacy/stock/import
// Nhập lô thuốc mới vào kho
router.post(
  '/stock/import',
  authenticateToken,
  authorize('admin', 'staff'),
  pharmacyController.importStock
);

// --- Điều chỉnh / Kiểm kê ---

// POST /api/pharmacy/stock/adjust
// Điều chỉnh tồn kho (kiểm kê phát hiện sai lệch)
router.post(
  '/stock/adjust',
  authenticateToken,
  authorize('admin'),
  pharmacyController.adjustStock
);

// --- Lịch sử giao dịch ---

// GET /api/pharmacy/stock/transactions
// Lịch sử toàn bộ nhập/xuất/điều chỉnh
// Query params: medicine_id, type, from_date, to_date, page, limit
router.get(
  '/stock/transactions',
  authenticateToken,
  authorize('admin', 'staff'),
  pharmacyController.getTransactionHistory
);


// ============================================================
// NHÓM 4: NHÀ CUNG CẤP — Admin quản lý
// ============================================================

// GET /api/pharmacy/suppliers
router.get(
  '/suppliers',
  authenticateToken,
  authorize('admin', 'staff'),
  pharmacyController.getSuppliers
);

// POST /api/pharmacy/suppliers
router.post(
  '/suppliers',
  authenticateToken,
  authorize('admin'),
  pharmacyController.createSupplier
);

// PUT /api/pharmacy/suppliers/:id
router.put(
  '/suppliers/:id',
  authenticateToken,
  authorize('admin'),
  pharmacyController.updateSupplier
);

// DELETE /api/pharmacy/suppliers/:id
router.delete(
  '/suppliers/:id',
  authenticateToken,
  authorize('admin'),
  pharmacyController.deleteSupplier
);


module.exports = router;