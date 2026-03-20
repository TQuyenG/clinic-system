import api from './api';

const marketingService = {
    getAllPromotions: async (params) => {
        const response = await api.get('/marketing/promotions', { params });
        return response.data;
    },
    createPromotion: async (data) => {
        const response = await api.post('/marketing/promotions', data);
        return response.data;
    },
    // Hàm gọi API lấy danh sách Dịch vụ/Thuốc/Tư vấn
    getSelectionData: async (type) => {
        const response = await api.get(`/marketing/promotions/selection-data?type=${type}`);
        return response.data;
    }
};

export default marketingService;