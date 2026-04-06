const LandingPage = () => {
  const { user, session } = useAuth();
  const signupPath = user && session ? "/dashboard" : "/register";

  return (
    <div className="landing-layout animate-fade-up">
      <header className="landing-header">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-brand">Aethea.</Link>
          <div className="landing-nav-right">
            {user && session ? (
              <Link to="/dashboard" className="btn-primary">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn-text">Sign In</Link>
                <Link to="/register" className="btn-primary">Join Aethea</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Centered Hero */}
        <section className="hero-centered delay-1 animate-fade-up">
          <h1 className="hero-title">Clear, concise medical care.</h1>
          <p className="hero-subtitle">
            Your health records, lab results, and medical scans organized in one secure, elegant platform.
          </p>
          <div className="hero-actions">
            <Link to={signupPath} className="btn-primary-large">Get Started Now</Link>
          </div>
        </section>

        {/* Central Illustration Block */}
        <section className="hero-illustration-block delay-2 animate-fade-up">
          <img 
            src="/images/landing-page.png" 
            alt="Medical professionals and patient together" 
            className="hero-image"
          />
          <h2 className="hero-manifesto">All together for better health.</h2>
        </section>

        {/* Features - Editorial Grid */}
        <section className="features-editorial delay-3 animate-fade-up">
          <div className="features-container">
            <Link to="/lab-results" className="feature-block">
               <h3>Laboratory Diagnostics</h3>
               <p>View blood work, biomarkers, and historical reporting with raw, untempered accuracy.</p>
            </Link>
            
            <Link to="/scans" className="feature-block">
               <h3>Imaging &amp; Scans</h3>
               <p>Direct access to X-rays, MRIs, and CT frameworks. Mapped to your profile securely.</p>
            </Link>
            
            <Link to="/medicines" className="feature-block">
               <h3>Pharmacology</h3>
               <p>Strict conflict checking and clear dosage structures without the digital noise.</p>
            </Link>
            
            <Link to="/care-locator" className="feature-block">
               <h3>Specialist Routing</h3>
               <p>Find network-verified physicians mapped to clear geographic and specialty hierarchies.</p>
            </Link>
            
            <Link to="/nutrition" className="feature-block">
               <h3>Metabolic Structure</h3>
               <p>Verified meal structures mapped strictly against metabolic conditions.</p>
            </Link>
            
            <Link to="/recovery" className="feature-block">
               <h3>Post-Op Protocols</h3>
               <p>Step-by-step physical recovery protocols managed by verified physiotherapists.</p>
            </Link>
          </div>
        </section>
      </main>

      <footer className="footer-elegant">
        <div className="footer-logo">Aethea.</div>
        <p>&copy; 2026 Platform Authority. Medical infrastructure for strict transparency.</p>
      </footer>
    </div>
  );
};

