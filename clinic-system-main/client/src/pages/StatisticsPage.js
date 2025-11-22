// client/src/pages/StatisticsPage.js
import React, { useState, useEffect } from 'react';
import paymentService from '../services/paymentService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { toast } from 'react-toastify';
import './StatisticsPage.css'; // Đảm bảo file css này tồn tại (xem bước 3)

const StatisticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState({
    chart: [],
    summary: { total: 0, today: 0 }
  });

  useEffect(() => {
    fetchStatistics();
  }, [year]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      // Gọi API backend
      const res = await paymentService.getRevenueStatistics({ year });
      
      if (res.data.success) {
        // Format dữ liệu cho Recharts (đảm bảo đủ 12 tháng dù tháng đó 0đ)
        const rawData = res.data.data.chart;
        const formattedChart = Array.from({ length: 12 }, (_, i) => {
          const monthData = rawData.find(item => item.month === i + 1);
          return {
            name: `Tháng ${i + 1}`,
            revenue: monthData ? parseInt(monthData.total) : 0
          };
        });

        setStats({
          chart: formattedChart,
          summary: res.data.data.summary
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Lỗi tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  // Format tiền tệ
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className="statistics-container p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-primary fw-bold">📊 Thống Kê Doanh Thu</h2>
        <div className="d-flex align-items-center">
            <label className="me-2 fw-bold">Năm:</label>
            <select 
                className="form-select" 
                style={{width: '100px'}}
                value={year}
                onChange={(e) => setYear(e.target.value)}
            >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
            </select>
        </div>
      </div>

      {/* --- 1. CARDS TỔNG QUAN --- */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card shadow-sm border-0 bg-gradient-primary text-white h-100 statistic-card-total">
            <div className="card-body p-4">
              <h5 className="card-title opacity-75">💰 Tổng Doanh Thu Thực Tế</h5>
              <h2 className="display-6 fw-bold mb-0">
                {loading ? '...' : formatCurrency(stats.summary.total)}
              </h2>
              <small className="opacity-75">Toàn bộ các giao dịch thành công</small>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm border-0 bg-gradient-success text-white h-100 statistic-card-today">
            <div className="card-body p-4">
              <h5 className="card-title opacity-75">📅 Doanh Thu Hôm Nay</h5>
              <h2 className="display-6 fw-bold mb-0">
                {loading ? '...' : formatCurrency(stats.summary.today)}
              </h2>
              <small className="opacity-75">{new Date().toLocaleDateString('vi-VN')}</small>
            </div>
          </div>
        </div>
      </div>

      {/* --- 2. BIỂU ĐỒ --- */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3">
          <h5 className="mb-0 fw-bold text-secondary">Biểu Đồ Doanh Thu Năm {year}</h5>
        </div>
        <div className="card-body">
            {loading ? (
                <div className="text-center py-5">Đang vẽ biểu đồ...</div>
            ) : (
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <AreaChart
                            data={stats.chart}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(value) => new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(value)} />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                            <Area 
                                type="monotone" 
                                dataKey="revenue" 
                                name="Doanh thu (VND)"
                                stroke="#8884d8" 
                                fillOpacity={1} 
                                fill="url(#colorRevenue)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;