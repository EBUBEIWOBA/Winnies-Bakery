import './App.css';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from 'react-query';
import { queryClient } from './react-query-client';
import { useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

// Public Components
import Homepage from './components/Homepage';
import BestSellers from './components/BestSellers';
import FeedbackForm from './components/FeedbackForm';
import Menu from './components/Menu';
import Contact from './components/Contact';
import Footer from './components/Footer';

// Admin Panel Components
import AdminPanel from './adminpanel/AdminPanel';
import AdminRegister from './adminpanel/AdminRegister';
import Profile from './adminpanel/AdminProfile';
import Settings from './adminpanel/AdminSettings';
import Dashboard from './adminpanel/Dashboard';
import MenuManager from './adminpanel/MenuManager';
import FeedbackList from './adminpanel/feedbackmanager/FeedbackList';
import FeedbackDetails from './adminpanel/feedbackmanager/FeedbackDetails';
import AdminLogin from './adminpanel/AdminLogin';
import ForgotPassword from './adminpanel/ForgotPassword';
import ResetPassword from './adminpanel/ResetPassword';
import AdminManager from './adminpanel/AdminManager';


// Stock Management Components
import StockForm from './adminpanel/stockmanager/StockForm';
import StockChart from './adminpanel/stockmanager/StockChart';
import StockList from './adminpanel/stockmanager/StockList';
import StockMovement from './adminpanel/stockmanager/StockMovement';
import StockHistory from './adminpanel/stockmanager/StockHistory';

// Employee Management Components
import EmployeeManager from './adminpanel/EmployeeManager';
import EmployeeList from './adminpanel/employees/EmployeeList';
import EmployeeProfile from './adminpanel/employees/EmployeeProfile';
import ShiftManager from './adminpanel/employees/ShiftManager';
import AttendanceTracker from './adminpanel/employees/AttendanceTracker';
import LeaveManager from './adminpanel/employees/LeaveManager';

// Employee Panel Components
import EmployeePanel from './employeepanel/EmployeePanel';
import EmployeeProfileView from './employeepanel/EmployeeProfileView';
import EmployeeAttendance from './employeepanel/Attendance';
import EmployeeLeave from './employeepanel/EmployeeLeave';
import EmployeeSchedule from './employeepanel/EmployeeSchedule';
import EmployeeLogin from './employeepanel/EmployeeLogin';
import EmployeeSettings from './employeepanel/EmployeeSettings';

const AdminProtectedRoute = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/admin/login" replace />;
};

const EmployeeProtectedRoute = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('employeeToken');
    if (!token) {
      navigate('/employee/login');
    }
  }, [navigate]);

  const token = localStorage.getItem('employeeToken');
  return token ? children : <Navigate to="/employee/login" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={
            <>
              <Homepage />
              <BestSellers />
              <FeedbackForm />
              <Footer/>
            </>
          } />
          <Route path="/home" element={<Homepage />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/menu/:category" element={<Menu />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/feedback" element={<FeedbackForm />} />
          <Route path="/bestsellers" element={<BestSellers />} />
          <Route path="/footer" element={<Footer />} />

          {/* Admin Routes */}
          <Route path="/admin">
            <Route index element={<Navigate to="/admin/login" replace />} />
            <Route path="login" element={<AdminLogin />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password/:token" element={<ResetPassword />} />

            <Route
              path="register"
              element={
                <AdminProtectedRoute>
                  <AdminRegister />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="panel"
              element={
                <AdminProtectedRoute>
                  <AdminPanel />
                </AdminProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="manager" element={<AdminManager />} />
              <Route path="menu-manager" element={<MenuManager />} />

              {/* Employee Management */}
              <Route path="employees" element={<EmployeeManager />}>
                <Route index element={<EmployeeList />} />
                <Route path="list" element={<EmployeeList />} />
                <Route path="profile/:id" element={<EmployeeProfile />} />
                <Route path="schedule" element={<ShiftManager />} />
                <Route path="attendance" element={<AttendanceTracker />} />
                <Route path="leave" element={<LeaveManager />} />
              </Route>

              {/* Stock Management */}
              <Route path="stock">
                <Route index element={<StockList />} />
                <Route path="add" element={<StockForm mode="add" />} />
                <Route path="edit/:id" element={<StockForm mode="edit" />} />
                <Route path="movement/:id" element={<StockMovement />} />
                <Route path="history/:itemId" element={<StockHistory />} />
                <Route path="chart" element={<StockChart />} />
              </Route>

              {/* Feedback Management */}
              <Route path="feedback">
                <Route index element={<FeedbackList />} />
                <Route path=":id" element={<FeedbackDetails />} />
              </Route>
            </Route>
          </Route>

          {/* Employee Panel Routes */}
          <Route path="/employee">
            <Route index element={<Navigate to="/employee/login" replace />} />
            <Route path="login" element={<EmployeeLogin />} />
            <Route path="auth/forgot-password" element={<EmployeeLogin />} />
            <Route path="auth/reset-password/:token" element={<EmployeeLogin />} />
            <Route path="auth/verify-email/:token" element={<EmployeeLogin />} />

            <Route
              path="panel"
              element={
                <EmployeeProtectedRoute>
                  <EmployeePanel />
                </EmployeeProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="settings" element={<EmployeeSettings />} />
              <Route path="profile" element={<EmployeeProfileView />} />
              <Route path="attendance" element={<EmployeeAttendance />} />
              <Route path="leave" element={<EmployeeLeave />} />
              <Route path="schedule" element={<EmployeeSchedule />} />
            </Route>
          </Route>

          {/* Redirects for common typos */}
          <Route path="/adminpanel" element={<Navigate to="/admin/panel/dashboard" replace />} />
          <Route path="/employeepanel" element={<Navigate to="/employee/panel/dashboard" replace />} />
          <Route path="/emplopyee" element={<Navigate to="/employee/login" replace />} /> {/* Common typo */}
          <Route path="/emplyee" element={<Navigate to="/employee/login" replace />} /> {/* Common typo */}
          <Route path="/employ" element={<Navigate to="/employee/login" replace />} />
          {/* 404 Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </QueryClientProvider>
  );
}

export default App;