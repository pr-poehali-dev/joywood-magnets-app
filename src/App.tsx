
import { lazy, Suspense } from "react";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<MyCollection />} />
            <Route path="/my-collection" element={<MyCollection />} />
            <Route path="/register" element={<Register />} />
            <Route path="/promo" element={<Promo />} />
            <Route path="/admin" element={<Index />} />
            <Route path="/scan/:breed" element={<ScanMagnet />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
