import { Navigate, type RouteObject } from 'react-router'
import PrivateRoute from 'src/auth/PrivateRoute'
import PublicRoute from 'src/auth/PublicRoute'
import AuthLayout from 'src/components/layouts/AuthLayout'
import SidebarLayout from 'src/components/layouts/SidebarLayout'
import SASplashScreen from 'src/components/SASplashScreen'
import type { RouteHandle } from 'src/router/handle'
import { lazyPage } from 'src/router/lazyPage'
import { PATHS } from 'src/router/paths'
import RootLayout from 'src/router/RootLayout'
import RouteErrorBoundary from 'src/router/RouteErrorBoundary'

const suppliersCrumb = { title: 'Suppliers', to: PATHS.suppliers }
const ordersCrumb = { title: 'Order Management', to: PATHS.orders }

// Modal pop-ups are child routes of the page they open over: the page stays rendered
// behind them and closing a modal returns to that page.
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <SASplashScreen />,
    children: [
      // Sign in, register and the password pages: for someone with no session.
      {
        element: <PublicRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: 'login', handle: { title: 'Sign in' } satisfies RouteHandle, ...lazyPage(() => import('src/pages/Auth/Login')) },
              { path: 'register', handle: { title: 'Create an account' } satisfies RouteHandle, ...lazyPage(() => import('src/pages/Auth/Register')) },
              { path: 'forgot-password', handle: { title: 'Forgot password' } satisfies RouteHandle, ...lazyPage(() => import('src/pages/Auth/ForgotPassword')) },
              { path: 'reset-password', handle: { title: 'Reset password' } satisfies RouteHandle, ...lazyPage(() => import('src/pages/Auth/ResetPassword')) },
              { path: 'session-expired', handle: { title: 'Session expired' } satisfies RouteHandle, ...lazyPage(() => import('src/pages/Modals/SessionExpiredModal')) },
            ],
          },
        ],
      },

      // Everything after sign-in.
      {
        element: <PrivateRoute />,
        children: [
          {
            element: <SidebarLayout />,
            children: [
              // The supplier queue is where an admin starts.
              { index: true, element: <Navigate to={PATHS.suppliers} replace /> },
              {
                path: 'suppliers',
                handle: { crumbs: () => [{ title: 'Suppliers' }] } satisfies RouteHandle,
                ...lazyPage(() => import('src/pages/Suppliers')),
              },
              {
                path: 'suppliers/:supplierId',
                // The page fills in the business name once it has loaded.
                handle: { crumbs: () => [suppliersCrumb, { title: 'Application' }] } satisfies RouteHandle,
                ...lazyPage(() => import('src/pages/SupplierApplication')),
                children: [
                  { path: 'approve', ...lazyPage(() => import('src/pages/Modals/ApproveSupplierModal')) },
                  { path: 'reject', ...lazyPage(() => import('src/pages/Modals/RejectSupplierModal')) },
                ],
              },
              {
                path: 'orders',
                handle: { crumbs: () => [{ title: 'Order Management' }] } satisfies RouteHandle,
                ...lazyPage(() => import('src/pages/Orders')),
              },
              {
                path: 'orders/:orderNumber',
                handle: { crumbs: (params) => [ordersCrumb, { title: params.orderNumber ?? '' }] } satisfies RouteHandle,
                ...lazyPage(() => import('src/pages/OrderDetail')),
              },
              {
                path: 'profile',
                handle: { crumbs: () => [{ title: 'My Profile' }] } satisfies RouteHandle,
                ...lazyPage(() => import('src/pages/Profile')),
                children: [{ path: 'sign-out', ...lazyPage(() => import('src/pages/Modals/SignOutConfirmModal')) }],
              },
            ],
          },
        ],
      },

      { path: '403', ...lazyPage(() => import('src/pages/Errors/ForbiddenPage')) },
      { path: '500', ...lazyPage(() => import('src/pages/Errors/ServerErrorPage')) },
      { path: '*', ...lazyPage(() => import('src/pages/Errors/NotFoundPage')) },
    ],
  },
]
