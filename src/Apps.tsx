import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Projects from "./pages/Projects";
import Upload from "./pages/Upload";
import Editor from "./pages/Editor";
import NotFound from "./pages/NotFound";
import MainLayout from "./components/layout/MainLayout";
import CashierLayout from "./pages/cashier/CashierLayout";
import NewOrder from "./pages/cashier/NewOrder";
import Raffle from "./pages/cashier/Raffle";
import Templated from "./pages/cashier/Templated";
import ToPrint from "./pages/cashier/ToPrint";
import Delivery from "./pages/cashier/Delivery";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/projects" replace /> : <Login />} />

      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/projects" element={<Projects />} />
        <Route path="/cashier" element={<CashierLayout />}>
          <Route index element={<Navigate to="/cashier/new-order" replace />} />
          <Route path="new-order" element={<NewOrder />} />
          <Route path="raffle" element={<Raffle />} />
          <Route path="templated" element={<Templated />} />
          <Route path="to-print" element={<ToPrint />} />
          <Route path="delivery" element={<Delivery />} />
        </Route>
      </Route>

      <Route path="/projects/upload/:projectId" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
      <Route path="/editor/:projectId" element={<ProtectedRoute><Editor /></ProtectedRoute>} />

      <Route path="/gallery" element={<Navigate to="/projects" replace />} />
      <Route path="/cashier/order-progress" element={<Navigate to="/cashier/templated" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
