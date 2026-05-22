// client/src/pages/StatisticsPage.js
import React, { useState, useEffect, useMemo } from 'react';
import paymentService from '../services/paymentService';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ComposedChart,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { toast } from 'react-toastify';
import { 
  FaChartLine, FaCalendarAlt, FaMoneyBillWave, FaWallet, 
  FaArrowUp, FaArrowDown, FaPrint, FaDownload,
  FaChartPie, FaFileInvoiceDollar, FaChartBar, FaTimes,
  FaFileExcel, FaFilePdf, FaFileWord, FaFilter,
  FaExchangeAlt, FaCalendarCheck, FaUndo,
  FaClipboardList, FaCheckCircle, FaCalendar
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import './StatisticsPage.css';

const StatisticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('overview');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [chartModalTitle, setChartModalTitle] = useState('');
  const [chartModalSubtitle, setChartModalSubtitle] = useState('');
  const [chartModalRows, setChartModalRows] = useState([]);
  const [chartType, setChartType] = useState('area');
  const [compareStats, setCompareStats] = useState(null);
  const filtersRef = React.useRef(null);
  
  // Mảng tháng dùng cho filter
  const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  // Filters
  const [filters, setFilters] = useState({
    startMonth: 1,
    endMonth: 12,
    compareYear: String(new Date().getFullYear() - 1)
  });

  const [stats, setStats] = useState({
    chart: [],
    appointmentChart: [],
    dailyChart: [],
    methodBreakdown: [],
    statusCounts: {},
    appointmentStatusCounts: {},
    refundStatusCounts: {},
    refundMonthly: [],
    topServices: [],
    topDoctors: [],
    summary: {
      total: 0,
      today: 0,
      total_transactions: 0,
      paid_transactions: 0,
      total_appointments: 0,
      completed_appointments: 0,
      cancelled_appointments: 0,
      total_refund_amount: 0,
      total_refund_requests: 0,
      completed_refund_requests: 0,
      pending_refund_requests: 0,
      avg_daily_revenue: 0,
      payment_conversion_rate: 0,
      appointment_completion_rate: 0,
      appointment_cancellation_rate: 0,
      refund_rate: 0
    }
  });

  const COLORS = ['#43a047', '#42a5f5', '#ffa726', '#ef5350', '#ab47bc'];

  const normalizeStatsPayload = (payload = {}) => {
    const rawData = Array.isArray(payload.chart) ? payload.chart : [];
    const rawAppointmentData = Array.isArray(payload.appointmentChart) ? payload.appointmentChart : [];
    const rawDailyData = Array.isArray(payload.dailyChart) ? payload.dailyChart : [];
    const summaryData = payload.summary || {};
    const methodBreakdown = Array.isArray(payload.methodBreakdown) ? payload.methodBreakdown : [];
    const refundMonthly = Array.isArray(payload.refundMonthly) ? payload.refundMonthly : [];
    const topServices = Array.isArray(payload.topServices) ? payload.topServices : [];
    const topDoctors = Array.isArray(payload.topDoctors) ? payload.topDoctors : [];

    const chart = Array.from({ length: 12 }, (_, i) => {
      const monthData = rawData.find(item => Number(item.month) === i + 1);
      return {
        month: i + 1,
        name: `T${i + 1}`,
        fullName: `Tháng ${i + 1}`,
        revenue: monthData ? Number(monthData.total) : 0,
        expense: monthData ? Number(monthData.total) * 0.2 : 0,
        profit: monthData ? Number(monthData.total) * 0.8 : 0,
      };
    });

    const appointmentChart = Array.from({ length: 12 }, (_, i) => {
      const monthData = rawAppointmentData.find(item => Number(item.month) === i + 1);
      return {
        month: i + 1,
        name: `T${i + 1}`,
        fullName: `Tháng ${i + 1}`,
        count: monthData ? Number(monthData.count) : 0
      };
    });

    const dailyChart = rawDailyData.map(item => ({
      day: item.day,
      count: Number(item.count || 0),
      revenue: Number(item.revenue || 0)
    }));

    return {
      chart,
      appointmentChart,
      dailyChart,
      methodBreakdown,
      statusCounts: payload.statusCounts || {},
      appointmentStatusCounts: payload.appointmentStatusCounts || {},
      refundStatusCounts: payload.refundStatusCounts || {},
      refundMonthly,
      topServices,
      topDoctors,
      summary: {
        total: Number(summaryData.total || 0),
        today: Number(summaryData.today || 0),
        total_transactions: Number(summaryData.total_transactions || 0),
        paid_transactions: Number(summaryData.paid_transactions || 0),
        total_appointments: Number(summaryData.total_appointments || 0),
        completed_appointments: Number(summaryData.completed_appointments || 0),
        cancelled_appointments: Number(summaryData.cancelled_appointments || 0),
        total_refund_amount: Number(summaryData.total_refund_amount || 0),
        total_refund_requests: Number(summaryData.total_refund_requests || 0),
        completed_refund_requests: Number(summaryData.completed_refund_requests || 0),
        pending_refund_requests: Number(summaryData.pending_refund_requests || 0),
        avg_daily_revenue: Number(summaryData.avg_daily_revenue || 0),
        payment_conversion_rate: Number(summaryData.payment_conversion_rate || 0),
        appointment_completion_rate: Number(summaryData.appointment_completion_rate || 0),
        appointment_cancellation_rate: Number(summaryData.appointment_cancellation_rate || 0),
        refund_rate: Number(summaryData.refund_rate || 0)
      }
    };
  };

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const compareYearValue = filters.compareYear ? Number(filters.compareYear) : null;
      const requests = [paymentService.getRevenueStatistics({ year })];
      if (compareYearValue) {
        requests.push(paymentService.getRevenueStatistics({ year: compareYearValue }));
      }

      const responses = await Promise.all(requests);
      const currentResponse = responses[0];
      const compareResponse = responses[1];

      if (currentResponse.data.success) {
        const normalizedCurrent = normalizeStatsPayload(currentResponse.data.data || {});
        setStats(normalizedCurrent);

        setCompareStats(
          compareResponse && compareResponse.data && compareResponse.data.success
            ? normalizeStatsPayload(compareResponse.data.data || {})
            : null
        );
      }
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, filters.compareYear]);

  // Filtered data based on month range
  const filteredData = useMemo(() => {
    return stats.chart.filter(item => 
      item.month >= filters.startMonth && item.month <= filters.endMonth
    );
  }, [stats.chart, filters]);

  // Analysis calculations
  const analysis = useMemo(() => {
    if (!filteredData.length) return { 
      avg: 0, maxMonth: 'N/A', growth: 0, pieData: [], 
      totalRevenue: 0, totalExpense: 0, totalProfit: 0,
      revenueShare: [], paymentMethodPie: [], appointmentPie: [], refundPie: [],
      totalTransactions: 0, totalAppointments: 0, refundAmount: 0
    };

    const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue, 0);
    const totalExpense = filteredData.reduce((sum, item) => sum + item.expense, 0);
    const totalProfit = filteredData.reduce((sum, item) => sum + item.profit, 0);
    const avg = totalRevenue / filteredData.length;

    const maxMonthObj = filteredData.reduce((prev, current) => 
      (prev.revenue > current.revenue) ? prev : current
    , { revenue: 0, name: 'N/A' });

    const currentMonth = new Date().getMonth();
    const currentMonthRev = stats.chart[currentMonth]?.revenue || 0;
    const prevMonthRev = stats.chart[currentMonth - 1]?.revenue || 0;
    let growth = 0;
    if (prevMonthRev > 0) {
      growth = ((currentMonthRev - prevMonthRev) / prevMonthRev) * 100;
    }

    const pieData = [
      { name: 'Chuyển khoản', value: Number(stats.methodBreakdown?.find(item => ['bank_transfer', 'vnpay', 'momo'].includes(item.method))?.total || 0) },
      { name: 'Tiền mặt', value: Number(stats.methodBreakdown?.find(item => item.method === 'cash')?.total || 0) },
      { name: 'Khác', value: Math.max(0, totalRevenue - (
        Number(stats.methodBreakdown?.find(item => ['bank_transfer', 'vnpay', 'momo'].includes(item.method))?.total || 0) +
        Number(stats.methodBreakdown?.find(item => item.method === 'cash')?.total || 0)
      )) },
    ];

    const paymentMethodPie = (stats.methodBreakdown || [])
      .map(item => ({ name: item.method, value: Number(item.total || 0) }))
      .filter(item => item.value > 0)
      .sort((left, right) => right.value - left.value);

    const appointmentPie = [
      { name: 'Hoàn thành', value: Number(stats.summary.completed_appointments || 0) },
      { name: 'Hủy', value: Number(stats.summary.cancelled_appointments || 0) },
      { name: 'Khác', value: Math.max(0, Number(stats.summary.total_appointments || 0) - Number(stats.summary.completed_appointments || 0) - Number(stats.summary.cancelled_appointments || 0)) }
    ].filter(item => item.value > 0);

    const refundPie = [
      { name: 'Đã hoàn', value: Number(stats.summary.completed_refund_requests || 0) },
      { name: 'Đang chờ', value: Number(stats.summary.pending_refund_requests || 0) },
      { name: 'Khác', value: Math.max(0, Number(stats.summary.total_refund_requests || 0) - Number(stats.summary.completed_refund_requests || 0) - Number(stats.summary.pending_refund_requests || 0)) }
    ].filter(item => item.value > 0);

    return {
      avg,
      maxMonth: maxMonthObj.fullName,
      growth,
      pieData,
      paymentMethodPie,
      appointmentPie,
      refundPie,
      totalRevenue,
      totalExpense,
      totalProfit,
      totalTransactions: Number(stats.summary.total_transactions || 0),
      totalAppointments: Number(stats.summary.total_appointments || 0),
      refundAmount: Number(stats.summary.total_refund_amount || 0)
    };
  }, [filteredData, stats.chart, stats.summary]);

  const paymentMethodData = useMemo(() => analysis.paymentMethodPie || [], [analysis.paymentMethodPie]);
  const appointmentStatusData = useMemo(() => [
    { name: 'Hoàn thành', value: Number(stats.summary.completed_appointments || 0) },
    { name: 'Đã hủy', value: Number(stats.summary.cancelled_appointments || 0) },
    { name: 'Tổng còn lại', value: Math.max(0, Number(stats.summary.total_appointments || 0) - Number(stats.summary.completed_appointments || 0) - Number(stats.summary.cancelled_appointments || 0)) }
  ].filter(item => item.value > 0), [stats.summary]);

  const refundStatusData = useMemo(() => [
    { name: 'Đã hoàn', value: Number(stats.summary.completed_refund_requests || 0) },
    { name: 'Đang chờ', value: Number(stats.summary.pending_refund_requests || 0) },
    { name: 'Tổng còn lại', value: Math.max(0, Number(stats.summary.total_refund_requests || 0) - Number(stats.summary.completed_refund_requests || 0) - Number(stats.summary.pending_refund_requests || 0)) }
  ].filter(item => item.value > 0), [stats.summary]);

  const radarData = useMemo(() => ([
    {
      metric: 'Doanh thu',
      value: Math.min(100, Number(stats.summary.total || 0) / 1000000),
      fullMark: 100
    },
    {
      metric: 'Lịch hẹn',
      value: Math.min(100, Number(stats.summary.total_appointments || 0)),
      fullMark: 100
    },
    {
      metric: 'Thanh toán',
      value: Math.min(100, Number(stats.summary.payment_conversion_rate || 0)),
      fullMark: 100
    },
    {
      metric: 'Hoàn thành',
      value: Math.min(100, Number(stats.summary.appointment_completion_rate || 0)),
      fullMark: 100
    },
    {
      metric: 'Hoàn tiền',
      value: Math.min(100, Number(stats.summary.refund_rate || 0)),
      fullMark: 100
    }
  ]), [stats.summary]);

  const topServicesData = useMemo(() => (stats.topServices || []).slice(0, 8).map((item, index) => ({
    name: item.name || `Dịch vụ ${index + 1}`,
    count: Number(item.count || 0)
  })), [stats.topServices]);

  const topDoctorsData = useMemo(() => (stats.topDoctors || []).slice(0, 8).map((item, index) => ({
    name: item.name || `Bác sĩ ${index + 1}`,
    count: Number(item.count || 0)
  })), [stats.topDoctors]);

  const dailyChartData = useMemo(() => (stats.dailyChart || []).map(item => ({
    ...item,
    dayLabel: String(item.day || '').slice(5) || item.day
  })), [stats.dailyChart]);

  const refundMonthlyData = useMemo(() => (stats.refundMonthly || []).map(item => ({
    ...item,
    label: item.fullName
  })), [stats.refundMonthly]);

  const comparisonMetrics = useMemo(() => {
    const compareSummary = compareStats?.summary || {};
    const currentSummary = stats.summary || {};
    const revenueDelta = Number(currentSummary.total || 0) - Number(compareSummary.total || 0);
    const appointmentDelta = Number(currentSummary.total_appointments || 0) - Number(compareSummary.total_appointments || 0);
    const refundDelta = Number(currentSummary.total_refund_amount || 0) - Number(compareSummary.total_refund_amount || 0);

    return {
      compareYear: filters.compareYear ? Number(filters.compareYear) : null,
      revenueDelta,
      revenueDeltaPercent: Number(compareSummary.total || 0) > 0 ? (revenueDelta / Number(compareSummary.total || 0)) * 100 : 0,
      appointmentDelta,
      appointmentDeltaPercent: Number(compareSummary.total_appointments || 0) > 0 ? (appointmentDelta / Number(compareSummary.total_appointments || 0)) * 100 : 0,
      refundDelta,
      refundDeltaPercent: Number(compareSummary.total_refund_amount || 0) > 0 ? (refundDelta / Number(compareSummary.total_refund_amount || 0)) * 100 : 0,
      currentRevenue: Number(currentSummary.total || 0),
      compareRevenue: Number(compareSummary.total || 0),
      currentAppointments: Number(currentSummary.total_appointments || 0),
      compareAppointments: Number(compareSummary.total_appointments || 0),
      currentRefunds: Number(currentSummary.total_refund_amount || 0),
      compareRefunds: Number(compareSummary.total_refund_amount || 0)
    };
  }, [compareStats, filters.compareYear, stats.summary]);

  const comparisonChartData = useMemo(() => {
    const compareChart = compareStats?.chart || [];
    return Array.from({ length: 12 }, (_, i) => ({
      month: `T${i + 1}`,
      currentRevenue: Number(stats.chart[i]?.revenue || 0),
      compareRevenue: Number(compareChart[i]?.revenue || 0),
      currentAppointments: Number(stats.appointmentChart[i]?.count || 0),
      compareAppointments: Number(compareStats?.appointmentChart?.[i]?.count || 0)
    }));
  }, [compareStats, stats.appointmentChart, stats.chart]);

  const insightCards = useMemo(() => {
    const completionRate = Number(stats.summary.appointment_completion_rate || 0);
    const cancellationRate = Number(stats.summary.appointment_cancellation_rate || 0);
    const paymentRate = Number(stats.summary.payment_conversion_rate || 0);
    const refundRate = Number(stats.summary.refund_rate || 0);

    return [
      {
        label: 'Tỷ lệ thanh toán',
        value: `${paymentRate.toFixed(1)}%`,
        note: `${stats.summary.paid_transactions || 0}/${stats.summary.total_appointments || 0} lịch đã thanh toán`,
        tone: 'success'
      },
      {
        label: 'Tỷ lệ hoàn thành',
        value: `${completionRate.toFixed(1)}%`,
        note: `${stats.summary.completed_appointments || 0} lịch hoàn thành`,
        tone: 'primary'
      },
      {
        label: 'Tỷ lệ hủy',
        value: `${cancellationRate.toFixed(1)}%`,
        note: `${stats.summary.cancelled_appointments || 0} lịch đã hủy`,
        tone: 'warning'
      },
      {
        label: 'Tỷ lệ hoàn tiền',
        value: `${refundRate.toFixed(1)}%`,
        note: `${stats.summary.completed_refund_requests || 0} yêu cầu đã xử lý`,
        tone: 'info'
      }
    ];
  }, [stats.summary]);

  const exportExcelWorkbook = (mode = 'all') => {
    const workbook = XLSX.utils.book_new();

    const financeRows = filteredData.map(item => ({
      'Tháng': item.fullName,
      'Doanh thu': item.revenue,
      'Chi phí': item.expense,
      'Lợi nhuận': item.profit
    }));
    const financeSheet = XLSX.utils.json_to_sheet(financeRows);
    XLSX.utils.book_append_sheet(workbook, financeSheet, 'Tai chinh');

    if (mode !== 'finance') {
      const operationsRows = stats.appointmentChart.map(item => ({
        'Tháng': item.fullName,
        'Số lịch hẹn': item.count
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(operationsRows), 'Van hanh');

      const refundRows = (stats.refundMonthly || []).map(item => ({
        'Tháng': item.fullName,
        'Chờ xử lý': item.pending,
        'Đang xử lý': item.processing,
        'Đã hoàn': item.completed,
        'Từ chối': item.rejected,
        'Tổng tiền hoàn': item.amount
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(refundRows), 'Hoan tien');
    }

    if (mode === 'comparison' || mode === 'all') {
      const compareRows = comparisonChartData.map(item => ({
        'Tháng': item.month,
        [`Doanh thu ${year}`]: item.currentRevenue,
        [`Doanh thu ${comparisonMetrics.compareYear || 'compare'}`]: item.compareRevenue,
        [`Lịch hẹn ${year}`]: item.currentAppointments,
        [`Lịch hẹn ${comparisonMetrics.compareYear || 'compare'}`]: item.compareAppointments
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(compareRows), 'So sanh');
    }

    const suffix = mode === 'finance' ? 'Tai_chinh' : mode === 'comparison' ? 'So_sanh' : 'Tong_hop';
    XLSX.writeFile(workbook, `Bao_cao_${suffix}_${year}.xlsx`);
    toast.success('Đã xuất báo cáo Excel!');
    setShowExportModal(false);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="statistics-custom-tooltip">
          <p className="label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="value" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Export functions
  const exportToExcel = () => exportExcelWorkbook('all');
  const exportFinanceExcel = () => exportExcelWorkbook('finance');
  const exportComparisonExcel = () => exportExcelWorkbook('comparison');
  const exportOperationsExcel = () => exportExcelWorkbook('operations');

  const exportToPDF = () => {
    window.print();
    toast.info('Vui lòng chọn "Lưu dưới dạng PDF" trong hộp thoại in');
    setShowExportModal(false);
  };

  const exportToCSV = () => {
    const csv = [
      ['Tháng', 'Doanh thu', 'Chi phí', 'Lợi nhuận'],
      ...filteredData.map(item => [item.fullName, item.revenue, item.expense, item.profit])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bao_cao_doanh_thu_${year}.csv`;
    link.click();
    toast.success('Đã xuất file CSV!');
    setShowExportModal(false);
  };

  const downloadRowsCsv = (fileName, rows) => {
    if (!rows || rows.length === 0) {
      toast.info('Không có dữ liệu để tải xuống');
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(header => JSON.stringify(row[header] ?? '')).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    toast.success('Đã tải xuống dữ liệu chart');
  };

  const openChartModal = (title, subtitle, rows) => {
    setChartModalTitle(title);
    setChartModalSubtitle(subtitle);
    setChartModalRows(rows);
    setShowChartModal(true);
  };

  const scrollToFilters = () => {
    filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="statistics-page-wrapper">
        <div className="statistics-loading">
          <div className="statistics-spinner"></div>
          <span style={{ color: '#666', fontSize: '0.9rem' }}>Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-page-wrapper">
      <div className="statistics-page-container">
        
        {/* HEADER */}
        <div className="statistics-header">
          <div className="statistics-header-top">
            <div>
              <h1 className="statistics-title">
                <FaChartLine size={20}/> Báo Cáo Doanh Thu
              </h1>
            </div>
            
            <div className="statistics-actions">
              <div className="statistics-select-group">
                <FaCalendarAlt size={14}/>
                <select 
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="statistics-select"
                >
                  {[2023, 2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>
              
              <button className="statistics-btn statistics-btn-secondary" onClick={() => setShowExportModal(true)}>
                <FaDownload size={13}/> Xuất báo cáo
              </button>
              
              <button className="statistics-btn statistics-btn-primary" onClick={() => window.print()}>
                <FaPrint size={13}/> In
              </button>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="statistics-tabs">
          <button 
            className={`statistics-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <FaChartLine size={13}/> Tổng quan
          </button>
          <button 
            className={`statistics-tab ${activeTab === 'charts' ? 'active' : ''}`}
            onClick={() => setActiveTab('charts')}
          >
            <FaChartBar size={13}/> Tài chính
          </button>
          <button 
            className={`statistics-tab ${activeTab === 'operations' ? 'active' : ''}`}
            onClick={() => setActiveTab('operations')}
          >
            <FaClipboardList size={13}/> Vận hành
          </button>
          <button 
            className={`statistics-tab ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('compare')}
          >
            <FaExchangeAlt size={13}/> So sánh
          </button>
          <button 
            className={`statistics-tab ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            <FaFileInvoiceDollar size={13}/> Chi tiết
          </button>
        </div>

        {/* KPI CARDS */}
        <div className="statistics-kpi-grid">
          <div className="statistics-kpi-card primary">
            <div className="statistics-kpi-header">
              <span className="statistics-kpi-label">Tổng doanh thu</span>
              <div className="statistics-kpi-icon">
                <FaMoneyBillWave size={16}/>
              </div>
            </div>
            <div className="statistics-kpi-value">{formatCurrency(analysis.totalRevenue)}</div>
            <div className="statistics-kpi-trend up">
              <FaArrowUp size={10}/> 100% tích lũy
            </div>
          </div>

          <div className="statistics-kpi-card success">
            <div className="statistics-kpi-header">
              <span className="statistics-kpi-label">Hôm nay</span>
              <div className="statistics-kpi-icon">
                <FaWallet size={16}/>
              </div>
            </div>
            <div className="statistics-kpi-value">{formatCurrency(stats.summary.today || 0)}</div>
            <div className="statistics-kpi-trend neutral">
              {new Date().toLocaleDateString('vi-VN')}
            </div>
          </div>

          <div className="statistics-kpi-card info">
            <div className="statistics-kpi-header">
              <span className="statistics-kpi-label">Trung bình</span>
              <div className="statistics-kpi-icon">
                <FaChartLine size={16}/>
              </div>
            </div>
            <div className="statistics-kpi-value">{formatCurrency(analysis.avg)}</div>
            <div className="statistics-kpi-trend neutral">
              Đỉnh: {analysis.maxMonth}
            </div>
          </div>

          <div className="statistics-kpi-card warning">
            <div className="statistics-kpi-header">
              <span className="statistics-kpi-label">Tăng trưởng</span>
              <div className="statistics-kpi-icon">
                <FaChartLine size={16}/>
              </div>
            </div>
            <div className="statistics-kpi-value">{analysis.growth.toFixed(1)}%</div>
            <div className={`statistics-kpi-trend ${analysis.growth >= 0 ? 'up' : 'down'}`}>
              {analysis.growth >= 0 ? <FaArrowUp size={10}/> : <FaArrowDown size={10}/>} So với tháng trước
            </div>
          </div>

          <div className="statistics-kpi-card info">
            <div className="statistics-kpi-header">
              <span className="statistics-kpi-label">Lịch hẹn</span>
              <div className="statistics-kpi-icon">
                <FaCalendarCheck size={16}/>
              </div>
            </div>
            <div className="statistics-kpi-value">{stats.summary.total_appointments || 0}</div>
            <div className="statistics-kpi-trend neutral">
              Hoàn thành: {stats.summary.completed_appointments || 0}
            </div>
          </div>

          <div className="statistics-kpi-card success">
            <div className="statistics-kpi-header">
              <span className="statistics-kpi-label">Tỷ lệ thanh toán</span>
              <div className="statistics-kpi-icon">
                <FaCheckCircle size={16}/>
              </div>
            </div>
            <div className="statistics-kpi-value">{(stats.summary.payment_conversion_rate || 0).toFixed(1)}%</div>
            <div className="statistics-kpi-trend neutral">
              {stats.summary.paid_transactions || 0}/{stats.summary.total_appointments || 0}
            </div>
          </div>

          <div className="statistics-kpi-card warning">
            <div className="statistics-kpi-header">
              <span className="statistics-kpi-label">Hoàn tiền</span>
              <div className="statistics-kpi-icon">
                <FaUndo size={16}/>
              </div>
            </div>
            <div className="statistics-kpi-value">{formatCurrency(stats.summary.total_refund_amount || 0)}</div>
            <div className="statistics-kpi-trend neutral">
              {stats.summary.completed_refund_requests || 0} yêu cầu đã xử lý
            </div>
          </div>
        </div>

        <div className="statistics-insight-strip">
          <div className="statistics-insight-head">
            <div>
              <p className="statistics-insight-kicker">CRM Insights</p>
              <h2 className="statistics-insight-title">Tóm tắt vận hành</h2>
            </div>
            <div className="statistics-insight-meta">
              <span>So sánh năm: {comparisonMetrics.compareYear || 'Chưa chọn'}</span>
            </div>
          </div>
          <div className="statistics-insight-grid">
            {insightCards.map((card) => (
              <div key={card.label} className={`statistics-insight-card ${card.tone}`}>
                <div className="statistics-insight-label">{card.label}</div>
                <div className="statistics-insight-value">{card.value}</div>
                <div className="statistics-insight-note">{card.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CONTENT BY TAB */}
        {activeTab === 'overview' && (
          <>
            {/* OVERVIEW TAB FILTERS */}
            <div ref={filtersRef} className="statistics-filter-bar">
              <div className="statistics-filter-grid">
                <div className="statistics-filter-item">
                  <label><FaFilter size={10}/> Từ tháng</label>
                  <select 
                    value={filters.startMonth}
                    onChange={(e) => setFilters({...filters, startMonth: parseInt(e.target.value)})}
                  >
                    {months.map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                
                <div className="statistics-filter-item">
                  <label>Đến tháng</label>
                  <select 
                    value={filters.endMonth}
                    onChange={(e) => setFilters({...filters, endMonth: parseInt(e.target.value)})}
                  >
                    {months.map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                
                <div className="statistics-filter-item">
                  <label><FaChartBar size={10}/> Loại biểu đồ</label>
                  <select 
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                  >
                    <option value="area">Diện tích</option>
                    <option value="bar">Cột</option>
                    <option value="line">Đường</option>
                  </select>
                </div>
                
                <div className="statistics-filter-item">
                  <label><FaExchangeAlt size={10}/> So sánh năm</label>
                  <select 
                    value={filters.compareYear || ''}
                    onChange={(e) => setFilters({...filters, compareYear: e.target.value || null})}
                  >
                    <option value="">Không</option>
                    {[2023, 2024, 2025].map(y => (
                      <option key={y} value={y}>Năm {y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="statistics-charts-grid">
              <div className="statistics-chart-card" style={{gridColumn: '1 / -1'}}>
                <div className="statistics-chart-header">
                  <h3 className="statistics-chart-title">
                    <FaChartLine/> Xu hướng doanh thu
                  </h3>
                  <div className="statistics-chart-actions">
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Xu hướng doanh thu', 'Dữ liệu theo tháng trong khoảng lọc hiện tại', filteredData.map(item => ({
                      Tháng: item.fullName,
                      DoanhThu: item.revenue,
                      ChiPhi: item.expense,
                      LoiNhuan: item.profit
                    })))} title="Xem chi tiết">
                      Chi tiết
                    </button>
                    <button className="statistics-chart-btn" onClick={scrollToFilters} title="Chỉnh bộ lọc">
                      Bộ lọc
                    </button>
                    <button className="statistics-chart-btn" onClick={() => downloadRowsCsv(`xu_huong_doanh_thu_${year}.csv`, filteredData.map(item => ({
                      Tháng: item.fullName,
                      DoanhThu: item.revenue,
                      ChiPhi: item.expense,
                      LoiNhuan: item.profit
                    })))} title="Tải xuống">
                      Tải xuống
                    </button>
                  </div>
                </div>
                <div className="statistics-chart-body">
                  <ResponsiveContainer width="100%" height={300}>
                    {chartType === 'area' && (
                      <AreaChart data={filteredData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#43a047" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#43a047" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                        <XAxis dataKey="name" tick={{fontSize: 11}} stroke="#666"/>
                        <YAxis tick={{fontSize: 11}} stroke="#666" tickFormatter={(val) => `${val/1000000}M`}/>
                        <Tooltip content={<CustomTooltip />}/>
                        <Legend wrapperStyle={{fontSize: '0.85rem'}}/>
                        <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#43a047" strokeWidth={2} fill="url(#colorRevenue)"/>
                      </AreaChart>
                    )}
                    {chartType === 'bar' && (
                      <BarChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                        <XAxis dataKey="name" tick={{fontSize: 11}} stroke="#666"/>
                        <YAxis tick={{fontSize: 11}} stroke="#666" tickFormatter={(val) => `${val/1000000}M`}/>
                        <Tooltip content={<CustomTooltip />}/>
                        <Legend wrapperStyle={{fontSize: '0.85rem'}}/>
                        <Bar dataKey="revenue" name="Doanh thu" fill="#43a047"/>
                        <Bar dataKey="expense" name="Chi phí" fill="#ef5350"/>
                      </BarChart>
                    )}
                    {chartType === 'line' && (
                      <LineChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                        <XAxis dataKey="name" tick={{fontSize: 11}} stroke="#666"/>
                        <YAxis tick={{fontSize: 11}} stroke="#666" tickFormatter={(val) => `${val/1000000}M`}/>
                        <Tooltip content={<CustomTooltip />}/>
                        <Legend wrapperStyle={{fontSize: '0.85rem'}}/>
                        <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#43a047" strokeWidth={2}/>
                        <Line type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#42a5f5" strokeWidth={2}/>
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="statistics-chart-card">
                <div className="statistics-chart-header">
                  <h3 className="statistics-chart-title">
                    <FaChartPie/> Cơ cấu nguồn thu
                  </h3>
                  <div className="statistics-chart-actions">
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Cơ cấu nguồn thu', 'Tỷ trọng nguồn thu theo phương thức', analysis.pieData.map(item => ({ Nguon: item.name, GiaTri: item.value })))}>
                      Chi tiết
                    </button>
                    <button className="statistics-chart-btn" onClick={() => downloadRowsCsv(`co_cau_nguon_thu_${year}.csv`, analysis.pieData.map(item => ({ Nguon: item.name, GiaTri: item.value })))}>
                      Tải xuống
                    </button>
                  </div>
                </div>
                <div className="statistics-chart-body">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={analysis.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analysis.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)}/>
                      <Legend wrapperStyle={{fontSize: '0.8rem'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="statistics-chart-card">
                <div className="statistics-chart-header">
                  <h3 className="statistics-chart-title">
                    <FaMoneyBillWave/> Phương thức thanh toán
                  </h3>
                  <div className="statistics-chart-actions">
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Phương thức thanh toán', 'Doanh thu và số lượt theo từng phương thức', paymentMethodData.map(item => ({ PhuongThuc: item.name, GiaTri: item.value })))}>
                      Chi tiết
                    </button>
                    <button className="statistics-chart-btn" onClick={scrollToFilters}>Bộ lọc</button>
                  </div>
                </div>
                <div className="statistics-chart-body">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {paymentMethodData.map((entry, index) => (
                          <Cell key={`method-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)}/>
                      <Legend wrapperStyle={{fontSize: '0.8rem'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="statistics-chart-card">
                <div className="statistics-chart-header">
                  <h3 className="statistics-chart-title">
                    <FaCalendarCheck/> Trạng thái lịch hẹn
                  </h3>
                  <div className="statistics-chart-actions">
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Trạng thái lịch hẹn', 'Phân bổ lịch hẹn theo trạng thái', appointmentStatusData.map(item => ({ TrangThai: item.name, SoLuong: item.value })))}>
                      Chi tiết
                    </button>
                    <button className="statistics-chart-btn" onClick={() => downloadRowsCsv(`trang_thai_lich_hen_${year}.csv`, appointmentStatusData.map(item => ({ TrangThai: item.name, SoLuong: item.value })))}>
                      Tải xuống
                    </button>
                  </div>
                </div>
                <div className="statistics-chart-body">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={appointmentStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {appointmentStatusData.map((entry, index) => (
                          <Cell key={`appointment-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} lịch`}/>
                      <Legend wrapperStyle={{fontSize: '0.8rem'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'charts' && (
          <>
            {/* FINANCE TAB FILTERS */}
            <div className="statistics-filter-bar">
              <div className="statistics-filter-grid">
                <div className="statistics-filter-item">
                  <label><FaFilter size={10}/> Từ tháng</label>
                  <select 
                    value={filters.startMonth}
                    onChange={(e) => setFilters({...filters, startMonth: parseInt(e.target.value)})}
                  >
                    {months.map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                
                <div className="statistics-filter-item">
                  <label>Đến tháng</label>
                  <select 
                    value={filters.endMonth}
                    onChange={(e) => setFilters({...filters, endMonth: parseInt(e.target.value)})}
                  >
                    {months.map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                
                <div className="statistics-filter-item">
                  <label><FaChartBar size={10}/> Loại biểu đồ</label>
                  <select 
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                  >
                    <option value="area">Diện tích</option>
                    <option value="bar">Cột</option>
                    <option value="line">Đường</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="statistics-charts-grid">
              <div className="statistics-chart-card" style={{gridColumn: '1 / -1'}}>
                <div className="statistics-chart-header">
                  <h3 className="statistics-chart-title">Doanh thu, chi phí và hoàn tiền</h3>
                  <div className="statistics-chart-actions">
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Doanh thu, chi phí và hoàn tiền', 'Dữ liệu tài chính theo tháng', filteredData.map(item => ({
                      Tháng: item.fullName,
                      DoanhThu: item.revenue,
                      ChiPhi: item.expense,
                      LoiNhuan: item.profit
                    })))}>
                      Chi tiết
                    </button>
                    <button className="statistics-chart-btn" onClick={scrollToFilters}>Bộ lọc</button>
                    <button className="statistics-chart-btn" onClick={() => downloadRowsCsv(`tai_chinh_${year}.csv`, filteredData.map(item => ({
                      Tháng: item.fullName,
                      DoanhThu: item.revenue,
                      ChiPhi: item.expense,
                      LoiNhuan: item.profit
                    })))}>
                      Tải xuống
                    </button>
                  </div>
                </div>
                <div className="statistics-chart-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={filteredData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                      <XAxis dataKey="name" tick={{fontSize: 11}}/>
                      <YAxis tick={{fontSize: 11}} tickFormatter={(val) => `${val/1000000}M`}/>
                      <Tooltip content={<CustomTooltip />}/>
                      <Legend wrapperStyle={{fontSize: '0.85rem'}}/>
                      <Bar dataKey="revenue" name="Doanh thu" fill="#43a047" />
                      <Bar dataKey="expense" name="Chi phí" fill="#ef5350" />
                      <Line type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#42a5f5" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="statistics-chart-card">
                <div className="statistics-chart-header">
                  <h3 className="statistics-chart-title">Doanh thu theo ngày gần nhất</h3>
                  <div className="statistics-chart-actions">
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Doanh thu theo ngày gần nhất', '30 ngày gần nhất', dailyChartData.map(item => ({
                      Ngay: item.day,
                      DoanhThu: item.revenue,
                      SoGiaoDich: item.count
                    })))}>
                      Chi tiết
                    </button>
                    <button className="statistics-chart-btn" onClick={() => downloadRowsCsv(`doanh_thu_theo_ngay_${year}.csv`, dailyChartData.map(item => ({
                      Ngay: item.day,
                      DoanhThu: item.revenue,
                      SoGiaoDich: item.count
                    })))}>
                      Tải xuống
                    </button>
                  </div>
                </div>
                <div className="statistics-chart-body">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={dailyChartData}>
                      <defs>
                        <linearGradient id="colorDailyRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#43a047" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#43a047" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                      <XAxis dataKey="dayLabel" tick={{fontSize: 10}}/>
                      <YAxis tick={{fontSize: 11}} tickFormatter={(val) => `${val/1000000}M`}/>
                      <Tooltip content={<CustomTooltip />}/>
                      <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#43a047" strokeWidth={2} fill="url(#colorDailyRevenue)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="statistics-chart-card">
                <div className="statistics-chart-header">
                  <h3 className="statistics-chart-title">Phân bổ trạng thái hoàn tiền</h3>
                  <div className="statistics-chart-actions">
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Phân bổ trạng thái hoàn tiền', 'Tổng số yêu cầu hoàn tiền theo trạng thái', refundStatusData.map(item => ({
                      TrangThai: item.name,
                      SoLuong: item.value
                    })))}>
                      Chi tiết
                    </button>
                    <button className="statistics-chart-btn" onClick={scrollToFilters}>Bộ lọc</button>
                  </div>
                </div>
                <div className="statistics-chart-body">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={refundStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {refundStatusData.map((entry, index) => (
                          <Cell key={`refund-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} yêu cầu`}/>
                      <Legend wrapperStyle={{fontSize: '0.8rem'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'operations' && (
          <>
            {/* OPERATIONS TAB FILTERS */}
            <div className="statistics-filter-bar">
              <div className="statistics-filter-grid">
                <div className="statistics-filter-item">
                  <label><FaFilter size={10}/> Từ tháng</label>
                  <select 
                    value={filters.startMonth}
                    onChange={(e) => setFilters({...filters, startMonth: parseInt(e.target.value)})}
                  >
                    {months.map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                
                <div className="statistics-filter-item">
                  <label>Đến tháng</label>
                  <select 
                    value={filters.endMonth}
                    onChange={(e) => setFilters({...filters, endMonth: parseInt(e.target.value)})}
                  >
                    {months.map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="statistics-charts-grid">
              <div className="statistics-chart-card" style={{gridColumn: '1 / -1'}}>
                <div className="statistics-chart-header">
                  <h3 className="statistics-chart-title">Số lượng lịch hẹn theo tháng</h3>
                  <div className="statistics-chart-actions">
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Số lượng lịch hẹn theo tháng', 'Tổng số lịch hẹn từng tháng', stats.appointmentChart.map(item => ({
                      Tháng: item.fullName,
                      SoLuong: item.count
                    })))}>
                      Chi tiết
                    </button>
                    <button className="statistics-chart-btn" onClick={scrollToFilters}>Bộ lọc</button>
                  </div>
                </div>
                <div className="statistics-chart-body">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stats.appointmentChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                      <XAxis dataKey="name" tick={{fontSize: 11}}/>
                      <YAxis tick={{fontSize: 11}}/>
                      <Tooltip formatter={(value) => `${value} lịch`}/>
                      <Legend wrapperStyle={{fontSize: '0.85rem'}}/>
                      <Bar dataKey="count" name="Lịch hẹn" fill="#42a5f5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="statistics-chart-card" style={{gridColumn: '1 / -1'}}>
                <div className="statistics-chart-header">
                  <h3 className="statistics-chart-title">Hoàn tiền theo tháng</h3>
                  <div className="statistics-chart-actions">
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Hoàn tiền theo tháng', 'Trạng thái hoàn tiền theo từng tháng', refundMonthlyData.map(item => ({
                      Tháng: item.label,
                      ChoXuLy: item.pending,
                      DangXuLy: item.processing,
                      DaHoan: item.completed,
                      TuChoi: item.rejected,
                      TongTienHoan: item.amount
                    })))}>
                      Chi tiết
                    </button>
                    <button className="statistics-chart-btn" onClick={() => downloadRowsCsv(`hoan_tien_theo_thang_${year}.csv`, refundMonthlyData.map(item => ({
                      Tháng: item.label,
                      ChoXuLy: item.pending,
                      DangXuLy: item.processing,
                      DaHoan: item.completed,
                      TuChoi: item.rejected,
                      TongTienHoan: item.amount
                    })))}>
                      Tải xuống
                    </button>
                  </div>
                </div>
                <div className="statistics-chart-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={refundMonthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                      <XAxis dataKey="label" tick={{fontSize: 11}}/>
                      <YAxis tick={{fontSize: 11}}/>
                      <Tooltip />
                      <Legend wrapperStyle={{fontSize: '0.85rem'}}/>
                      <Bar dataKey="pending" stackId="refund" name="Chờ xử lý" fill="#ffa726" />
                      <Bar dataKey="processing" stackId="refund" name="Đang xử lý" fill="#42a5f5" />
                      <Bar dataKey="completed" stackId="refund" name="Đã hoàn" fill="#43a047" />
                      <Bar dataKey="rejected" stackId="refund" name="Từ chối" fill="#ef5350" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="statistics-chart-card">
                <div className="statistics-chart-header">
                  <h3 className="statistics-chart-title">Top dịch vụ</h3>
                  <div className="statistics-chart-actions">
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Top dịch vụ', 'Dịch vụ được đặt nhiều nhất', topServicesData.map(item => ({
                      DichVu: item.name,
                      SoLuong: item.count
                    })))}>
                      Chi tiết
                    </button>
                  </div>
                </div>
                <div className="statistics-chart-body">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={topServicesData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                      <XAxis type="number" tick={{fontSize: 11}}/>
                      <YAxis type="category" dataKey="name" tick={{fontSize: 10}} width={120}/>
                      <Tooltip formatter={(value) => `${value} lượt`}/>
                      <Bar dataKey="count" name="Lượt đặt" fill="#43a047" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="statistics-chart-card">
                <div className="statistics-chart-header">
                  <h3 className="statistics-chart-title">Top bác sĩ</h3>
                  <div className="statistics-chart-actions">
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Top bác sĩ', 'Bác sĩ có nhiều lịch hẹn nhất', topDoctorsData.map(item => ({
                      BacSi: item.name,
                      SoLuong: item.count
                    })))}>
                      Chi tiết
                    </button>
                  </div>
                </div>
                <div className="statistics-chart-body">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={topDoctorsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                      <XAxis type="number" tick={{fontSize: 11}}/>
                      <YAxis type="category" dataKey="name" tick={{fontSize: 10}} width={120}/>
                      <Tooltip formatter={(value) => `${value} lịch hẹn`}/>
                      <Bar dataKey="count" name="Số lịch" fill="#ffa726" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'compare' && (
          <>
            {/* COMPARISON TAB FILTERS */}
            <div className="statistics-filter-bar">
              <div className="statistics-filter-grid">
                <div className="statistics-filter-item">
                  <label><FaExchangeAlt size={10}/> So sánh năm</label>
                  <select 
                    value={filters.compareYear || ''}
                    onChange={(e) => setFilters({...filters, compareYear: e.target.value || null})}
                  >
                    <option value="">Không</option>
                    {[2023, 2024, 2025].map(y => (
                      <option key={y} value={y}>Năm {y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="statistics-comparison">
              <div className="statistics-chart-header">
                <h3 className="statistics-chart-title">So sánh năm {year} với {comparisonMetrics.compareYear || 'năm trước'}</h3>
              </div>

              <div className="statistics-comparison-grid">
                <div className="statistics-comparison-item">
                  <div className="statistics-comparison-label">Doanh thu</div>
                  <div className="statistics-comparison-value">{formatCurrency(comparisonMetrics.currentRevenue)}</div>
                  <div className={`statistics-kpi-trend ${comparisonMetrics.revenueDelta >= 0 ? 'up' : 'down'}`}>
                    {comparisonMetrics.revenueDelta >= 0 ? <FaArrowUp size={10}/> : <FaArrowDown size={10}/>} {formatCurrency(Math.abs(comparisonMetrics.revenueDelta))} ({Math.abs(comparisonMetrics.revenueDeltaPercent).toFixed(1)}%)
                  </div>
                </div>
                <div className="statistics-comparison-item">
                  <div className="statistics-comparison-label">Lịch hẹn</div>
                  <div className="statistics-comparison-value">{comparisonMetrics.currentAppointments}</div>
                  <div className={`statistics-kpi-trend ${comparisonMetrics.appointmentDelta >= 0 ? 'up' : 'down'}`}>
                    {comparisonMetrics.appointmentDelta >= 0 ? <FaArrowUp size={10}/> : <FaArrowDown size={10}/>} {Math.abs(comparisonMetrics.appointmentDelta)} ({Math.abs(comparisonMetrics.appointmentDeltaPercent).toFixed(1)}%)
                  </div>
                </div>
                <div className="statistics-comparison-item">
                  <div className="statistics-comparison-label">Hoàn tiền</div>
                  <div className="statistics-comparison-value">{formatCurrency(comparisonMetrics.currentRefunds)}</div>
                  <div className={`statistics-kpi-trend ${comparisonMetrics.refundDelta >= 0 ? 'up' : 'down'}`}>
                    {comparisonMetrics.refundDelta >= 0 ? <FaArrowUp size={10}/> : <FaArrowDown size={10}/>} {formatCurrency(Math.abs(comparisonMetrics.refundDelta))} ({Math.abs(comparisonMetrics.refundDeltaPercent).toFixed(1)}%)
                  </div>
                </div>
                <div className="statistics-comparison-item">
                  <div className="statistics-comparison-label">Tỷ lệ thanh toán</div>
                  <div className="statistics-comparison-value">{(stats.summary.payment_conversion_rate || 0).toFixed(1)}%</div>
                  <div className="statistics-kpi-trend neutral">So với {comparisonMetrics.compareYear || 'năm trước'}</div>
                </div>
              </div>

              <div className="statistics-chart-card" style={{marginTop: '16px'}}>
                <div className="statistics-chart-header">
                  <h3 className="statistics-chart-title">Doanh thu so sánh theo tháng</h3>
                  <div className="statistics-chart-actions">
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Doanh thu so sánh theo tháng', `So sánh ${year} và ${comparisonMetrics.compareYear || 'năm trước'}`, comparisonChartData.map(item => ({
                      Thang: item.month,
                      DoanhThuHienTai: item.currentRevenue,
                      DoanhThuSoSanh: item.compareRevenue,
                      LichHenHienTai: item.currentAppointments,
                      LichHenSoSanh: item.compareAppointments
                    })))}>
                      Chi tiết
                    </button>
                  </div>
                </div>
                <div className="statistics-chart-body">
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={comparisonChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="month" tick={{fontSize: 11}} />
                      <YAxis tick={{fontSize: 11}} tickFormatter={(val) => `${val/1000000}M`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{fontSize: '0.85rem'}} />
                      <Line type="monotone" dataKey="currentRevenue" name={`Doanh thu ${year}`} stroke="#43a047" strokeWidth={2} />
                      <Line type="monotone" dataKey="compareRevenue" name={`Doanh thu ${comparisonMetrics.compareYear || 'N-1'}`} stroke="#ef5350" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="statistics-chart-card" style={{marginTop: '16px'}}>
                <div className="statistics-chart-header">
                  <h3 className="statistics-chart-title">Radar KPI tổng hợp</h3>
                </div>
                <div className="statistics-chart-body">
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Tooltip />
                      <Radar name="Hiệu suất" dataKey="value" stroke="#43a047" fill="#43a047" fillOpacity={0.35} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'table' && (
          <>
            {/* TABLE TAB FILTERS */}
            <div className="statistics-filter-bar">
              <div className="statistics-filter-grid">
                <div className="statistics-filter-item">
                  <label><FaCalendar size={12}/> Tháng bắt đầu</label>
                  <select 
                    value={filters.startMonth || ''}
                    onChange={(e) => setFilters({...filters, startMonth: parseInt(e.target.value) || null})}
                  >
                    <option value="">Tất cả</option>
                    {months.map((m, i) => (
                      <option key={i} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="statistics-filter-item">
                  <label><FaCalendar size={12}/> Tháng kết thúc</label>
                  <select 
                    value={filters.endMonth || ''}
                    onChange={(e) => setFilters({...filters, endMonth: parseInt(e.target.value) || null})}
                  >
                    <option value="">Tất cả</option>
                    {months.map((m, i) => (
                      <option key={i} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="statistics-table-card">
              <div className="statistics-table-header">
                <h3 className="statistics-table-title">Chi tiết doanh thu hàng tháng</h3>
              </div>
              <div className="statistics-table-wrapper">
                <table className="statistics-table">
                  <thead>
                    <tr>
                      <th>Tháng</th>
                      <th>Doanh thu</th>
                      <th>Chi phí</th>
                      <th>Lợi nhuận</th>
                      <th>Tăng trưởng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, index) => {
                      const prevRevenue = index > 0 ? filteredData[index-1].revenue : 0;
                      const growth = prevRevenue > 0 ? ((item.revenue - prevRevenue) / prevRevenue) * 100 : 0;
                      return (
                        <tr key={index}>
                          <td><strong>{item.fullName}</strong></td>
                          <td style={{color: '#43a047', fontWeight: 600}}>{formatCurrency(item.revenue)}</td>
                          <td style={{color: '#ef5350'}}>{formatCurrency(item.expense)}</td>
                          <td style={{color: '#42a5f5', fontWeight: 600}}>{formatCurrency(item.profit)}</td>
                          <td>
                            {item.revenue > 0 ? (
                              <span className={`statistics-badge ${growth >= 0 ? 'success' : 'danger'}`}>
                                {growth >= 0 ? <FaArrowUp size={10}/> : <FaArrowDown size={10}/>} {Math.abs(growth).toFixed(1)}%
                              </span>
                            ) : <span style={{color: '#999'}}>-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* CHART DETAIL MODAL */}
        {showChartModal && (
          <div className="statistics-export-modal" onClick={() => setShowChartModal(false)}>
            <div className="statistics-export-content statistics-chart-modal" onClick={(e) => e.stopPropagation()}>
              <div className="statistics-export-header">
                <h3 className="statistics-export-title">{chartModalTitle}</h3>
                <button className="statistics-export-close" onClick={() => setShowChartModal(false)}>
                  <FaTimes/>
                </button>
              </div>
              <p className="statistics-chart-modal-subtitle">{chartModalSubtitle}</p>
              <div className="statistics-table-wrapper statistics-chart-modal-table">
                <table className="statistics-table">
                  <thead>
                    <tr>
                      {chartModalRows[0] ? Object.keys(chartModalRows[0]).map(key => <th key={key}>{key}</th>) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {chartModalRows.map((row, index) => (
                      <tr key={index}>
                        {Object.entries(row).map(([key, value], valueIndex) => {
                          const isMoneyField = /doanhthu|chiphi|loinhuan|giatri|tongtienhoan|total|revenue|expense|profit|amount/i.test(key);
                          const displayValue = typeof value === 'number'
                            ? (isMoneyField ? formatCurrency(value) : value.toLocaleString('vi-VN'))
                            : value;
                          return <td key={valueIndex}>{displayValue}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* EXPORT MODAL */}
        {showExportModal && (
          <div className="statistics-export-modal" onClick={() => setShowExportModal(false)}>
            <div className="statistics-export-content" onClick={(e) => e.stopPropagation()}>
              <div className="statistics-export-header">
                <h3 className="statistics-export-title">Xuất báo cáo</h3>
                <button className="statistics-export-close" onClick={() => setShowExportModal(false)}>
                  <FaTimes/>
                </button>
              </div>
              <div className="statistics-export-options">
                <div className="statistics-export-option" onClick={exportToExcel}>
                  <div className="statistics-export-option-icon" style={{color: '#217346'}}>
                    <FaFileExcel size={28}/>
                  </div>
                  <div className="statistics-export-option-text">
                    <h4>Excel tổng hợp</h4>
                    <p>Xuất tài chính + vận hành + so sánh</p>
                  </div>
                </div>

                <div className="statistics-export-option" onClick={exportFinanceExcel}>
                  <div className="statistics-export-option-icon" style={{color: '#1e88e5'}}>
                    <FaFileExcel size={28}/>
                  </div>
                  <div className="statistics-export-option-text">
                    <h4>Excel tài chính</h4>
                    <p>Chỉ doanh thu, chi phí, lợi nhuận</p>
                  </div>
                </div>

                <div className="statistics-export-option" onClick={exportOperationsExcel}>
                  <div className="statistics-export-option-icon" style={{color: '#43a047'}}>
                    <FaFileExcel size={28}/>
                  </div>
                  <div className="statistics-export-option-text">
                    <h4>Excel vận hành</h4>
                    <p>Lịch hẹn, top dịch vụ, top bác sĩ</p>
                  </div>
                </div>

                <div className="statistics-export-option" onClick={exportComparisonExcel}>
                  <div className="statistics-export-option-icon" style={{color: '#ef5350'}}>
                    <FaFileExcel size={28}/>
                  </div>
                  <div className="statistics-export-option-text">
                    <h4>Excel so sánh năm</h4>
                    <p>Biểu đồ và delta giữa hai năm</p>
                  </div>
                </div>
                
                <div className="statistics-export-option" onClick={exportToPDF}>
                  <div className="statistics-export-option-icon" style={{color: '#d32f2f'}}>
                    <FaFilePdf size={28}/>
                  </div>
                  <div className="statistics-export-option-text">
                    <h4>PDF (.pdf)</h4>
                    <p>Xuất báo cáo định dạng PDF</p>
                  </div>
                </div>
                
                <div className="statistics-export-option" onClick={exportToCSV}>
                  <div className="statistics-export-option-icon" style={{color: '#43a047'}}>
                    <FaFileWord size={28}/>
                  </div>
                  <div className="statistics-export-option-text">
                    <h4>CSV (.csv)</h4>
                    <p>Xuất dữ liệu dạng CSV</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StatisticsPage;
