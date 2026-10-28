import { type RouteObject } from 'react-router'
import ApprovedRoute from 'src/auth/ApprovedRoute'
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

const ordersCrumb = { title: 'Orders', to: PATHS.orders }
const catalogueCrumb = { title: 'Catalogue', to: PATHS.catalogue }

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
              { path: 'register', handle: { title: 'Register your business' } satisfies RouteHandle, ...lazyPage(() => import('src/pages/Auth/Register')) },
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
          // Where a seller stands: any signed-in seller may see these, approved or not.
          {
            element: <AuthLayout />,
            children: [
              { path: 'application', handle: { title: 'Your application' } satisfies RouteHandle, ...lazyPage(() => import('src/pages/Application')) },
              { path: 'application/resubmit', handle: { title: 'Update your application' } satisfies RouteHandle, ...lazyPage(() => import('src/pages/Application/Resubmit')) },
            ],
          },

          // The portal proper: approved sellers only. Anyone else is sent to the application screen.
          {
            element: <ApprovedRoute />,
            children: [
              {
                element: <SidebarLayout />,
                children: [
                  { index: true, handle: { title: 'Dashboard' } satisfies RouteHandle, ...lazyPage(() => import('src/pages/Dashboard')) },
                  {
                    path: 'orders',
                    handle: { crumbs: () => [{ title: 'Orders' }] } satisfies RouteHandle,
                    ...lazyPage(() => import('src/pages/Orders')),
                  },
                  {
                    path: 'orders/:orderNumber',
                    handle: { crumbs: (params) => [ordersCrumb, { title: params.orderNumber ?? '' }] } satisfies RouteHandle,
                    ...lazyPage(() => import('src/pages/OrderFulfilment')),
                    children: [{ path: 'cancel', ...lazyPage(() => import('src/pages/Modals/CancelOrderModal')) }],
                  },
                  {
                    path: 'catalogue',
                    handle: { crumbs: () => [{ title: 'Catalogue' }] } satisfies RouteHandle,
                    ...lazyPage(() => import('src/pages/Catalogue')),
                    children: [{ path: 'retire/:productId', ...lazyPage(() => import('src/pages/Modals/RetireProductModal')) }],
                  },
                  {
                    path: 'catalogue/new',
                    handle: { crumbs: () => [catalogueCrumb, { title: 'Add product' }] } satisfies RouteHandle,
                    ...lazyPage(() => import('src/pages/ProductForm')),
                  },
                  {
                    path: 'catalogue/:productId',
                    // The page fills in the product's name once it has loaded.
                    handle: { crumbs: () => [catalogueCrumb, { title: 'Edit product' }] } satisfies RouteHandle,
                    ...lazyPage(() => import('src/pages/ProductForm')),
                  },
                  {
                    path: 'profile',
                    handle: { title: 'Business profile' } satisfies RouteHandle,
                    ...lazyPage(() => import('src/pages/BusinessProfile')),
                    children: [{ path: 'sign-out', ...lazyPage(() => import('src/pages/Modals/SignOutConfirmModal')) }],
                  },
                ],
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
