<template>
  <footer class="site-footer">
    <div class="site-footer__inner">
      <div class="site-footer__brand">
        <div class="site-footer__wordmark">HikeShield Victoria</div>
        <p>
          Real-time hiking safety intelligence for Victorian trails, route planning, and community reports.
        </p>
        <div class="site-footer__status">
          <span></span>
          Live safety data ready
        </div>
      </div>
      <div class="site-footer__links">
        <div>
          <span>Safety</span>
          <a href="#">Emergency: 000</a>
          <router-link to="/risk-map">Risk Map</router-link>
          <router-link to="/community-reports">Reports</router-link>
        </div>
        <div>
          <span>Explore</span>
          <router-link to="/route-planner">Plan Route</router-link>
          <router-link to="/knowledge-hub">Knowledge Hub</router-link>
          <router-link to="/report-hazard">Report Hazard</router-link>
        </div>
        <div>
          <span>Resources</span>
          <a href="#">Data Sources</a>
          <a href="#">Victorian Parks</a>
          <a href="#">Privacy Policy</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  border-top: 1px solid rgba(31, 41, 51, 0.1);
  background:
    linear-gradient(135deg, rgba(17, 24, 39, 0.96), rgba(31, 41, 51, 0.9)),
    var(--hs-hero-image) center/cover;
  color: #ffffff;
  padding: clamp(3rem, 6vw, 5rem) 1rem;
}

.site-footer__inner {
  width: min(1180px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: clamp(2rem, 6vw, 6rem);
  align-items: start;
}

.site-footer__brand {
  display: grid;
  gap: 1rem;
  max-width: 30rem;
}

.site-footer__wordmark {
  font-family: "Manrope", system-ui, sans-serif;
  font-size: clamp(2rem, 5vw, 3.4rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 0.98;
}

.site-footer p {
  max-width: 27rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.7;
}

.site-footer__status {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  padding: 0.55rem 0.85rem;
  color: rgba(255, 255, 255, 0.86);
  font-size: 0.78rem;
  font-weight: 800;
}

.site-footer__status span {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: #ff385c;
  box-shadow: 0 0 0 6px rgba(255, 56, 92, 0.16);
}

.site-footer__links {
  display: grid;
  grid-template-columns: repeat(3, minmax(8rem, 1fr));
  gap: 2rem;
}

.site-footer__links div {
  display: grid;
  gap: 0.78rem;
}

.site-footer__links span {
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.92);
}

.site-footer__links a {
  color: rgba(255, 255, 255, 0.64);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
}

.site-footer__links a:hover {
  color: #ffffff;
}

@media (max-width: 820px) {
  .site-footer__inner {
    grid-template-columns: 1fr;
  }

  .site-footer__links {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
