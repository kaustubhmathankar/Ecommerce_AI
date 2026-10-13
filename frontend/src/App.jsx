import {
  useEffect,
} from 'react'

import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'


import ProtectedRoute from './components/auth/ProtectedRoute'

import AdminLayout from './components/admin/AdminLayout'

import AdminDashboard from './pages/AdminDashboard'
import AdminProducts from './pages/AdminProducts'
import AdminCategories from './pages/AdminCategories'
import AdminCustomers from './pages/AdminCustomers'
import AdminOrders from './pages/AdminOrders'
import AdminReviews from './pages/AdminReviews'

import Addresses from './pages/Addresses'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import ForgotPassword from './pages/ForgotPassword'
import Home from './pages/Home'
import Login from './pages/Login'
import ProductDetails from './pages/ProductDetails'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import Shop from './pages/Shop'
import Orders from './pages/Orders'
import Wishlist from './pages/Wishlist'


function App() {

  const location =
    useLocation()


  useEffect(() => {

    if (location.hash) {

      window.requestAnimationFrame(
        () => {

          document
            .getElementById(
              decodeURIComponent(
                location.hash.slice(
                  1,
                ),
              ),
            )
            ?.scrollIntoView({
              behavior:
                'smooth',
            })

        },
      )

      return
    }


    window.scrollTo({
      top: 0,
      behavior: 'instant',
    })

  }, [
    location.pathname,
    location.hash,
  ])


  return (

    <Routes>

      {/* STOREFRONT */}

      <Route
        path="/"
        element={
          <Home />
        }
      />

      <Route
        path="/shop"
        element={
          <Shop />
        }
      />

      <Route
        path="/products/:slug"
        element={
          <ProductDetails />
        }
      />

      <Route
        path="/cart"
        element={
          <Cart />
        }
      />

      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        }
      />

      <Route
        path="/wishlist"
        element={
          <Wishlist />
        }
      />


      {/* AUTH */}

      <Route
        path="/login"
        element={
          <Login />
        }
      />

      <Route
        path="/register"
        element={
          <Register />
        }
      />

      <Route
        path="/forgot-password"
        element={
          <ForgotPassword />
        }
      />

      <Route
        path="/reset-password"
        element={
          <ResetPassword />
        }
      />


      {/* ACCOUNT */}

      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        }
      />

      <Route
        path="/account/addresses"
        element={
          <ProtectedRoute>
            <Addresses />
          </ProtectedRoute>
        }
      />


      {/* ADMIN */}

      <Route
        path="/admin"
        element={
          <ProtectedRoute
            adminOnly
          >
            <AdminLayout />
          </ProtectedRoute>
        }
      >

        <Route
          index
          element={
            <AdminDashboard />
          }
        />

        <Route
          path="products"
          element={
            <AdminProducts />
          }
        />

        <Route
          path="categories"
          element={
            <AdminCategories />
          }
        />

        <Route
          path="orders"
          element={
            <AdminOrders />
          }
        />

        <Route
          path="customers"
          element={
            <AdminCustomers />
          }
        />

        <Route
          path="reviews"
          element={
            <AdminReviews />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/admin"
              replace
            />
          }
        />

      </Route>


      {/* 404 */}

      <Route
        path="*"
        element={
          <NotFound />
        }
      />

    </Routes>
  )
}


function NotFound() {

  return (

    <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">

      <p className="text-xs font-semibold tracking-[0.2em] text-[#18705c]">
        404 · PAGE NOT FOUND
      </p>

      <h1 className="mt-4 text-4xl font-medium tracking-tight">
        This page wandered off.
      </h1>

      <p className="mt-3 max-w-md text-sm leading-6 text-neutral-500">
        The address may have changed.
        Head back to the shop and find
        something good.
      </p>

      <Link
        to="/"
        className="mt-7 rounded-full bg-[#153d35] px-6 py-3 text-sm font-semibold text-white"
      >
        Back to ShopSphere
      </Link>

    </main>
  )
}


export default App