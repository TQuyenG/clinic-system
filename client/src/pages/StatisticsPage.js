// client/src/pages/StatisticsPage.js
import React, { useState, useEffect, useMemo } from 'react';
import paymentService from '../services/paymentService';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { toast } from 'react-toastify';
import { 
  FaChartLine, FaCalendarAlt, FaMoneyBillWave, FaWallet, 
  FaArrowUp, FaArrowDown, FaPrint, FaDownload, FaPercentage,
  FaChartPie, FaFileInvoiceDollar, FaChartBar, FaTimes,
  FaFileExcel, FaFilePdf, FaFileWord, FaCog, FaFilter,
  FaExchangeAlt
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import './StatisticsPage.css';

const StatisticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('overview');
  const [showExportModal, setShowExportModal] = useState(false);
  const [chartType, setChartType] = useState('area');
  
  // Filters
  const [filters, setFilters] = useState({
    startMonth: 1,
    endMonth: 12,
    compareYear: null
  });

  const [stats, setStats] = useState({
    chart: [],
    summary: { total: 0, today: 0 }
  });

  const COLORS = ['#43a047', '#42a5f5', '#ffa726', '#ef5350', '#ab47bc'];

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

        const formattedChart = Array.from({ length: 12 }, (_, i) => {
          const monthData = rawData.find(item => item.month === i + 1);
          return {
            month: i + 1,
            name: `T${i + 1}`,
            fullName: `Tháng ${i + 1}`,
            revenue: monthData ? parseInt(monthData.total) : 0,
            expense: monthData ? parseInt(monthData.total) * 0.2 : 0,
            profit: monthData ? parseInt(monthData.total) * 0.8 : 0,
          };
        });

        setStats({
          chart: formattedChart,
          summary: summaryData
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

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
      totalRevenue: 0, totalExpense: 0, totalProfit: 0
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
      { name: 'Chuyển khoản', value: totalRevenue * 0.6 },
      { name: 'Tiền mặt', value: totalRevenue * 0.3 },
      { name: 'Bảo hiểm', value: totalRevenue * 0.1 },
    ];

    return { avg, maxMonth: maxMonthObj.fullName, growth, pieData, totalRevenue, totalExpense, totalProfit };
  }, [filteredData, stats.chart]);

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
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredData.map(item => ({
        'Tháng': item.fullName,
        'Doanh thu': item.revenue,
        'Chi phí': item.expense,
        'Lợi nhuận': item.profit
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Doanh thu');
    XLSX.writeFile(wb, `Bao_cao_doanh_thu_${year}.xlsx`);
    toast.success('Đã xuất file Excel!');
    setShowExportModal(false);
  };

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
          
          {/* FILTER BAR */}
          <div className="statistics-filter-bar">
            <div className="statistics-filter-grid">
              <div className="statistics-filter-item">
                <label><FaFilter size={10}/> Từ tháng</label>
                <select 
                  value={filters.startMonth}
                  onChange={(e) => setFilters({...filters, startMonth: parseInt(e.target.value)})}
                >
                  {Array.from({length: 12}, (_, i) => (
                    <option key={i+1} value={i+1}>Tháng {i+1}</option>
                  ))}
                </select>
              </div>
              
              <div className="statistics-filter-item">
                <label>Đến tháng</label>
                <select 
                  value={filters.endMonth}
                  onChange={(e) => setFilters({...filters, endMonth: parseInt(e.target.value)})}
                >
                  {Array.from({length: 12}, (_, i) => (
                    <option key={i+1} value={i+1}>Tháng {i+1}</option>
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
            <FaChartBar size={13}/> Biểu đồ
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
        </div>

        {/* CONTENT BY TAB */}
        {activeTab === 'overview' && (
          <div className="statistics-charts-grid">
            <div className="statistics-chart-card" style={{gridColumn: '1 / -1'}}>
              <div className="statistics-chart-header">
                <h3 className="statistics-chart-title">
                  <FaChartLine/> Xu hướng doanh thu
                </h3>
                <div className="statistics-chart-actions">
                  <button className="statistics-chart-btn"><FaDownload size={12}/></button>
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
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="statistics-charts-grid">
            <div className="statistics-chart-card">
              <div className="statistics-chart-header">
                <h3 className="statistics-chart-title">Doanh thu vs Chi phí</h3>
              </div>
              <div className="statistics-chart-body">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                    <XAxis dataKey="name" tick={{fontSize: 11}}/>
                    <YAxis tick={{fontSize: 11}} tickFormatter={(val) => `${val/1000000}M`}/>
                    <Tooltip content={<CustomTooltip />}/>
                    <Legend wrapperStyle={{fontSize: '0.85rem'}}/>
                    <Bar dataKey="revenue" name="Doanh thu" fill="#43a047"/>
                    <Bar dataKey="expense" name="Chi phí" fill="#ef5350"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="statistics-chart-card">
              <div className="statistics-chart-header">
                <h3 className="statistics-chart-title">Lợi nhuận ròng</h3>
              </div>
              <div className="statistics-chart-body">
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={filteredData}>
                    <defs>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#42a5f5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#42a5f5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                    <XAxis dataKey="name" tick={{fontSize: 11}}/>
                    <YAxis tick={{fontSize: 11}} tickFormatter={(val) => `${val/1000000}M`}/>
                    <Tooltip content={<CustomTooltip />}/>
                    <Area type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#42a5f5" strokeWidth={2} fill="url(#colorProfit)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="statistics-comparison">
            <h3 className="statistics-chart-title">So sánh hiệu suất</h3>
            <div className="statistics-comparison-grid">
              <div className="statistics-comparison-item">
                <div className="statistics-comparison-label">Tổng doanh thu</div>
                <div className="statistics-comparison-value">{formatCurrency(analysis.totalRevenue)}</div>
              </div>
              <div className="statistics-comparison-item">
                <div className="statistics-comparison-label">Tổng chi phí</div>
                <div className="statistics-comparison-value">{formatCurrency(analysis.totalExpense)}</div>
              </div>
              <div className="statistics-comparison-item">
                <div className="statistics-comparison-label">Lợi nhuận</div>
                <div className="statistics-comparison-value">{formatCurrency(analysis.totalProfit)}</div>
              </div>
              <div className="statistics-comparison-item">
                <div className="statistics-comparison-label">Tỷ suất lợi nhuận</div>
                <div className="statistics-comparison-value">
                  {analysis.totalRevenue > 0 ? ((analysis.totalProfit/analysis.totalRevenue)*100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'table' && (
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
                    <h4>Excel (.xlsx)</h4>
                    <p>Xuất dữ liệu dạng bảng tính</p>
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