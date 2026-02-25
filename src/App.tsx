import { lazy, Suspense, Component, ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const Index = lazy(() => import("./pages/Index"));
const Register = lazy(() => import("./pages/Register"));
const MyCollection = lazy(() => import("./pages/MyCollection"));
const Promo = lazy(() => import("./pages/Promo"));
const ScanMagnet = lazy(() => import("./pages/ScanMagnet"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

class ChunkErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    window.location.reload();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Promo />} />
              <Route path="/my-collection" element={<MyCollection />} />
              <Route path="/register" element={<Register />} />
              <Route path="/promo" element={<Promo />} />
              <Route path="/admin" element={<Index />} />
              <Route path="/scan/:breed" element={<ScanMagnet />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ChunkErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;