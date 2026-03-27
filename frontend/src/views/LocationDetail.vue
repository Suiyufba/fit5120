<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <main class="relative flex" style="height: calc(100vh - 72px)">
    <!-- Background Map -->
    <div class="absolute inset-0 z-0">
      <img
        class="w-full h-full object-cover brightness-95"
        alt="Topographic map of Victorian alpine terrain"
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKzkE6zPVX5vWqHQu_cuwwD6BqwCru36GcB1nMPzf4MwDqNyuH48fLi8-q2-EVXkfwxPKWF1mtvTOR4rtnfWQTIQDvCXPi5UP8e3IitZyTpwGnEcE3Vc6RBJvmWFK7oVcw2ECeVqKISyRo9tkGupJk_FZvn3gRpd1vkNfUqK46EyWHiPNdZ22xrswXnlqhUgYFkMkQVZkuU8WpjdOhmx7UTW29ZvgZYdni6A1z4KGfqAvN3iZkqqHzBVIYc4WAAHQuuM2-qX5HApo"
      />
      <!-- Map Marker -->
      <div class="absolute top-1/2 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
        <div class="relative flex items-center justify-center">
          <div class="absolute animate-ping h-8 w-8 rounded-full bg-primary opacity-20"></div>
          <div class="h-4 w-4 rounded-full bg-primary border-2 border-white shadow-lg"></div>
        </div>
      </div>
    </div>

    <!-- Overlay -->
    <div class="absolute inset-0 bg-on-surface/5 backdrop-blur-[2px] z-10 pointer-events-none md:pointer-events-auto"></div>

    <!-- Detail Panel -->
    <aside class="absolute right-0 top-0 h-full w-full md:w-[480px] z-20 custom-glass shadow-[-24px_0_48px_rgba(0,31,41,0.06)] rounded-tl-3xl flex flex-col overflow-hidden">
      <!-- Panel Header -->
      <div class="px-8 pt-8 pb-4 flex justify-between items-start">
        <div>
          <span class="inline-block px-3 py-1 bg-surface-container-highest text-primary font-label text-[10px] tracking-[0.1em] uppercase font-bold rounded-full mb-3">Location Detail</span>
          <h1 class="font-headline text-3xl font-extrabold tracking-tight leading-tight text-on-surface">
            Grampians National Park <span class="block text-primary/60">(Halls Gap Area)</span>
          </h1>
        </div>
        <button class="p-2 rounded-full bg-surface-container-high hover:bg-surface-container-highest transition-colors active:scale-90" @click="router.back()">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto px-8 py-4 space-y-8 scroll-smooth">
        <!-- Risk Alert -->
        <section class="space-y-4">
          <div class="p-6 bg-[#FFF9F2] rounded-xl flex items-start gap-5">
            <div class="h-12 w-12 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0 text-secondary">
              <span class="material-symbols-outlined text-3xl" style="font-variation-settings: 'FILL' 1">warning</span>
            </div>
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-label font-bold text-xs text-secondary-container bg-secondary px-2 py-0.5 rounded">MODERATE RISK</span>
                <div class="w-2 h-2 rounded-full bg-[#E76F51]"></div>
              </div>
              <p class="font-headline text-lg font-bold text-on-surface">Heavy rainfall expected this afternoon.</p>
            </div>
          </div>

          <div class="p-6 bg-surface-container-low rounded-xl space-y-3">
            <div class="flex items-center gap-2 text-primary">
              <span class="material-symbols-outlined text-sm">info</span>
              <span class="font-label text-xs font-bold tracking-widest uppercase">Recommended Action</span>
            </div>
            <p class="text-on-surface-variant leading-relaxed font-medium">
              Avoid low-lying creek crossings and move to higher ground if rain intensifies. Ensure GPS tracking is active.
            </p>
          </div>
        </section>

        <!-- Nearby Trails -->
        <section class="space-y-4">
          <h2 class="font-label text-xs font-bold tracking-widest uppercase text-outline">Nearby Trails</h2>
          <div class="grid grid-cols-2 gap-4">
            <div class="group cursor-pointer">
              <div class="aspect-[4/5] rounded-xl overflow-hidden mb-3 relative">
                <img
                  class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  alt="Rock formations of the Wonderland Loop trail in Grampians"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuApOORevGOzzcAdwC5RUH5mMhx7IQi5HF_AMC_NkczYxJwVrlcz7GeE39_Rd_XMRbLhOz0qvwbkAwo0y3jDZB77NprocreRbpiqZ5vrxZpLKV0t8Xt5SQQUiYJpAgPTxseXjm3bjVFy6TDiLx7McWzYTx6HaSzWEiyL6YHHQsionblkewIdW8iVU2uut3vpT_-CT-A2DElUMJdVMgY8KsdZB6I9Ee1B7wOarzxhGHZ2_u3M0kIaZRhUe4sjBtGxElZEE7tcsdC44vY"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div class="absolute bottom-4 left-4 text-white">
                  <p class="font-headline font-bold text-sm">Wonderland Loop</p>
                  <span class="text-[10px] opacity-80">9.6km &bull; Grade 4</span>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-4">
              <div class="flex-1 group cursor-pointer bg-surface-container rounded-xl p-4 flex flex-col justify-end relative overflow-hidden">
                <div class="absolute top-0 right-0 p-3 opacity-20">
                  <span class="material-symbols-outlined text-4xl">terrain</span>
                </div>
                <p class="font-headline font-bold text-sm mb-1">Pinnacle Walk</p>
                <span class="font-label text-[10px] text-primary font-bold">4.2km &bull; Popular</span>
              </div>
              <div class="h-24 bg-surface-container-high rounded-xl flex items-center justify-center border-2 border-dashed border-outline/20">
                <span class="material-symbols-outlined text-outline">add</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Community Reports -->
        <section class="space-y-4">
          <div class="flex justify-between items-center">
            <h2 class="font-label text-xs font-bold tracking-widest uppercase text-outline">Community Reports</h2>
            <span class="text-[10px] text-primary font-bold bg-primary-container/20 px-2 py-1 rounded">2 New</span>
          </div>
          <div class="space-y-4">
            <div class="p-5 bg-white rounded-xl shadow-[0_4px_12px_rgba(0,31,41,0.03)] border border-outline-variant/20">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px]">MK</div>
                <div>
                  <p class="text-xs font-bold">Marcus K.</p>
                  <p class="text-[10px] text-outline">Verified Ranger</p>
                </div>
                <div class="ml-auto text-[10px] text-outline">2h ago</div>
              </div>
              <p class="text-sm italic text-on-surface-variant leading-relaxed">"Slippery tracks reported near Venus Baths. Watch your footing on the mossy sandstone."</p>
            </div>
          </div>
        </section>

        <!-- Action Button -->
        <div class="pt-4 pb-8">
          <button class="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-4 rounded-xl font-headline font-bold text-lg shadow-[0_8px_24px_rgba(51,79,43,0.2)] transition-all hover:brightness-110 active:scale-[0.98]">
            Download Offline Map
          </button>
          <p class="text-center mt-4 text-[10px] text-outline font-medium">Last updated: 14:02 AEST</p>
        </div>
      </div>
    </aside>
  </main>
</template>
