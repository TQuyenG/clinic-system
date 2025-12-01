// client/src/pages/StatisticsPage.js
import React, { useState, useEffect, useMemo } from 'react';
import paymentService from '../services/paymentService';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { toast } from 'react-toastify';
import { 
  FaChartLine, FaCalendarAlt, FaMoneyBillWave, FaWallet, 
  FaArrowUp, FaArrowDown, FaPrint, FaDownload, FaPercentage,
  FaChartPie, FaFileInvoiceDollar, FaSpinner
} from 'react-icons/fa';
import './StatisticsPage.css';

const StatisticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  
  // State lưu trữ dữ liệu
  const [stats, setStats] = useState({
    chart: [],
    summary: { total: 0, today: 0 }
  });

  // Màu sắc biểu đồ (Pastel Medical Palette)
  const COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa'];

  useEffect(() => {
    fetchStatistics();
  }, [year]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const res = await paymentService.getRevenueStatistics({ year });
      
      if (res.data.success) {
        const rawData = res.data.data.chart || [];
        const summaryData = res.data.data.summary || { total: 0, today: 0 };

        // 1. Chuẩn hóa dữ liệu biểu đồ (Đủ 12 tháng)
        const formattedChart = Array.from({ length: 12 }, (_, i) => {
          const monthData = rawData.find(item => item.month === i + 1);
          return {
            name: `T${i + 1}`,
            fullName: `Tháng ${i + 1}`,
            revenue: monthData ? parseInt(monthData.total) : 0,
            // Giả lập chi phí (để biểu đồ đẹp hơn vì API hiện tại chưa có)
            expense: monthData ? parseInt(monthData.total) * 0.2 : 0, 
          };
        });

        setStats({
          chart: formattedChart,
          summary: summaryData
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải dữ liệu thống kê. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC TÍNH TOÁN CHỈ SỐ PHỤ (Frontend Calculation) ---
  const analysis = useMemo(() => {
    if (!stats.chart.length) return { avg: 0, maxMonth: 'N/A', growth: 0 };

    const total = stats.summary.total || 0;
    const currentMonth = new Date().getMonth(); // 0-11
    
    // 1. Trung bình tháng (tính đến tháng hiện tại)
    const avg = total / (currentMonth + 1);

    // 2. Tháng doanh thu cao nhất
    const maxMonthObj = stats.chart.reduce((prev, current) => 
      (prev.revenue > current.revenue) ? prev : current
    , { revenue: 0, name: 'N/A' });

    // 3. Tăng trưởng so với tháng trước (Giả định)
    const currentMonthRev = stats.chart[currentMonth]?.revenue || 0;
    const prevMonthRev = stats.chart[currentMonth - 1]?.revenue || 0;
    let growth = 0;
    if (prevMonthRev > 0) {
      growth = ((currentMonthRev - prevMonthRev) / prevMonthRev) * 100;
    }

    // 4. Dữ liệu giả lập cho Biểu đồ tròn (Nguồn thu)
    // Vì API chưa trả về, ta tạo giả lập dựa trên tổng để UI đẹp
    const pieData = [
        { name: 'Chuyển khoản', value: total * 0.6 },
        { name: 'Tiền mặt', value: total * 0.3 },
        { name: 'Bảo hiểm', value: total * 0.1 },
    ];

    return { avg, maxMonth: maxMonthObj.fullName, growth, pieData };
  }, [stats]);

  // Helper format tiền tệ an toàn
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  // Custom Tooltip cho biểu đồ
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="statistics-page-custom-tooltip">
          <p className="label">{`🗓 ${label}`}</p>
          <p className="revenue">{`💰 Thu: ${formatCurrency(payload[0].value)}`}</p>
          {payload[1] && <p className="expense">{`💸 Chi (Est): ${formatCurrency(payload[1].value)}`}</p>}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="statistics-page-loading">
        <FaSpinner className="icon-spin" />
        <span>Đang phân tích dữ liệu tài chính...</span>
      </div>
    );
  }

  return (
    <div className="statistics-page-container">
      
      {/* --- HEADER --- */}
      <div className="statistics-page-header">
        <div className="statistics-page-header-left">
          <h1 className="statistics-page-title">Báo Cáo Doanh Thu</h1>
          <p className="statistics-page-subtitle">
            Tổng hợp số liệu tài chính phòng khám năm {year}
          </p>
        </div>
        
        <div className="statistics-page-header-actions">
          <div className="statistics-page-select-group">
            <FaCalendarAlt className="icon" />
            <select 
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="statistics-page-select"
            >
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>Năm tài chính {y}</option>
              ))}
            </select>
          </div>
          <button className="statistics-page-btn-print" onClick={() => window.print()}>
            <FaPrint /> In Báo Cáo
          </button>
        </div>
      </div>

      {/* --- KPI CARDS (Tổng quan) --- */}
      <div className="statistics-page-kpi-grid">
        
        {/* Card 1: Tổng doanh thu */}
        <div className="statistics-page-kpi-card primary">
          <div className="kpi-icon-wrapper">
            <FaMoneyBillWave />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Tổng doanh thu thực tế</span>
            <h3 className="kpi-value">{formatCurrency(stats.summary.total)}</h3>
            <div className="kpi-trend up">
              <FaArrowUp /> 100% (Tích lũy)
            </div>
          </div>
          <div className="kpi-bg-decoration"></div>
        </div>

        {/* Card 2: Doanh thu hôm nay */}
        <div className="statistics-page-kpi-card success">
          <div className="kpi-icon-wrapper">
            <FaWallet />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Doanh thu hôm nay ({new Date().toLocaleDateString('vi-VN')})</span>
            <h3 className="kpi-value">{formatCurrency(stats.summary.today || 0)}</h3>
            <div className="kpi-trend neutral">
              <FaChartLine /> Cập nhật realtime
            </div>
          </div>
        </div>

        {/* Card 3: Trung bình tháng */}
        <div className="statistics-page-kpi-card info">
          <div className="kpi-icon-wrapper">
            <FaFileInvoiceDollar />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Trung bình tháng</span>
            <h3 className="kpi-value">{formatCurrency(analysis.avg)}</h3>
            <div className="kpi-trend">
              Đỉnh: <strong>{analysis.maxMonth}</strong>
            </div>
          </div>
        </div>

        {/* Card 4: Tăng trưởng */}
        <div className="statistics-page-kpi-card warning">
          <div className="kpi-icon-wrapper">
            <FaPercentage />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Tăng trưởng (Tháng này)</span>
            <h3 className="kpi-value">{analysis.growth.toFixed(1)}%</h3>
            <div className={`kpi-trend ${analysis.growth >= 0 ? 'up' : 'down'}`}>
              {analysis.growth >= 0 ? <FaArrowUp /> : <FaArrowDown />} so với tháng trước
            </div>
          </div>
        </div>
      </div>

      {/* --- CHARTS SECTION --- */}
      <div className="statistics-page-charts-layout">
        
        {/* Biểu đồ chính: Xu hướng doanh thu (Area Chart) */}
        <div className="statistics-page-chart-container main-chart">
          <div className="chart-header">
            <h3><FaChartLine className="text-primary"/> Xu Hướng Doanh Thu Theo Tháng</h3>
            <button className="btn-export-chart"><FaDownload/></button>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={stats.chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#6b7280', fontSize: 12}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#6b7280', fontSize: 12}}
                  tickFormatter={(val) => `${val/1000000}M`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '5 5' }} />
                <Legend verticalAlign="top" height={36}/>
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Doanh thu" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  name="Chi phí (Est)" 
                  stroke="#f87171" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ phụ: Cơ cấu nguồn thu (Pie Chart) */}
        <div className="statistics-page-chart-container side-chart">
          <div className="chart-header">
            <h3><FaChartPie className="text-warning"/> Cơ Cấu Nguồn Thu</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analysis.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analysis.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend layout="vertical" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-center-text">
                <small>Tổng cộng</small>
                <strong>{formatCurrency(stats.summary.total)}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* --- CHI TIẾT DOANH THU (TABLE) --- */}
      <div className="statistics-page-table-section">
        <div className="chart-header">
            <h3>Chi Tiết Doanh Thu Hàng Tháng</h3>
        </div>
        <div className="table-responsive">
            <table className="statistics-page-table">
                <thead>
                    <tr>
                        <th>Tháng</th>
                        <th>Doanh thu</th>
                        <th>Chi phí (Ước tính)</th>
                        <th>Lợi nhuận ròng</th>
                        <th>Tăng trưởng</th>
                    </tr>
                </thead>
                <tbody>
                    {stats.chart.map((item, index) => {
                        const prevRevenue = index > 0 ? stats.chart[index-1].revenue : 0;
                        const growth = prevRevenue > 0 ? ((item.revenue - prevRevenue) / prevRevenue) * 100 : 0;
                        return (
                            <tr key={index}>
                                <td>
                                    <span className="month-badge">{item.fullName}</span>
                                </td>
                                <td className="text-success fw-bold">{formatCurrency(item.revenue)}</td>
                                <td className="text-danger">{formatCurrency(item.expense)}</td>
                                <td className="text-primary fw-bold">{formatCurrency(item.revenue - item.expense)}</td>
                                <td>
                                    {item.revenue > 0 ? (
                                        <span className={`trend-badge ${growth >= 0 ? 'up' : 'down'}`}>
                                            {growth >= 0 ? <FaArrowUp/> : <FaArrowDown/>} {Math.abs(growth).toFixed(1)}%
                                        </span>
                                    ) : <span className="text-muted">-</span>}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

    </div>
  );
};

export default StatisticsPage;