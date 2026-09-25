import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import ListingGrid, { ListingGridSkeleton } from "../components/ListingGrid";
import { CATEGORY_EMOJI, CATEGORY_LABELS } from "../lib/format";

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

const CATEGORIES = ["BOOKS", "ELECTRONICS", "FURNITURE", "CLOTHING", "STATIONERY", "SPORTS", "OTHER"];

const TAGS = ["Textbooks", "Calculators", "Laptops", "Furniture", "Hostel items"];

const FEATURES = [
  { icon: "🎓", title: "DIT Students Only", desc: "Every user is a verified DIT University student. No outsiders, no scams." },
  { icon: "💰", title: "Zero Fees", desc: "No commissions or hidden charges. What you sell is what you earn." },
  { icon: "🤝", title: "Meet on Campus", desc: "Trade in person at familiar campus spots. Safe and convenient." },
];

export default function HomePage() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/listings", { params: { limit: 4 } })
      .then((res) => {
        if (!cancelled) setListings(res.data.data);
      })
      .catch(() => {
        // The rest of the landing page still works without listings.
        if (!cancelled) setListings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="bg-gradient-to-b from-campus-green-dark via-campus-green to-campus-green relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-campus-orange/5 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
            Buy &amp; sell within your<br />DIT campus.
          </h1>
          <p className="text-base sm:text-lg text-white/70 max-w-xl mx-auto leading-relaxed mb-8">
            The student-only marketplace for DIT University. Find textbooks, electronics, furniture, and more from fellow students — or sell what you no longer need.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link to="/marketplace">
              <Button size="lg" className="bg-white text-campus-green hover:bg-white/90 font-semibold">
                Browse Marketplace
                <ArrowRightIcon />
              </Button>
            </Link>
            {user ? (
              <Link to="/listings/new">
                <Button variant="secondary" size="lg" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                  Sell an Item
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="secondary" size="lg" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                  Log in
                </Button>
              </Link>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {TAGS.map((tag) => (
              <span key={tag} className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Categories ---------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text">Browse by Category</h2>
            <p className="text-sm text-text-muted mt-0.5">Find what you need on campus</p>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              to={`/marketplace?category=${category}`}
              className="bg-surface border border-border rounded-xl p-4 text-center hover:shadow-md hover:border-campus-green/20 transition-all group"
            >
              <div className="text-3xl mb-2" aria-hidden="true">
                {CATEGORY_EMOJI[category]}
              </div>
              <h3 className="text-sm font-semibold text-text group-hover:text-campus-green transition-colors">
                {CATEGORY_LABELS[category]}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Recent listings ---------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text">Recent Listings</h2>
            <p className="text-sm text-text-muted mt-0.5">Fresh items from DIT students</p>
          </div>
          <Link to="/marketplace" className="text-sm text-campus-green font-medium hover:underline flex items-center gap-1">
            View all <ArrowRightIcon />
          </Link>
        </div>

        {loading ? (
          <ListingGridSkeleton count={4} />
        ) : listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
            <p className="text-sm text-text-secondary">
              No listings yet. Be the first to sell something on campus.
            </p>
            <Link to={user ? "/listings/new" : "/register"} className="inline-block mt-4">
              <Button size="sm">List an item</Button>
            </Link>
          </div>
        ) : (
          <ListingGrid
            listings={listings}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          />
        )}
      </section>

      {/* ---------- Why ---------- */}
      <section className="bg-surface border-y border-border py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-text mb-3">Why Campusly?</h2>
          <p className="text-sm text-text-secondary mb-8 max-w-lg mx-auto">
            A simple, trusted marketplace built exclusively for DIT University students.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((item) => (
              <div key={item.title} className="bg-bg rounded-2xl p-6 border border-border">
                <div className="text-3xl mb-3" aria-hidden="true">{item.icon}</div>
                <h3 className="text-base font-bold text-text mb-1">{item.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-text mb-3">Ready to start?</h2>
        <p className="text-text-secondary mb-6">
          Create your free account and start buying or selling on campus.
        </p>
        <Link to={user ? "/listings/new" : "/register"}>
          <Button size="lg">
            {user ? "Sell an Item" : "Get Started"}
            <ArrowRightIcon />
          </Button>
        </Link>
      </section>
    </div>
  );
}
