// client/src/utils/normalizeUser.js
// Utility to normalize user/doctor objects returned by various APIs into a consistent shape
export const normalizeUserList = (users = [], defaultRole = 'staff') => {
  if (!Array.isArray(users)) return [];
  return users.map(u => ({
    id: u?.id || u?.user_id || u?.User?.id || u?.doctor_id || u?.doctorId || null,
    full_name: u?.full_name || u?.User?.full_name || u?.name || u?.User?.fullName || u?.doctor_name || u?.fullName || '',
    avatar_url: u?.avatar_url || u?.User?.avatar_url || u?.avatar || u?.User?.avatar || u?.avatarUrl || '',
    email: u?.email || u?.User?.email || null,
    role: u?.role || (defaultRole || 'staff'),
    raw: u
  }));
};

export default normalizeUserList;
