// client/src/pages/ConsultationPackageManagementPage.js
// Trang dành riêng cho quản lý Gói dịch vụ tư vấn

import React from 'react';
// Dựa trên cấu trúc file của bạn, component nằm tại /components/common/consultation/
import { ConsultationPackageManagement } from '../components/consultation/ConsultationPackageManagement';
// Tùy chọn: Thêm CSS riêng cho Page nếu cần
// import './ConsultationPackageManagementPage.css'; 

const ConsultationPackageManagementPage = () => {
  return (
    <div className="consultation-package-management-page-container" style={{ margin: '15px' }}>
      {/* Component <ConsultationPackageManagement /> đã có header riêng (h2),
        nên chúng ta chỉ cần render nó ra.
      */}
      <ConsultationPackageManagement />
    </div>
  );
};

export default ConsultationPackageManagementPage;