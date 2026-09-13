import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

const categories = [
  { name: "Textbooks", icon: "📚" },
  { name: "Electronics", icon: "💻" },
  { name: "Furniture", icon: "🪑" },
  { name: "Clothing", icon: "👕" },
  { name: "Sports", icon: "⚽" },
  { name: "Other", icon: "📦" },
];

const sampleListings = [
  { title: "Engineering Mathematics Textbook", price: "₹350", originalPrice: "₹800", condition: "Good", category: "Textbooks", seller: "Priya S.", avatar: "P" },
  { title: "Scientific Calculator Casio fx-991", price: "₹450", originalPrice: "₹1,200", condition: "Like New", category: "Electronics", seller: "Rahul M.", avatar: "R" },
  { title: "Study Table with Drawer", price: "₹1,200", originalPrice: "₹3,500", condition: "Good", category: "Furniture", seller: "Anita K.", avatar: "A" },
  { title: "HP Laptop Intel i5 8GB RAM", price: "₹18,000", originalPrice: "₹45,000", condition: "Good", category: "Electronics", seller: "Vikram J.", avatar: "V" },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div>
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
            <Link to="/register">
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
            {["Textbooks", "Calculators", "Laptops", "Furniture", "Hostel items"].map((tag) => (
              <span key={tag} className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text">Browse by Category</h2>
            <p className="text-sm text-text-muted mt-0.5">Find what you need on campus</p>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {categories.map((cat) => (
            <div key={cat.name} className="bg-surface border border-border rounded-xl p-4 text-center hover:shadow-md hover:border-campus-green/20 transition-all cursor-pointer group">
              <div className="text-3xl mb-2">{cat.icon}</div>
              <h3 className="text-sm font-semibold text-text group-hover:text-campus-green transition-colors">{cat.name}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text">Recent Listings</h2>
            <p className="text-sm text-text-muted mt-0.5">Fresh items from DIT students</p>
          </div>
          <Link to="/register" className="text-sm text-campus-green font-medium hover:underline flex items-center gap-1">
            View all <ArrowRightIcon />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sampleListings.map((item, i) => (
            <div key={i} className="bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer">
              <div className="relative h-44 bg-gradient-to-br from-green-50 to-green-100 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-30">
                  {["📚", "🔢", "🪑", "💻"][i]}
                </div>
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-full bg-campus-green/90 text-white text-[10px] font-semibold backdrop-blur-sm">
                    {item.condition}
                  </span>
                </div>
                <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-text-secondary hover:text-campus-orange hover:bg-white transition-all">
                  <HeartIcon />
                </button>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold text-text">{item.price}</span>
                  <span className="text-xs text-text-muted line-through">{item.originalPrice}</span>
                </div>
                <h3 className="text-sm font-semibold text-text truncate mb-3">{item.title}</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-campus-green/10 flex items-center justify-center text-campus-green text-xs font-semibold">
                      {item.avatar}
                    </div>
                    <span className="text-xs font-medium text-text">{item.seller}</span>
                  </div>
                  <span className="text-[10px] text-text-muted px-2 py-0.5 rounded-full bg-bg">{item.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface border-y border-border py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-text mb-3">Why Campusly?</h2>
          <p className="text-sm text-text-muted mb-8 max-w-lg mx-auto">
            A simple, trusted marketplace built exclusively for DIT University students.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "🎓", title: "DIT Students Only", desc: "Every user is a verified DIT University student. No outsiders, no scams." },
              { icon: "💰", title: "Zero Fees", desc: "No commissions or hidden charges. What you sell is what you earn." },
              { icon: "🤝", title: "Meet on Campus", desc: "Trade in person at familiar campus spots. Safe and convenient." },
            ].map((item) => (
              <div key={item.title} className="bg-bg rounded-2xl p-6 border border-border">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-base font-bold text-text mb-1">{item.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
