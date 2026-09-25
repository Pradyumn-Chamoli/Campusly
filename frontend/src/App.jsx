import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import PublicProfilePage from "./pages/PublicProfilePage";
import MarketplacePage from "./pages/MarketplacePage";
import ListingDetailsPage from "./pages/ListingDetailsPage";
import CreateListingPage from "./pages/CreateListingPage";
import EditListingPage from "./pages/EditListingPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/users/:id" element={<PublicProfilePage />} />
            <Route path="/listings/:id" element={<ListingDetailsPage />} />
            <Route path="/favorites" element={
              <ProtectedRoute>
                <PlaceholderPage title="Favorites" />
              </ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute>
                <PlaceholderPage title="Messages" />
              </ProtectedRoute>
            } />
            <Route path="/listings/new" element={
              <ProtectedRoute>
                <CreateListingPage />
              </ProtectedRoute>
            } />
            <Route path="/listings/:id/edit" element={
              <ProtectedRoute>
                <EditListingPage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="*" element={
              <PlaceholderPage
                title="Page not found"
                description="The page you are looking for does not exist or has moved."
              />
            } />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}

function PlaceholderPage({ title, description = "Coming in a future phase." }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <h1 className="text-2xl font-bold text-text">{title}</h1>
      <p className="text-text-secondary mt-2">{description}</p>
    </div>
  );
}
