<template>
  <footer class="bg-slate-50 w-full py-10 px-4 md:px-8 border-t border-slate-200">
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
      <div class="space-y-4">
        <div class="font-headline font-bold text-slate-900 text-xl italic">
          HikeShield Victoria
        </div>
        <p class="text-slate-500 font-body text-sm max-w-xs leading-relaxed">
          © 2026 The HikeShield Victoria. Official Victorian Safety Data. Empowering hikers with real-time risk assessments.
        </p>
      </div>
      <div class="grid w-full grid-cols-2 md:w-auto md:grid-cols-3 gap-6 md:gap-12">
        <div class="flex flex-col gap-3 font-body text-sm tracking-wide">
          <span class="font-bold text-slate-900 uppercase tracking-widest text-[10px]">Safety</span>
          <a href="#" class="text-slate-500 hover:text-[#4A6741] transition-colors">Emergency: 000</a>
          <router-link to="/risk-map" class="text-slate-500 hover:text-[#4A6741] transition-colors">Risk Map</router-link>
          <router-link to="/community-reports" class="text-slate-500 hover:text-[#4A6741] transition-colors">Reports</router-link>
        </div>
        <div class="flex flex-col gap-3 font-body text-sm tracking-wide">
          <span class="font-bold text-slate-900 uppercase tracking-widest text-[10px]">Company</span>
          <a href="#" class="text-slate-500 hover:text-[#4A6741] transition-colors">About Us</a>
          <a href="#" class="text-slate-500 hover:text-[#4A6741] transition-colors">Privacy Policy</a>
          <a href="#" class="text-slate-500 hover:text-[#4A6741] transition-colors">Terms of Service</a>
        </div>
        <div class="flex flex-col gap-3 font-body text-sm tracking-wide">
          <span class="font-bold text-slate-900 uppercase tracking-widest text-[10px]">Resources</span>
          <a href="#" class="text-slate-500 hover:text-[#4A6741] transition-colors">Data Sources</a>
          <router-link to="/knowledge-hub" class="text-slate-500 hover:text-[#4A6741] transition-colors">Knowledge Hub</router-link>
          <a href="#" class="text-slate-500 hover:text-[#4A6741] transition-colors">Victorian Parks</a>
        </div>
      </div>
    </div>
  </footer>
</template>
