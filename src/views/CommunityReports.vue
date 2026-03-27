<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const reports = [
  {
    id: 1,
    type: 'Fire Hazard',
    typeColor: '#E76F51',
    borderColor: 'border-[#E76F51]',
    title: 'Smoke near Cathedral Range',
    location: 'Neds Gully Track • 14 mins ago',
    likes: 12,
    views: '450',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnE5L4OI0gSoZKDDmD7kwra7SyoBMcx4f-quPVONVCxkTR2JBXREknVUvVDUqKttGGXpQ0jai9LFM14QfqtEuyVjsDG_JrPKpZItjuB2fHfLrXMYHCUb2C1FYWidnB30bnb4cNcLYzxp9Qg1eK_gqJ03e_zDFWyvZZnH8yO9UJ2MVlRsd8VNKLjcnRtVeh0IrE007EZIZ2p4196AkedXq_ftDE55W8jNZUEBOsJAFt4EzQy_cBdlnGwsrp_73d99pq_YY26Cc8rXQ'
  },
  {
    id: 2,
    type: 'Weather Impact',
    typeColor: '#1c4f51',
    borderColor: 'border-tertiary',
    title: 'Deep mud on Razorback Trail',
    location: 'Alpine National Park • 2h ago',
    likes: 8,
    views: '1.2k',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJRFVOiaL9n_lT6t7IB76NHjlx-9HATKZUe8T5hF93uTRzgRobG7xlfDwDU7VQpkhx4c5NzCvKuDfJCvM0B_2klhC9C7KwNjGVTOdiUo4_NFgqSXGY_CgBTmEtI_0J6KQaN7TR4YNLleg-_she-yWlDvkq25_-tWm5HOQovIYKyWwom0n5ib8lGewWOslaj1I9d_Wt1vZTosyMMfFZRIUx8EZs88wW-d6BDQLKNh6BqmRgfAgY-_Mj7CxHRdHD3PsrV71kpl3FlME'
  },
  {
    id: 3,
    type: 'Trail Caution',
    typeColor: '#6b5c4f',
    borderColor: 'border-secondary',
    title: 'Fallen Tree - West Ridge',
    location: 'Mt Buller Area • 5h ago',
    likes: 24,
    views: '890',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAo6QMw_q4g3isNjhALJJEQVyI8lcl88BJb4eGUnBJPvobqehfHAQEUr95IBp_t2H9ZCGwY_E1Uk-F33-iK8Pw0J_d9pF2e9ldPmE4OLgIWoNTlsY93HWfpJOH4aunLHRSed_ploE-Vthea6KRYrK8xR449IBsI_VMvwBb4gcN1LNY5Zht_4zw6Bid026UFYe6hCfUnU_Uj8walsgIgg5lmfWLVzgJD_C2UiRAczdl1oo_iwGKP-WJfcHJVsu3M9ytggLUerUdfgq4'
  },
  {
    id: 4,
    type: 'Flood Warning',
    typeColor: '#1c4f51',
    borderColor: 'border-tertiary',
    title: 'Creek Level Rising - Mitchell',
    location: 'Wonnangatta Valley • 8h ago',
    likes: 5,
    views: '312',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMe1VazPyBaqcGurW2VgC-MXtsLzI7BULR-XK2BG-784uZjdf29N4gQDZTIIa085ZZA6j5EgntNmSNec8xfNLKejZw4KjCQ3gRikPzx5lrwhw1l3-szJsVw1_AqnWYTGgr79PLBCFGViu6xmgxIVYPb2Xz2t55_jlY5rbAzneGF_hCG6YUYmGjq3Sz2i_t4l0nw7OIlXOpzRdxuzyIoxogJFEUOnzF7_SWKzcOlGT4PQEbg46li3Zq9mmvjr2FabresKRosMlIcyU'
  }
]
</script>

<template>
  <main class="flex-1 flex overflow-hidden relative" style="height: calc(100vh - 72px)">
    <!-- Sidebar: Reports List -->
    <aside class="w-full md:w-[420px] bg-surface-container-low flex flex-col z-20 shadow-xl md:shadow-none">
      <div class="p-6 border-b border-outline-variant/20">
        <div class="flex justify-between items-end mb-4">
          <h1 class="text-3xl font-headline font-extrabold tracking-tight text-primary">Live Reports</h1>
          <span class="text-xs font-label font-medium bg-primary-container/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest">Victoria, AU</span>
        </div>
        <div class="flex gap-2">
          <button
            class="flex-1 py-2 px-4 rounded-lg bg-primary text-on-primary font-headline font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            @click="router.push('/report-hazard')"
          >
            <span class="material-symbols-outlined text-sm">add_circle</span>
            Submit Report
          </button>
          <button class="p-2 rounded-lg bg-surface-container-high text-primary hover:bg-surface-container-highest transition-colors">
            <span class="material-symbols-outlined">filter_list</span>
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-surface-container-low">
        <div
          v-for="report in reports"
          :key="report.id"
          class="group bg-surface-container-lowest rounded-xl p-4 flex gap-4 transition-all duration-300 hover:bg-surface-bright cursor-pointer border-l-4"
          :class="report.borderColor"
        >
          <div class="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-surface-dim">
            <img :src="report.image" :alt="report.title" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div class="flex flex-col justify-between py-1">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: report.typeColor }"></span>
                <span class="text-[10px] font-label font-bold uppercase tracking-widest" :style="{ color: report.typeColor }">{{ report.type }}</span>
              </div>
              <h3 class="font-headline font-bold text-on-surface leading-tight group-hover:text-primary transition-colors">{{ report.title }}</h3>
              <p class="text-xs text-on-surface-variant font-medium mt-1">{{ report.location }}</p>
            </div>
            <div class="flex items-center gap-3 mt-2">
              <span class="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                <span class="material-symbols-outlined text-xs">thumb_up</span> {{ report.likes }}
              </span>
              <span class="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                <span class="material-symbols-outlined text-xs">visibility</span> {{ report.views }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Map Canvas -->
    <section class="flex-1 relative bg-[#e5e5f7] overflow-hidden hidden md:block">
      <div class="absolute inset-0 z-0">
        <img
          class="w-full h-full object-cover opacity-80 mix-blend-multiply grayscale-[20%]"
          alt="Topographic map of Victoria"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnpDiY-W_u-7FF6aOXRQbek5VwW_hTWMQYnDL40UVGg9twyDJG_PnbtNXXzwfZcl8eHBizV-CvDl4_pFCJ-EkoyNSk9M6Ac4iWRBzQNOMbqxP56mlU9i-hN00i2KSOa6gX2Lwvcp6-M119i7KqeKj_jmxCQetWPJRG7gfLurvFfmv4Q9mAqqw93Pu2-mjksLcqWWvPnZm2MtixXhB-TFKDRMHQ5l3_xt0fcMjz7-B5gYi1HnhnzTNzaEkOR6FKfMdytWtZJNUKDyE"
        />
        <div class="absolute inset-0 bg-primary/5"></div>
      </div>

      <!-- Map Markers -->
      <div class="absolute top-1/3 left-1/4 z-10 group cursor-pointer" style="transform: translate(-50%, -50%)">
        <div class="relative">
          <div class="absolute -inset-4 bg-[#E76F51]/20 rounded-full animate-ping"></div>
          <div class="bg-surface-container-lowest p-2 rounded-full shadow-xl border-2 border-[#E76F51] flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
            <span class="material-symbols-outlined text-[#E76F51]" style="font-variation-settings: 'FILL' 1">local_fire_department</span>
          </div>
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-on-surface text-surface text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold">
            Smoke - Cathedral Range
          </div>
        </div>
      </div>

      <div class="absolute top-1/2 left-2/3 z-10 group cursor-pointer" style="transform: translate(-50%, -50%)">
        <div class="relative">
          <div class="bg-surface-container-lowest p-2 rounded-full shadow-xl border-2 border-tertiary flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
            <span class="material-symbols-outlined text-tertiary" style="font-variation-settings: 'FILL' 1">rainy</span>
          </div>
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-on-surface text-surface text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold">
            Deep Mud - Razorback
          </div>
        </div>
      </div>

      <div class="absolute top-2/3 left-1/3 z-10 group cursor-pointer" style="transform: translate(-50%, -50%)">
        <div class="relative">
          <div class="bg-surface-container-lowest p-2 rounded-full shadow-xl border-2 border-secondary flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
            <span class="material-symbols-outlined text-secondary" style="font-variation-settings: 'FILL' 1">warning</span>
          </div>
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-on-surface text-surface text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold">
            Fallen Tree - West Ridge
          </div>
        </div>
      </div>

      <!-- Map Controls -->
      <div class="absolute bottom-8 right-8 flex flex-col gap-3 z-30">
        <div class="bg-surface-container-lowest/80 backdrop-blur-md rounded-xl p-2 flex flex-col gap-1 shadow-2xl border border-outline-variant/10">
          <button class="p-3 rounded-lg hover:bg-surface-container-high text-primary transition-colors">
            <span class="material-symbols-outlined">add</span>
          </button>
          <button class="p-3 rounded-lg hover:bg-surface-container-high text-primary transition-colors">
            <span class="material-symbols-outlined">remove</span>
          </button>
        </div>
        <button class="bg-primary p-4 rounded-xl text-on-primary shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all">
          <span class="material-symbols-outlined">my_location</span>
        </button>
      </div>

      <!-- Legend -->
      <div class="absolute top-8 left-8 z-30">
        <div class="bg-surface-container-lowest/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-outline-variant/10 max-w-xs">
          <h4 class="font-headline font-extrabold text-primary mb-3 text-sm">Legend</h4>
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-full bg-[#E76F51]/10 flex items-center justify-center">
                <span class="material-symbols-outlined text-sm text-[#E76F51]">local_fire_department</span>
              </span>
              <span class="text-xs font-medium text-on-surface-variant">Active Fire/Smoke</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center">
                <span class="material-symbols-outlined text-sm text-tertiary">rainy</span>
              </span>
              <span class="text-xs font-medium text-on-surface-variant">Weather/Mud Impact</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                <span class="material-symbols-outlined text-sm text-secondary">warning</span>
              </span>
              <span class="text-xs font-medium text-on-surface-variant">Trail Hazard</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="bg-slate-50 w-full py-4 px-8 border-t border-slate-200 flex justify-between items-center z-40">
    <span class="text-slate-500 text-sm tracking-wide">© 2026 The HikeShield Victoria. Official Victorian Safety Data.</span>
    <div class="flex gap-4">
      <a href="#" class="text-[10px] font-bold text-[#4A6741] underline uppercase tracking-widest">Emergency: 000</a>
      <a href="#" class="text-[10px] font-bold text-slate-500 hover:text-[#4A6741] transition-colors uppercase tracking-widest">Privacy Policy</a>
    </div>
  </footer>
</template>
