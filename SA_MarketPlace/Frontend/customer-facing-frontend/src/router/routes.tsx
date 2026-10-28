import { Navigate, type RouteObject } from 'react-router'
import PrivateRoute from 'src/auth/PrivateRoute'
import PublicRoute from 'src/auth/PublicRoute'
import AuthLayout from 'src/components/layouts/AuthLayout'
import MainLayout from 'src/components/layouts/MainLayout'
import { PATHS } from 'src/router/paths'
import type { RouteHandle } from 'src/router/handle'
import RootLayout from 'src/router/RootLayout'
import RouteErrorBoundary from 'src/router/RouteErrorBoundary'
import SASplashScreen from 'src/components/SASplashScreen'
import { lazyPage } from 'src/router/lazyPage'

const shopCrumb = { title: 'Shopping cart', to: PATHS.cart }

// Modal pop-ups are child routes of the page they open over: the page stays rendered
// behind them and closing a modal returns to that page.
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <SASplashScreen />,
    children: [
      { index: true, element: <Navigate to={PATHS.shop} replace /> },

      {
        element: <PublicRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: 'login', handle: { title: 'Sign in' } satisfies RouteHandle, ...lazyPage(() => import('src/pages/Auth/Login')) },
              { path: 'register', handle: { title: 'Create your account' } satisfies RouteHandle, ...lazyPage(() => import('src/pages/Auth/Register')) },
              { path: 'forgot-password', handle: { title: 'Forgot password' } satisfies RouteHandle, ...lazyPage(() => import('src/pages/Auth/ForgotPassword')) },
              { path: 'reset-password', handle: { title: 'Reset password' } satisfies RouteHandle, ...lazyPage(() => import('src/pages/Auth/ResetPassword')) },
              { path: 'session-expired', handle: { title: 'Session expired' } satisfies RouteHandle, ...lazyPage(() => import('src/pages/Modals/SessionExpiredModal')) },
            ],
          },
        ],
      },

      {
        element: <PrivateRoute />,
        children: [
          {
            element: <MainLayout />,
            children: [
              {
                path: 'shop',
                handle: { title: 'Shop' } satisfies RouteHandle,
                ...lazyPage(() => import('src/pages/Shop')),
              },
              {
                path: 'shop/products/:productId',
                // The page fills in the category and name once the product has loaded.
                handle: { crumbs: () => [{ title: 'Product' }] } satisfies RouteHandle,
                ...lazyPage(() => import('src/pages/ProductDetail')),
              },
              {
                path: 'cart',
                handle: { crumbs: () => [{ title: 'Shopping cart' }] } satisfies RouteHandle,
                ...lazyPage(() => import('src/pages/Cart')),
                children: [
                  { path: 'remove/:productId', ...lazyPage(() => import('src/pages/Modals/RemoveCartItemModal')) },
                  { path: 'clear', ...lazyPage(() => import('src/pages/Modals/ClearCartModal')) },
                ],
              },
              {
                path: 'checkout',
                ...lazyPage(() => import('src/pages/Checkout/CheckoutLayout')),
                children: [
                  { index: true, element: <Navigate to={PATHS.checkoutDelivery} replace /> },
                  {
                    path: 'delivery',
                    handle: {
                      crumbs: () => [shopCrumb, { title: 'Checkout' }, { title: 'Delivery' }],
                    } satisfies RouteHandle,
                    ...lazyPage(() => import('src/pages/Checkout/Delivery')),
                  },
                  {
                    path: 'payment',
                    handle: {
                      crumbs: () => [shopCrumb, { title: 'Checkout' }, { title: 'Payment' }],
                    } satisfies RouteHandle,
                    ...lazyPage(() => import('src/pages/Checkout/Payment')),
                    children: [
                      { path: 'declined', ...lazyPage(() => import('src/pages/Modals/PaymentDeclinedModal')) },
                    ],
                  },
                ],
              },
              {
                path: 'checkout/confirmation/:orderNumber',
                handle: { title: 'Order confirmation' } satisfies RouteHandle,
                ...lazyPage(() => import('src/pages/OrderConfirmation')),
              },
              {
                path: 'orders',
                handle: { crumbs: () => [{ title: 'My orders' }] } satisfies RouteHandle,
                ...lazyPage(() => import('src/pages/Orders')),
                children: [
                  { path: 'reorder/:orderNumber', ...lazyPage(() => import('src/pages/Modals/ReorderConfirmModal')) },
                ],
              },
              {
                path: 'orders/:orderNumber',
                handle: {
                  crumbs: (params) => [
                    { title: 'My orders', to: PATHS.orders },
                    { title: params.orderNumber ?? '' },
                  ],
                } satisfies RouteHandle,
                ...lazyPage(() => import('src/pages/OrderDetail')),
                children: [
                  { path: 'reorder', ...lazyPage(() => import('src/pages/Modals/ReorderConfirmModal')) },
                ],
              },
              {
                path: 'profile',
                handle: { title: 'My profile' } satisfies RouteHandle,
                ...lazyPage(() => import('src/pages/Profile')),
                children: [
                  { path: 'sign-out', ...lazyPage(() => import('src/pages/Modals/SignOutConfirmModal')) },
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
