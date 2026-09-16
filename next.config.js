/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdfkit', 'exceljs']
  },
  // Pastikan Vercel Edge Network / CDN dan browser TIDAK menyimpan cache
  // untuk seluruh response API — supaya data yang tampil selalu yang
  // terbaru dari Supabase, bukan salinan lama yang tersimpan di edge
  // node tertentu (penyebab data beda-beda tiap device/browser).
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' }
        ]
      }
    ];
  }
};
module.exports = nextConfig;
