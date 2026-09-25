import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/Button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/DropdownMenu";
import Avatar from "./ui/Avatar";
import Logo from "./Logo";

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    setMobileOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const publicLinks = [
    { to: "/marketplace", label: "Marketplace" },
    { to: "/", label: "Categories" },
  ];

  const authLinks = [
    { to: "/marketplace", label: "Marketplace" },
    { to: "/", label: "Categories" },
    { to: "/favorites", label: "Favorites" },
    { to: "/messages", label: "Messages" },
    { to: "/listings/new", label: "Sell" },
  ];

  const navLinks = user ? authLinks : publicLinks;

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2.5 shrink-0">
                <Logo size="sm" />
                <span className="text-lg font-bold text-campus-green tracking-tight hidden sm:block">
                  Campusly
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(link.to)
                        ? "text-campus-green bg-campus-green-light"
                        : "text-text-secondary hover:text-text hover:bg-surface-hover"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <>
                  <Link to="/favorites" className="p-2 rounded-full hover:bg-surface-hover transition-colors text-text-secondary hover:text-text">
                    <HeartIcon />
                  </Link>
                  <Link to="/messages" className="p-2 rounded-full hover:bg-surface-hover transition-colors text-text-secondary hover:text-text">
                    <ChatIcon />
                  </Link>
                  <Link to="/listings/new">
                    <Button size="sm" className="rounded-full gap-1.5">
                      <PlusIcon />
                      Sell
                    </Button>
                  </Link>
                  <DropdownMenu
                    trigger={
                      <button
                        className="ml-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-campus-green/30 transition-all hover:ring-2 hover:ring-campus-green/20"
                        aria-label="Account menu"
                      >
                        <Avatar user={user} size="sm" />
                      </button>
                    }
                  >
                    <DropdownMenuLabel>
                      <p className="text-sm font-semibold text-text truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-text-muted font-normal truncate">
                        {user.email}
                      </p>
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      icon={<UserIcon />}
                      onClick={() => navigate("/profile")}
                    >
                      My profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      icon={<HeartIcon />}
                      onClick={() => navigate("/favorites")}
                    >
                      Favorites
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      icon={<ChatIcon />}
                      onClick={() => navigate("/messages")}
                    >
                      Messages
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      icon={<LogOutIcon />}
                      danger
                      onClick={handleLogout}
                    >
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm">Log in</Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm">Sign up</Button>
                  </Link>
                </>
              )}
            </div>

            <button
              className="md:hidden p-2 rounded-lg hover:bg-surface-hover transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-surface">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? "bg-campus-green-light text-campus-green"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-bg border border-border">
                    <Avatar user={user} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive("/profile")
                        ? "bg-campus-green-light text-campus-green"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text"
                    }`}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-error hover:bg-error-light transition-colors"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <div className="flex gap-2 pt-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1">
                    <Button variant="secondary" size="md" className="w-full">Log in</Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1">
                    <Button size="md" className="w-full">Sign up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Logo size="sm" />
              <span className="text-sm font-bold text-campus-green">Campusly</span>
            </div>
            <p className="text-xs text-text-muted text-center">
              Built for DIT University students. Buy &amp; sell within your campus.
            </p>
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <a href="#" className="hover:text-text transition-colors">About</a>
              <a href="#" className="hover:text-text transition-colors">Help</a>
              <a href="#" className="hover:text-text transition-colors">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
