import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { BookingProvider } from './context/BookingContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { ToastContainer } from './components/common/ToastContainer';
import { DashboardView } from './components/dashboard/DashboardView';
import { CalendarView } from './components/calendar/CalendarView';
import { BookingFormView } from './components/booking/BookingFormView';
import { ManageBookingView } from './components/manage/ManageBookingView';
import { ReportsView } from './components/reports/ReportsView';
import { RoomsManagementView } from './components/rooms/RoomsManagementView';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BookingProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 selection:bg-pink-500 selection:text-white transition-colors duration-300">
            {/* Global Animated Toasts */}
            <ToastContainer />

            {/* Top Navigation */}
            <Navbar />

            {/* Main Content Area */}
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<DashboardView />} />
                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/book" element={<BookingFormView />} />
                <Route path="/manage" element={<ManageBookingView />} />
                <Route path="/manage/:code" element={<ManageBookingView />} />
                <Route path="/reports" element={<ReportsView />} />
                <Route path="/rooms" element={<RoomsManagementView />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Footer */}
            <Footer />
          </div>
        </Router>
      </BookingProvider>
    </ThemeProvider>
  );
};

export default App;
