// Every navigation target lives here, so a route change is a one-file change.
export const PATHS = {
  root: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  sessionExpired: '/session-expired',
  suppliers: '/suppliers',
  supplierApplication: (supplierId: string) => `/suppliers/${supplierId}`,
  approveSupplier: (supplierId: string) => `/suppliers/${supplierId}/approve`,
  rejectSupplier: (supplierId: string) => `/suppliers/${supplierId}/reject`,
  orders: '/orders',
  orderDetail: (orderNumber: string) => `/orders/${orderNumber}`,
  profile: '/profile',
  signOut: '/profile/sign-out',
  forbidden: '/403',
  serverError: '/500',
} as const
