import api from './api';

const eventService = {
    // Lấy danh sách có bộ lọc, phân trang và sắp xếp
    getAllEvents: async (params) => {
        const response = await api.get('/marketing/events', { params });
        return response.data;
    },

    // Các hàm khác giữ nguyên logic từ file Page của bạn
    toggleStatus: async (id) => {
        return await api.put(`/marketing/events/${id}/toggle`);
    },

    duplicateEvent: async (id) => {
        return await api.post(`/marketing/events/${id}/duplicate`);
    },

    deleteEvent: async (id) => {
        return await api.delete(`/marketing/events/${id}`);
    }
};

export default eventService;