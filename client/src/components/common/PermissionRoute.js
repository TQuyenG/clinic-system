// client/src/components/common/PermissionRoute.js
/**
 * PermissionRoute - Protected Route với kiểm tra role
 * 
 * Component này CHỈ kiểm tra:
 * 1. User đã đăng nhập chưa
 * 2. User có role phù hợp không (admin/staff/doctor/patient)
 * 
 * Permissions chi tiết được check bởi UI component (ẩn/hiện button)
 * 
 * @example
 * // Chỉ admin
 * <PermissionRoute requiredRole="admin">
 *   <ComponentPage />
 * </PermissionRoute>
 * 
 * // Admin hoặc staff
 * <PermissionRoute requiredRole={['admin', 'staff']}>
 *   <ServiceManagementPage />
 * </PermissionRoute>
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const PermissionRoute = ({ 
  children, 
  requiredRole,
  fallbackPath = '/dashboard'
}) => {
  const { user, loading } = useAuth();

  // 1. Đang loading - chờ user data load xong
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '16px',
        color: '#666'
      }}>
        <div>Đang tải dữ liệu người dùng...</div>
      </div>
    );
  }

  // 2. Chưa đăng nhập
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Kiểm tra role
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    if (!allowedRoles.includes(user.role)) {
      console.warn(`❌ [PermissionRoute] User role '${user.role}' không được phép`);
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // ✅ Pass - UI sẽ check permissions chi tiết
  return children;
};

export default PermissionRoute;
