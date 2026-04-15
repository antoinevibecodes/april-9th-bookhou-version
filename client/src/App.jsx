import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BookingsPage from './pages/BookingsPage';
import NewBookingPage from './pages/NewBookingPage';
import BookingDetailPage from './pages/BookingDetailPage';
import TransactionsPage from './pages/TransactionsPage';
import ReportsPage from './pages/ReportsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CalendarPage from './pages/CalendarPage';
import BlockTimePage from './pages/BlockTimePage';
import PackagesPage from './pages/PackagesPage';
import AddOnsPage from './pages/AddOnsPage';
import RoomsPage from './pages/RoomsPage';
import CategoriesPage from './pages/CategoriesPage';
import UsersPage from './pages/UsersPage';
import EmailAutomationPage from './pages/EmailAutomationPage';
import DiscountsPage from './pages/DiscountsPage';
import EventWaiversPage from './pages/EventWaiversPage';
import CustomerListPage from './pages/CustomerListPage';
import StandardWaiversPage from './pages/StandardWaiversPage';
import WaiverPage from './pages/WaiverPage';
import RsvpPage from './pages/RsvpPage';
import NotificationsPage from './pages/NotificationsPage';
import BookingPageSettingsPage from './pages/BookingPageSettingsPage';
import MediaFilesPage from './pages/MediaFilesPage';
import LeadsPage from './pages/LeadsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="page-loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/rsvp/:token" element={<RsvpPage />} />
      <Route path="/waiver/:partyId" element={<WaiverPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/bookings/new" element={<NewBookingPage />} />
        <Route path="/bookings/:id" element={<BookingDetailPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/block-time" element={<BlockTimePage />} />
        <Route path="/packages" element={<PackagesPage />} />
        <Route path="/add-ons" element={<AddOnsPage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/marketing/emails" element={<EmailAutomationPage />} />
        <Route path="/marketing/discounts" element={<DiscountsPage />} />
        <Route path="/marketing/notifications" element={<NotificationsPage />} />
        <Route path="/marketing/booking-page" element={<BookingPageSettingsPage />} />
        <Route path="/marketing/media" element={<MediaFilesPage />} />
        <Route path="/marketing/leads" element={<LeadsPage />} />
        <Route path="/waivers/events" element={<EventWaiversPage />} />
        <Route path="/waivers/customers" element={<CustomerListPage />} />
        <Route path="/waivers/standard" element={<StandardWaiversPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
