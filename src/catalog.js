// Source snapshots reviewed 2026-10-12. GB means decimal gigabytes.
// cpuScore/gpuScore are editorial capability tiers, not measured benchmarks.
// Tiers are compared only within a platform: 1 = basic, 2 = entry,
// 3 = mainstream, 4 = capable, 5 = performance, 6 = high performance.
// Model configurations are explicit; storage is TOTAL capacity, never free space.
export const reviewedAt = '2026-10-12';

const sources = {
  fortnite: 'https://www.epicgames.com/help/c-34254770/c-37371353/a16548002?lang=en-US',
  fortniteAndroid: 'https://www.epicgames.com/help/c-34254770/c-37371353/a25800895?lang=en-US',
  minecraft: 'https://www.minecraft.net/en-us/store/minecraft-java-bedrock-edition-pc',
  minecraftEditions: 'https://help.minecraft.net/hc/en-us/articles/360034753992',
  minecraftChrome: 'https://help.minecraft.net/hc/en-us/articles/13803752803725-Chromebook-System-Requirements-for-Minecraft',
  roblox: 'https://en.help.roblox.com/hc/en-us/articles/203312800-Computer-Hardware-Operating-System-Requirements',
  robloxMobile: 'https://en.help.roblox.com/hc/en-us/articles/203625474-Roblox-Mobile-System-Requirements',
  robloxChrome: 'https://en.help.roblox.com/hc/en-us/articles/115005743383-Chromebook-Troubleshooting',
  genshin: 'https://support.hoyoverse.com/hc/en-us/articles/52089402685593-What-are-the-system-requirements-to-play-Genshin-Impact',
  stardew: 'https://store.steampowered.com/app/413150/Stardew_Valley/',
  stardewAndroid: 'https://www.stardewvalley.net/stardew-valley-now-available-on-android/',
  cs2: 'https://store.steampowered.com/app/730/CounterStrike_2/',
  valorant: 'https://support.riotgames.com/en-us/valorant/support-tools/minimum-recommended-pc-specs',
  blender: 'https://www.blender.org/download/requirements/',
  vscode: 'https://code.visualstudio.com/Docs/supporting/requirements',
};

export const devices = [
  {
    id: 'acer-nitro-5', name: 'Acer Nitro 5', brand: 'Acer', type: 'pc', os: 'windows', osLabel: 'Windows 10 / 11',
    cpu: 'Intel Core i5-11400H', gpu: 'NVIDIA GTX 1650 · 4 GB', ram: 8, storage: 256,
    cpuScore: 4, gpuScore: 4, gpuType: 'discrete', architecture: 'x64',
    sourceUrl: 'https://store.acer.com/en-us/nitro%205%20gaming%20laptop%20-%20an515-57-584y',
    notes: ['AN515-57-584Y configuration: 8 GB RAM, 256 GB SSD.', 'Ships with Windows 10; verify the installed Windows version and graphics drivers.'],
  },
  {
    id: 'dell-inspiron-15', name: 'Dell Inspiron 15 3520', brand: 'Dell', type: 'pc', os: 'windows', osLabel: 'Windows 11',
    cpu: 'Intel Core i5-1235U', gpu: 'Intel UHD Graphics', ram: 8, storage: 256,
    cpuScore: 4, gpuScore: 2, gpuType: 'integrated', architecture: 'x64',
    sourceUrl: 'https://www.dell.com/en-us/shop/dell-laptops/inspiron-15-laptop/spd/inspiron-15-3520%20-laptop/nn3520gmqch',
    notes: ['Order code nn3520gmqch: one 8 GB memory module and 256 GB SSD.', 'This single-channel configuration is listed with UHD graphics, not Iris Xe.'],
  },
  {
    id: 'asus-tuf-a15', name: 'ASUS TUF Gaming A15', brand: 'ASUS', type: 'pc', os: 'windows', osLabel: 'Windows 11',
    cpu: 'AMD Ryzen 7 7735HS', gpu: 'NVIDIA RTX 4060 Laptop · 8 GB', ram: 16, storage: 1000,
    cpuScore: 5, gpuScore: 6, gpuType: 'discrete', architecture: 'x64',
    sourceUrl: 'https://www.asus.com/ar/laptops/for-gaming/tuf-gaming/asus-tuf-gaming-a15-2023/techspec/',
    notes: ['FA507NV reference configuration: 16 GB RAM and 1 TB SSD.', 'Configurations vary by region; match these specifications to your unit.'],
  },
  {
    id: 'macbook-air-m1', name: 'MacBook Air M1', brand: 'Apple', type: 'pc', os: 'macos', osLabel: 'macOS',
    cpu: 'Apple M1 · 8-core CPU', gpu: 'Apple M1 · 7-core GPU', ram: 8, storage: 256,
    cpuScore: 4, gpuScore: 3, gpuType: 'integrated', architecture: 'arm64',
    sourceUrl: 'https://support.apple.com/en-us/111883',
    notes: ['2020 model, 7-core GPU, 8 GB unified memory, 256 GB SSD.', 'Unified memory is shared by CPU and graphics. Verify your installed macOS version.'],
  },
  {
    id: 'macbook-air-m2', name: 'MacBook Air M2', brand: 'Apple', type: 'pc', os: 'macos', osLabel: 'macOS',
    cpu: 'Apple M2 · 8-core CPU', gpu: 'Apple M2 · 8-core GPU', ram: 16, storage: 256,
    cpuScore: 5, gpuScore: 4, gpuType: 'integrated', architecture: 'arm64',
    sourceUrl: 'https://support.apple.com/en-us/111867',
    notes: ['2022 model with the 16 GB unified-memory option and 256 GB SSD.', 'The 8 GB version also exists. Select custom specifications if yours differs.'],
  },
  {
    id: 'galaxy-a14-5g', name: 'Samsung Galaxy A14 5G', brand: 'Samsung', type: 'phone', os: 'android', osLabel: 'Android 13 or newer',
    cpu: 'Samsung Exynos 1330', gpu: 'Exynos 1330 integrated graphics', ram: 4, storage: 64,
    cpuScore: 2, gpuScore: 2, gpuType: 'integrated', architecture: 'arm64',
    sourceUrl: 'https://news.samsung.com/in/samsung-launches-galaxy-a14-5g-and-galaxy-a23-5g-to-consolidate-5g-leadership-in-india/',
    notes: ['India Exynos 1330 model, 4 GB physical RAM and 64 GB storage.', 'Other regions may use a different chip. Virtual RAM is not counted.'],
  },
  {
    id: 'pixel-7a', name: 'Google Pixel 7a', brand: 'Google', type: 'phone', os: 'android', osLabel: 'Android 13 or newer',
    cpu: 'Google Tensor G2', gpu: 'Tensor G2 integrated graphics', ram: 8, storage: 128,
    cpuScore: 4, gpuScore: 4, gpuType: 'integrated', architecture: 'arm64',
    sourceUrl: 'https://support.google.com/pixelphone/answer/7158570?hl=en',
    notes: ['8 GB RAM and 128 GB storage.', 'Long gaming sessions can be affected by temperature and battery settings.'],
  },
  {
    id: 'galaxy-s23', name: 'Samsung Galaxy S23', brand: 'Samsung', type: 'phone', os: 'android', osLabel: 'Android 13 or newer',
    cpu: 'Snapdragon 8 Gen 2 for Galaxy', gpu: 'Snapdragon integrated graphics', ram: 8, storage: 128,
    cpuScore: 5, gpuScore: 5, gpuType: 'integrated', architecture: 'arm64',
    sourceUrl: 'https://www.samsungmobilepress.com/articles/take-your-passions-further-with-the-new-samsung-galaxy-s23-series-designed-for-a-premium-experience-today-and-beyond',
    notes: ['Standard S23 configuration with 8 GB RAM and 128 GB storage; not the S23 FE.', 'Update Android and check available storage before installing.'],
  },
  {
    id: 'lenovo-chromebook-duet', name: 'Lenovo Chromebook Duet', brand: 'Lenovo', type: 'chromebook', os: 'chromeos', osLabel: 'ChromeOS',
    cpu: 'MediaTek Helio P60T / MT8183', cpuId: 'mediatek-mt8183', gpu: 'ARM Mali-G72 MP3', ram: 4, storage: 128,
    cpuScore: 1, gpuScore: 1, gpuType: 'integrated', architecture: 'arm64',
    sourceUrl: 'https://psref.lenovo.com/syspool/Sys/PDF/IdeaPad/IdeaPad_Duet_Chromebook/IdeaPad_Duet_Chromebook_Spec.pdf',
    sourceUrls: ['https://psref.lenovo.com/syspool/Sys/PDF/IdeaPad/IdeaPad_Duet_Chromebook/IdeaPad_Duet_Chromebook_Spec.pdf', 'https://www.chromium.org/chromium-os/developer-information-for-chrome-os-devices/'],
    notes: ['Original IdeaPad Duet, 4 GB RAM and 128 GB eMMC option.', 'Chromium identifies this model’s chip as MT8183. Its 64-bit CPU does not confirm that the installed Android runtime is 64-bit.', 'Android apps need Google Play enabled; school or work policies may block installation.'],
  },
];

const requirement = (ram, storage, cpuScore, gpuScore, cpu, gpu, os, sourceUrl, extras = {}) => ({
  ram, storage, cpuScore, gpuScore, cpu, gpu, os, sourceUrl, notes: [], ...extras,
});

export const games = [
  {
    id: 'fortnite', name: 'Fortnite', shortName: 'FN', category: 'game', genre: 'Battle royale', color: '#795af6',
    description: 'Build, battle, and find your next squad. Check the current native Windows or Android release.',
    platforms: ['windows', 'android'], sourceUrl: sources.fortnite, sourceUrls: [sources.fortnite, sources.fortniteAndroid],
    requirements: {
      windows: requirement(8, null, 2, 1, 'Core i3-3225 or equivalent', 'Intel HD 4000 / Radeon Vega 8', 'Windows 10 22H2 64-bit or newer', sources.fortnite, {
        minimumOsVersion: '10',
        recommended: { ram: 16, cpuScore: 3, gpuScore: 4 },
        notes: ['Epic recommends 16 GB RAM, a GTX 960-class GPU and an NVMe SSD.', 'Storage varies with installed content. Check the current Epic installer.', 'Competitive modes may impose additional anti-cheat and firmware requirements.'],
      }),
      android: requirement(4, null, 2, 3, '64-bit ARM64 processor', 'Adreno 530 / Mali-G71 MP20 / Mali-G72 MP12 or better', 'Android 10 or newer', sources.fortniteAndroid, {
        minimumOsVersion: '10',
        architectures: ['arm64'], recommended: { ram: 8, cpuScore: 6, gpuScore: 6 },
        notes: ['Epic recommends Android 14 and Snapdragon 8 Gen 3, Exynos 2400 or Dimensity 9200-class hardware.', 'Store availability and device allowlists must be checked on the device.'],
      }),
    },
  },
  {
    id: 'minecraft-java', name: 'Minecraft: Java Edition', shortName: 'MC', category: 'game', genre: 'Sandbox', color: '#438652',
    description: 'The desktop edition for community servers and mods. This check covers the unmodified game.',
    platforms: ['windows', 'macos'], sourceUrl: sources.minecraft, sourceUrls: [sources.minecraft],
    requirements: {
      windows: requirement(8, null, 4, 3, 'Core i3-10100 / Ryzen 3 3100 / Snapdragon X', 'Vulkan 1.3; GTX 950 / RX 460 / supported integrated GPU', 'Windows 10 64-bit or newer', sources.minecraft, {
        minimumOsVersion: '10',
        integratedRam: 12, integratedGpuScore: 2, recommended: { ram: 16, cpuScore: 5, gpuScore: 5 },
        notes: ['Current minimum: 8 GB with discrete graphics, 12 GB with integrated graphics.', 'Shaders, mods and large servers can raise requirements substantially. Check Vulkan support and drivers.'],
      }),
      macos: requirement(12, null, 4, 3, 'Apple M1 or newer', 'Apple M1 or newer', 'macOS 12 or newer', sources.minecraft, {
        minimumOsVersion: '12',
        architectures: ['arm64'], recommended: { ram: 16, cpuScore: 6, gpuScore: 5 },
        notes: ['The current listed Apple baseline is M1 with shared-memory graphics; 12 GB is the integrated-graphics minimum.', 'This check covers the current requirements, not older game releases.'],
      }),
    },
  },
  {
    id: 'minecraft-bedrock', name: 'Minecraft: Bedrock Edition', shortName: 'MB', category: 'game', genre: 'Sandbox', color: '#68a857',
    description: 'Build across Windows, Android, and supported Chromebooks with the cross-play edition.',
    platforms: ['windows', 'android', 'chromeos'], sourceUrl: sources.minecraft, sourceUrls: [sources.minecraft, sources.minecraftEditions, sources.minecraftChrome],
    requirements: {
      windows: requirement(4, null, 1, 1, 'Intel Celeron J4105 / AMD FX-4100', 'Intel HD 4000 / Radeon R5', 'Windows 10 build 19041 or newer', sources.minecraft, {
        minimumOsVersion: '10',
        recommended: { ram: 8, cpuScore: 2, gpuScore: 2 }, notes: ['Standard rendering only. Ray tracing has separate GPU requirements.'],
      }),
      android: requirement(null, null, null, null, 'Check Google Play device compatibility', 'Check Google Play device compatibility', 'Check the current Google Play listing', sources.minecraftEditions, {
        notes: ['Android availability is confirmed, but this catalog has no verified current mobile hardware minimum. Check the store on your phone before purchase.'],
      }),
      chromeos: requirement(4, 1, 1, 1, 'Celeron N4000 / MediaTek MT8183 or supported equivalent', 'Compatible integrated graphics', 'ChromeOS 111 or newer, 64-bit', sources.minecraftChrome, {
        minimumOsVersion: '111', runtimeArchitectures: ['x64', 'arm64'],
        verifiedCpuIds: ['amd-a4-9120c', 'intel-celeron-n4000', 'intel-3865u', 'intel-i3-7130u', 'intel-m3-8100y', 'mediatek-mt8183', 'qualcomm-sc7180'],
        notes: ['Requires Google Play and a compatible 64-bit Android runtime. A 64-bit CPU alone does not prove app compatibility.', 'The CPU check uses verified model identifiers; unlisted processors need a publisher or store compatibility check.', '1 GB is the published minimum; worlds and updates need additional space.'],
      }),
    },
  },
  {
    id: 'roblox', name: 'Roblox', shortName: 'R', category: 'game', genre: 'Social & sandbox', color: '#ed665d',
    description: 'A world of player-made experiences. Performance can differ dramatically between experiences.',
    platforms: ['windows', 'macos', 'android', 'chromeos'], sourceUrl: sources.roblox, sourceUrls: [sources.roblox, sources.robloxMobile, sources.robloxChrome],
    requirements: {
      windows: requirement(1, 0.3, 1, 1, '1.6 GHz or faster processor', 'DirectX 10 feature level or newer', 'Windows 10 / 11 64-bit', sources.roblox, {
        minimumOsVersion: '10',
        notes: ['Roblox recommends newer hardware. Individual experiences may need much more memory or graphics power.'],
      }),
      macos: requirement(null, 0.3, null, null, 'No Mac-specific CPU minimum published', 'No Mac-specific GPU minimum published', 'macOS 10.13 or newer', sources.roblox, {
        minimumOsVersion: '10.13',
        notes: ['Mac installation is supported. The published numeric hardware guidance targets Windows; a Mac performance rating is not assigned here.'],
      }),
      android: requirement(null, null, null, null, 'Compatible Android processor', 'OpenGL ES 3.0 or newer', 'Android 8 or newer', sources.robloxMobile, {
        minimumOsVersion: '8',
        notes: ['Roblox does not promise optimal performance on every Android device. Store compatibility and each experience still matter.'],
      }),
      chromeos: requirement(null, null, null, null, 'Compatible Chromebook', 'Android app graphics support', 'ChromeOS 53 or newer with Google Play', sources.roblox, {
        minimumOsVersion: '53',
        notes: ['Uses the Android app via Google Play. Managed Chromebooks may block the store; Bluetooth mice are not supported by this app.'],
      }),
    },
  },
  {
    id: 'genshin-impact', name: 'Genshin Impact', shortName: 'GI', category: 'game', genre: 'Open-world RPG', color: '#539aac',
    description: 'Explore Teyvat with a party of elemental adventurers. Leave room for large content updates.',
    platforms: ['windows', 'android'], sourceUrl: sources.genshin, sourceUrls: [sources.genshin],
    requirements: {
      windows: requirement(8, 110, 3, 3, '6th-generation Core i5 / AMD Ryzen', 'GTX 1050 / Intel Iris Xe or equivalent', 'Windows 10 64-bit or newer', sources.genshin, {
        minimumOsVersion: '10',
        recommended: { ram: 16, cpuScore: 4, gpuScore: 4 }, notes: ['An SSD is recommended. Future updates can increase the 110 GB storage requirement.'],
      }),
      android: requirement(4, 40, 2, 2, 'Snapdragon 660 / Helio G88 or better', 'Adreno 512 / Mali-G52 or better; no PowerVR', 'Android 10 or newer, ARMv8-A 64-bit', sources.genshin, {
        minimumOsVersion: '10',
        architectures: ['arm64'], recommended: { ram: 6, cpuScore: 3, gpuScore: 3 },
        notes: ['Recommended: Android 12+, Snapdragon 855-class chip, 6 GB RAM and 60 GB free storage.', 'Heat and battery-saving settings can reduce sustained performance.'],
      }),
    },
  },
  {
    id: 'stardew-valley', name: 'Stardew Valley', shortName: 'SV', category: 'game', genre: 'Farming & life sim', color: '#e0a846',
    description: 'Turn an overgrown plot into your own farm. A lighter option for a quieter gaming session.',
    platforms: ['windows', 'macos', 'android'], sourceUrl: sources.stardew, sourceUrls: [sources.stardew, sources.stardewAndroid],
    requirements: {
      windows: requirement(2, 0.5, 1, 1, '2 GHz processor', '256 MB graphics memory; Shader Model 3.0+', 'Windows 10 or newer for the Steam client', sources.stardew, {
        minimumOsVersion: '10',
        notes: ['The game lists an older Windows baseline, but the Steam client requires Windows 10 or newer.'],
      }),
      macos: requirement(2, 0.5, 1, 1, '2 GHz processor', '256 MB graphics memory; OpenGL 2', 'Game: macOS 10.10+; also check current Steam support', sources.stardew, {
        minimumOsVersion: '10.10',
        notes: ['The publisher lists Intel-era requirements. On Apple Silicon, Rosetta may be needed for the distributed build.'],
      }),
      android: requirement(null, null, null, null, 'Check Google Play device compatibility', 'Check Google Play device compatibility', 'Check the current Google Play listing', sources.stardewAndroid, {
        notes: ['A native Android edition is available. Current per-device requirements must be checked in Google Play.'],
      }),
    },
  },
  {
    id: 'counter-strike-2', name: 'Counter-Strike 2', shortName: 'CS2', category: 'game', genre: 'Tactical shooter', color: '#d39e42',
    description: 'Precision team competition on the Source 2 engine. Minimum specifications do not guarantee competitive performance.',
    platforms: ['windows'], sourceUrl: sources.cs2, sourceUrls: [sources.cs2],
    requirements: {
      windows: requirement(8, 85, 2, 2, '4 hardware threads; Core i5-750 or better', '1 GB graphics memory; DirectX 11 and Shader Model 5.0', 'Windows 10 or newer', sources.cs2, {
        minimumOsVersion: '10',
        notes: ['Valve publishes minimum specifications, not an FPS guarantee.', 'Use a lower resolution and low graphics as a starting point on integrated GPUs.'],
      }),
    },
  },
  {
    id: 'valorant', name: 'VALORANT', shortName: 'V', category: 'game', genre: 'Tactical shooter', color: '#e66072',
    description: 'A tactical team shooter with a low hardware baseline and specific Windows security requirements.',
    platforms: ['windows'], sourceUrl: sources.valorant, sourceUrls: [sources.valorant],
    requirements: {
      windows: requirement(4, null, 1, 1, 'Core i3-540 / Athlon 200GE; SSE 4.2 or AVX', 'Intel HD 4000 / Radeon R5 220; DirectX 11', 'Windows 10 build 19041+ / Windows 11, 64-bit', sources.valorant, {
        minimumOsVersion: '10',
        architectures: ['x64'], recommended: { ram: 4, cpuScore: 2, gpuScore: 2 },
        notes: ['Windows 11 requires TPM 2.0 and UEFI Secure Boot; verify Vanguard requirements.', 'ARM processors, cloud gaming and virtual machines are not supported.', 'Discrete GPUs need at least 1 GB VRAM. Check Riot Client for install size.'],
      }),
    },
  },
  {
    id: 'blender', name: 'Blender', shortName: 'B', category: 'app', genre: '3D creation', color: '#e99555',
    description: 'Model, animate, and render in 3D. Scene complexity matters as much as the launch requirements.',
    platforms: ['windows', 'macos'], sourceUrl: sources.blender, sourceUrls: [sources.blender],
    requirements: {
      windows: requirement(8, null, 3, 3, '4 CPU cores with SSE 4.2', '2 GB VRAM; supported OpenGL 4.3 / Vulkan 1.3 GPU', 'Windows 8.1 64-bit or newer; Windows 11 recommended', sources.blender, {
        minimumOsVersion: '8.1',
        recommended: { ram: 32, cpuScore: 5, gpuScore: 6 },
        notes: ['Check Blender’s exact supported GPU generations and driver extensions.', 'This is a basic usage estimate. Cycles GPU rendering has additional requirements.'],
      }),
      macos: requirement(8, null, 4, 3, 'Apple Silicon', 'Apple Silicon graphics', 'macOS 13 or newer', sources.blender, {
        minimumOsVersion: '13',
        architectures: ['arm64'], recommended: { ram: 32, cpuScore: 5, gpuScore: 5 },
        notes: ['Blender 5.0+ requires Apple Silicon; Intel Macs need an older supported release.', '32 GB RAM is recommended. Complex scenes can exceed available unified memory.'],
      }),
    },
  },
  {
    id: 'visual-studio-code', name: 'Visual Studio Code', shortName: '</>', category: 'app', genre: 'Code editor', color: '#51a5db',
    description: 'A lightweight editor for everyday coding. Extensions, compilers, and containers have their own requirements.',
    platforms: ['windows', 'macos'], sourceUrl: sources.vscode, sourceUrls: [sources.vscode],
    requirements: {
      windows: requirement(1, 0.5, 1, 0, '1.6 GHz or faster processor', 'No dedicated GPU requirement published', 'Supported 64-bit Windows client', sources.vscode, {
        notes: ['Microsoft lists these as recommended hardware for the editor itself.', 'Development runtimes, extensions and project files require additional resources.'],
      }),
      macos: requirement(1, 0.5, 1, 0, '1.6 GHz or faster processor', 'No dedicated GPU requirement published', 'A macOS version receiving Apple security updates', sources.vscode, {
        notes: ['Check the current supported macOS releases before installing.', 'A Chromebook can use the browser editor or Linux environment, which this native-app check does not assess.'],
      }),
    },
  },
];
